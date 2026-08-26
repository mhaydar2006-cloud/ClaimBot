import knowledgeRaw from "@/data/publicKnowledge.json";
import { procedureById, serviceById } from "@/data/insuranceData";
import type {
  ClaimDraft,
  PublicKnowledgeChunk,
  PublicKnowledgeEvidence,
  PublicKnowledgeRetrieval,
} from "@/types/claim";

const KNOWLEDGE = knowledgeRaw as PublicKnowledgeChunk[];
const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "under", "when", "where", "claim", "request", "service", "patient"]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalize(value).split(" ").filter((token) => token.length > 2 && !STOP.has(token));
}

function claimQuery(claim: ClaimDraft) {
  const service = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
  const procedure = claim.serviceCategory === "diagnostic_imaging"
    ? claim.procedureId === "other"
      ? claim.procedureOther
      : procedureById(claim.procedureId)?.label ?? claim.procedureId
    : "";
  return [service, procedure, claim.diagnosisMotive, claim.requestType, claim.nssfStatus === "yes" ? "NSSF" : ""].filter(Boolean).join(" ");
}

export function retrievePublicKnowledge(claim: ClaimDraft, maxResults = 5): PublicKnowledgeRetrieval {
  const queryTokens = Array.from(new Set(tokenize(claimQuery(claim))));
  const candidates = KNOWLEDGE.filter((chunk) => {
    const organizationMatch = chunk.organizationId === claim.tpaId || Boolean(chunk.insurerIds?.includes(claim.insurerId));
    const insurerMatch = !chunk.insurerIds?.length || chunk.insurerIds.includes(claim.insurerId);
    return organizationMatch && insurerMatch && chunk.requestTypes.includes(claim.requestType) && chunk.services.includes(claim.serviceCategory);
  });

  const evidence: PublicKnowledgeEvidence[] = candidates
    .map((chunk) => {
      const text = normalize(`${chunk.text} ${chunk.tags.join(" ")}`);
      const matchedTerms = queryTokens.filter((token) => text.includes(token));
      const serviceBoost = chunk.services.includes(claim.serviceCategory) ? 3 : 0;
      const requestBoost = chunk.requestTypes.includes(claim.requestType) ? 2 : 0;
      const procedure = claim.procedureId === "not_applicable" ? "" : normalize(claim.procedureId.replace(/_/g, " "));
      const procedureBoost = procedure && text.includes(procedure) ? 2 : 0;
      const verificationBoost = chunk.verification === "verified" ? 2 : 0;
      const score = matchedTerms.length + serviceBoost + requestBoost + procedureBoost + verificationBoost;
      return {
        id: chunk.id,
        text: chunk.text,
        sourceId: chunk.sourceId,
        organizationName: chunk.organizationName,
        verification: chunk.verification,
        score,
        matchedTerms,
      } satisfies PublicKnowledgeEvidence;
    })
    .sort((a, b) => b.score - a.score || b.matchedTerms.length - a.matchedTerms.length)
    .slice(0, maxResults);

  if (evidence.length === 0) {
    return {
      confidence: "none",
      evidence: [],
      note: "No public-source knowledge chunk is available for this exact TPA, request type and service. Verify directly with the payer/TPA.",
    };
  }

  const verifiedCount = evidence.filter((item) => item.verification === "verified").length;
  const topScore = evidence[0]?.score ?? 0;
  const confidence = verifiedCount > 0 && topScore >= 8 ? "high" : verifiedCount > 0 ? "medium" : "low";
  return {
    confidence,
    evidence,
    note: confidence === "high"
      ? "High-relevance public workflow evidence was retrieved for this request. It supports administrative preparation only, not patient-specific coverage or authorization."
      : "Relevant public workflow material was found, but it is incomplete for this exact request. Treat it as supporting context and verify missing payer-specific details.",
  };
}

export function getPublicKnowledgeCorpus() {
  return KNOWLEDGE;
}
