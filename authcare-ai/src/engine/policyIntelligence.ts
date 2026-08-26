import { procedureById, serviceById } from "@/data/insuranceData";
import type {
  ClaimDraft,
  PolicyAssessment,
  PolicyBenefitEntry,
  PolicyEvidence,
  PolicyProfile,
  ServiceCategory,
} from "@/types/claim";

const STOP = new Set(["the", "and", "for", "with", "from", "this", "that", "are", "was", "were", "into", "under", "per", "policy", "benefit", "benefits", "service", "services"]);

const SERVICE_TERMS: Record<ServiceCategory, string[]> = {
  doctor_visit: ["doctor", "physician", "consultation", "visit", "specialist"],
  diagnostic_imaging: ["diagnostic", "imaging", "mri", "mra", "ct", "x-ray", "xray", "ultrasound", "laboratory", "pet", "scan"],
  physiotherapy: ["physiotherapy", "physical therapy", "rehabilitation", "sessions"],
  medication_acute: ["acute medication", "prescription medicine", "pharmacy", "medication"],
  medication_chronic: ["chronic medication", "chronic medicine", "prescription medicine", "pharmacy"],
  hospitalization_elective: ["elective hospitalization", "inpatient", "admission", "hospital", "day case"],
  hospitalization_emergency: ["emergency hospitalization", "emergency", "er", "hospital", "admission"],
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9%$]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text: string) {
  return normalize(text).split(" ").filter((token) => token.length > 2 && !STOP.has(token));
}

function serviceQuery(claim: ClaimDraft) {
  const service = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
  const procedure = claim.serviceCategory === "diagnostic_imaging"
    ? claim.procedureId === "other"
      ? claim.procedureOther
      : procedureById(claim.procedureId)?.label ?? claim.procedureId
    : "";
  return `${service} ${procedure} ${claim.diagnosisMotive}`;
}

export function chunkPolicyText(text: string, maxChars = 520): string[] {
  const paragraphs = text.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z])/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
    } else if (`${current} ${paragraph}`.length <= maxChars) {
      current += ` ${paragraph}`;
    } else {
      chunks.push(current);
      current = paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function retrievePolicyEvidence(text: string, query: string, maxResults = 4): PolicyEvidence[] {
  if (!text.trim()) return [];
  const queryTokens = Array.from(new Set(tokens(query)));
  return chunkPolicyText(text)
    .map((chunk, index) => {
      const haystack = normalize(chunk);
      const matched = queryTokens.filter((token) => haystack.includes(token));
      const phraseBoost = SERVICE_TERMS.diagnostic_imaging.some((term) => normalize(query).includes(term) && haystack.includes(term)) ? 1 : 0;
      const score = matched.length + phraseBoost;
      return { id: `policy-chunk-${index + 1}`, text: chunk, source: "Policy / Table of Benefits text", score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

function matchingBenefit(profile: PolicyProfile, claim: ClaimDraft): PolicyBenefitEntry | undefined {
  return profile.benefitEntries.find((entry) => entry.category === claim.serviceCategory || entry.category === "all");
}

function serviceAliases(claim: ClaimDraft) {
  const aliases = [...SERVICE_TERMS[claim.serviceCategory]];
  if (claim.serviceCategory === "diagnostic_imaging") {
    const procedure = claim.procedureId === "other" ? claim.procedureOther : procedureById(claim.procedureId)?.label ?? claim.procedureId;
    if (procedure) aliases.unshift(procedure.toLowerCase());
  }
  return Array.from(new Set(aliases.map(normalize).filter(Boolean)));
}

function explicitTextSignals(text: string, aliases: string[]) {
  const normalized = normalize(text);
  let covered = false;
  let excluded = false;
  for (const alias of aliases) {
    if (!alias || !normalized.includes(alias)) continue;
    const patternsCovered = [`${alias} is covered`, `${alias} covered`, `covered ${alias}`, `${alias} benefit`];
    const patternsExcluded = [`${alias} is excluded`, `${alias} excluded`, `exclude ${alias}`, `not covered ${alias}`, `${alias} not covered`];
    if (patternsCovered.some((pattern) => normalized.includes(pattern))) covered = true;
    if (patternsExcluded.some((pattern) => normalized.includes(pattern))) excluded = true;
  }
  return { covered, excluded };
}

function listMatches(values: string[], aliases: string[]) {
  return values.filter((value) => aliases.some((alias) => normalize(value).includes(alias) || alias.includes(normalize(value))));
}

function policyHasData(profile: PolicyProfile, text: string) {
  return profile.sourceMode !== "none" || profile.benefitEntries.length > 0 || profile.exclusions.length > 0 || text.trim().length > 0;
}

export function assessPolicy(claim: ClaimDraft): PolicyAssessment {
  const profile = claim.policyProfile;
  const text = [profile.rawText, claim.policyText].filter(Boolean).join("\n\n");
  const aliases = serviceAliases(claim);
  const benefit = matchingBenefit(profile, claim);
  const exclusionMatches = listMatches(profile.exclusions, aliases);
  const signals = explicitTextSignals(text, aliases);
  const evidence = retrievePolicyEvidence(text, serviceQuery(claim));
  const conflicts: string[] = [];

  if ((benefit && benefit.status !== "excluded" && exclusionMatches.length > 0) || (signals.covered && signals.excluded)) {
    conflicts.push("The supplied policy material contains both coverage and exclusion signals for the requested service.");
  }
  if (benefit?.status === "covered" && signals.excluded) {
    conflicts.push("The structured benefit entry says covered while supplied policy text contains an exclusion signal.");
  }
  if (benefit?.status === "excluded" && signals.covered) {
    conflicts.push("The structured benefit entry says excluded while supplied policy text contains a coverage signal.");
  }

  const preauthorization = benefit?.preauthorizationRequired === true || profile.preauthorizationRequired === true
    ? "REQUIRED"
    : benefit?.preauthorizationRequired === false || profile.preauthorizationRequired === false
      ? "NOT INDICATED"
      : "UNKNOWN";

  const nssfRaw = benefit?.nssfCoordination ?? profile.nssfCoordination;
  const nssfCoordination = nssfRaw === "required"
    ? "REQUIRED"
    : nssfRaw === "may_apply"
      ? "MAY APPLY"
      : nssfRaw === "not_required"
        ? "NOT INDICATED"
        : "UNKNOWN";

  const network = claim.providerNetworkStatus === "in_network"
    ? "IN NETWORK"
    : claim.providerNetworkStatus === "out_of_network"
      ? "OUT OF NETWORK"
      : profile.networkRestriction === "not_stated"
        ? "NO RESTRICTION STATED"
        : "NOT VERIFIED";

  if (!policyHasData(profile, text)) {
    return {
      status: "POLICY INFORMATION INSUFFICIENT",
      confidence: "low",
      summary: "No policy, Table of Benefits, or structured benefit record is loaded for this request.",
      preauthorization,
      nssfCoordination,
      network,
      limitNote: "No benefit limit can be assessed without policy information.",
      evidence: [],
      conflicts: [],
      warnings: ["Patient-specific coverage remains unverified until authoritative policy/benefit information is supplied."],
    };
  }

  if (conflicts.length > 0) {
    return {
      status: "POLICY CONFLICT DETECTED",
      confidence: "high",
      summary: "Conflicting policy signals were detected. ClaimBot will not choose between contradictory clauses.",
      matchedBenefit: benefit,
      preauthorization,
      nssfCoordination,
      network,
      limitNote: benefit?.remainingLimit != null ? `Structured remaining limit: ${profile.currency} ${benefit.remainingLimit}.` : "Review the conflicting policy sections before relying on any limit.",
      evidence,
      conflicts,
      warnings: ["Resolve the conflict using the controlling policy endorsement, schedule, or payer confirmation."],
    };
  }

  if (benefit?.status === "excluded" || exclusionMatches.length > 0 || signals.excluded) {
    return {
      status: "APPEARS EXCLUDED",
      confidence: benefit?.status === "excluded" || exclusionMatches.length > 0 ? "high" : "medium",
      summary: `The supplied policy material appears to exclude ${serviceById(claim.serviceCategory)?.label ?? "the requested service"}.`,
      matchedBenefit: benefit,
      preauthorization,
      nssfCoordination,
      network,
      limitNote: "A benefit limit is not relevant if the controlling exclusion applies.",
      evidence,
      conflicts: [],
      warnings: ["This is a document-based assessment, not a payer denial. Verify endorsements and exceptions before concluding the service is excluded."],
    };
  }

  const sessionsRequested = Number.parseInt(claim.numberOfSessions, 10);
  const sessionLimitReached = benefit?.sessionLimit != null && Number.isFinite(sessionsRequested) && sessionsRequested > benefit.sessionLimit;
  const exhausted = benefit?.remainingLimit != null && benefit.remainingLimit <= 0;
  const hasLimit = benefit?.annualLimit != null || benefit?.sessionLimit != null || profile.sublimits.length > 0 || profile.sessionLimits.length > 0;

  if (exhausted || sessionLimitReached || (benefit?.status === "conditional" && hasLimit)) {
    const limitNote = exhausted
      ? `The structured benefit shows no remaining limit (${profile.currency} ${benefit?.remainingLimit ?? 0}).`
      : sessionLimitReached
        ? `Requested sessions (${sessionsRequested}) exceed the structured session limit (${benefit?.sessionLimit}).`
        : `The benefit appears subject to a limit or condition${benefit?.remainingLimit != null ? `; structured remaining amount is ${profile.currency} ${benefit.remainingLimit}` : ""}.`;
    return {
      status: "LIMIT MAY APPLY",
      confidence: benefit ? "high" : "medium",
      summary: "The service appears present in the policy, but a benefit limit, session cap, or condition may affect the claim.",
      matchedBenefit: benefit,
      preauthorization,
      nssfCoordination,
      network,
      limitNote,
      evidence,
      conflicts: [],
      warnings: ["Current utilization is not available from the payer; structured remaining amounts are demo/user-entered values only."],
    };
  }

  if (benefit?.status === "covered" || benefit?.status === "conditional" || signals.covered) {
    return {
      status: "APPEARS COVERED",
      confidence: benefit ? "high" : "medium",
      summary: "The supplied policy material contains an affirmative benefit signal for the requested service, subject to the listed conditions.",
      matchedBenefit: benefit,
      preauthorization,
      nssfCoordination,
      network,
      limitNote: benefit?.remainingLimit != null
        ? `Structured remaining amount: ${profile.currency} ${benefit.remainingLimit}. Live utilization is not verified.`
        : hasLimit
          ? "A limit is stated, but live remaining utilization is not verified."
          : "No service-specific limit was identified in the supplied material.",
      evidence,
      conflicts: [],
      warnings: ["Appears covered is not a guarantee of eligibility, medical necessity, network entitlement, available balance, or authorization."],
    };
  }

  return {
    status: "POLICY INFORMATION INSUFFICIENT",
    confidence: "low",
    summary: "Policy information was supplied, but ClaimBot could not find a reliable coverage or exclusion signal for this service.",
    matchedBenefit: benefit,
    preauthorization,
    nssfCoordination,
    network,
    limitNote: "No reliable service-specific limit could be established.",
    evidence,
    conflicts: [],
    warnings: ["Verify the benefit directly in the controlling Table of Benefits, endorsement, or payer system."],
  };
}
