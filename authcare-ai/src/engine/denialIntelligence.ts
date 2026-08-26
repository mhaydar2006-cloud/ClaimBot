import { insurerById, procedureById, serviceById, tpaById } from "@/data/insuranceData";
import type { AppealPackage, DenialAnalysisResult, DenialClassification, DenialDraft, DenialEvidence } from "@/types/denial";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(text: string, phrases: string[]) {
  const haystack = normalize(text);
  return phrases.some((phrase) => haystack.includes(normalize(phrase)));
}

function firstRelevantSentence(text: string, keywords: string[]) {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((item) => item.trim()).filter(Boolean);
  return sentences.find((sentence) => includesAny(sentence, keywords)) ?? sentences[0] ?? "Not provided.";
}

const LABELS: Record<DenialClassification, string> = {
  administrative_deficiency: "Administrative deficiency",
  exclusion: "Policy exclusion",
  exhausted_benefit: "Exhausted / limited benefit",
  missing_preauthorization: "Missing preauthorization",
  nssf_issue: "NSSF coordination issue",
  insufficient_clinical_evidence: "Insufficient clinical evidence",
  possible_inconsistency: "Possible inconsistency",
  insufficient_information: "Insufficient information",
};

export function createEmptyDenialDraft(): DenialDraft {
  return {
    patientName: "",
    memberId: "",
    insurerId: "sna",
    tpaId: "nextcare",
    serviceCategory: "diagnostic_imaging",
    procedureId: "mri",
    denialText: "",
    originalRequestText: "",
    policyText: "",
    benefitText: "",
    supportingEvidence: "",
    physicianJustification: "",
  };
}

export function createDenialDemo(kind: "excluded" | "paperwork" | "contestable" | "limit" | "insufficient"): DenialDraft {
  const draft = createEmptyDenialDraft();
  const base = {
    ...draft,
    patientName: "Demo Patient Delta",
    memberId: "DEMO-DENIAL-001",
    originalRequestText: "Lumbar MRI requested for persistent low back pain. Physician request was signed and stamped.",
    supportingEvidence: "Insurance card, patient ID, physician request, medical report, and imaging request are available.",
    physicianJustification: "Persistent low back pain; lumbar MRI requested for further evaluation.",
  };
  if (kind === "excluded") {
    return { ...base, denialText: "Claim denied because outpatient MRI is excluded under this policy.", policyText: "Outpatient diagnostic imaging, including MRI, is excluded unless performed during a covered inpatient admission.", benefitText: "Inpatient diagnostic services: covered. Outpatient MRI: excluded." };
  }
  if (kind === "paperwork") {
    return { ...base, denialText: "Request returned because the physician stamp and identification copy were missing.", policyText: "Diagnostic imaging may be covered subject to authorization.", benefitText: "MRI benefit: covered subject to preauthorization.", supportingEvidence: "The physician stamp and patient identification copy are now available." };
  }
  if (kind === "contestable") {
    return { ...base, denialText: "Denied: MRI is not covered under the member plan.", policyText: "Diagnostic imaging, including MRI and CT, is covered subject to prior authorization and the annual diagnostic sublimit.", benefitText: "MRI / CT: covered; annual limit USD 3,000; remaining balance shown on supplied benefit statement USD 2,400." };
  }
  if (kind === "limit") {
    return { ...base, denialText: "Denied because the annual diagnostic imaging benefit limit has been exhausted.", policyText: "Diagnostic imaging is covered up to USD 1,000 per policy year.", benefitText: "Diagnostic imaging annual limit USD 1,000. Remaining balance USD 0." };
  }
  return { ...base, denialText: "Request denied.", policyText: "", benefitText: "", supportingEvidence: "" };
}

function classify(draft: DenialDraft): DenialClassification {
  const denial = draft.denialText;
  const policy = `${draft.policyText} ${draft.benefitText}`;

  if (!denial.trim() || denial.trim().split(/\s+/).length < 3) return "insufficient_information";
  if (includesAny(denial, ["preauthorization", "pre authorization", "prior authorization", "prior approval", "preapproval"])) return "missing_preauthorization";
  if (includesAny(denial, ["nssf", "social security", "cnss"])) return "nssf_issue";
  if (includesAny(denial, ["exhausted", "limit reached", "benefit limit", "annual limit", "maximum reached", "no remaining"])) return "exhausted_benefit";
  if (includesAny(denial, ["missing document", "missing documents", "incomplete", "stamp", "signature", "id copy", "identification", "invoice", "receipt", "form not completed", "paperwork"])) return "administrative_deficiency";
  if (includesAny(denial, ["medical necessity", "insufficient clinical", "clinical information", "medical report insufficient", "not medically necessary", "clinical criteria"])) return "insufficient_clinical_evidence";
  if (includesAny(denial, ["excluded", "not covered", "outside coverage", "benefit not included"])) {
    const affirmativePolicy = includesAny(policy, ["is covered", "covered subject", "benefit covered", "included benefit", "remaining balance"]);
    const exclusionPolicy = includesAny(policy, ["is excluded", "excluded", "not covered"]);
    if (affirmativePolicy && !exclusionPolicy) return "possible_inconsistency";
    return "exclusion";
  }
  if (draft.policyText.trim() && draft.benefitText.trim()) return "possible_inconsistency";
  return "insufficient_information";
}

export function analyzeDenial(draft: DenialDraft): DenialAnalysisResult {
  const classification = classify(draft);
  const denialReason = firstRelevantSentence(draft.denialText, ["denied", "declined", "returned", "excluded", "missing", "limit", "authorization", "nssf"]);
  const applicablePolicyClause = firstRelevantSentence(draft.policyText, ["covered", "excluded", "authorization", "limit", "network", "nssf"]);
  const benefitReference = firstRelevantSentence(draft.benefitText, ["covered", "excluded", "limit", "remaining", "copay", "session"]);
  const support = draft.supportingEvidence.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
  const evidence: DenialEvidence[] = [
    { label: "Denial wording", text: denialReason, source: "denial" },
  ];
  if (draft.policyText.trim()) evidence.push({ label: "Policy clause", text: applicablePolicyClause, source: "policy" });
  if (draft.benefitText.trim()) evidence.push({ label: "Benefit reference", text: benefitReference, source: "benefits" });
  if (draft.originalRequestText.trim()) evidence.push({ label: "Original request", text: firstRelevantSentence(draft.originalRequestText, ["requested", "diagnosis", "report", "authorization"]), source: "request" });

  let reasonableBasis: DenialAnalysisResult["reasonableBasis"] = "INSUFFICIENT INFORMATION";
  let disputedReason = "There is not enough information to identify a specific disputed basis.";
  let recommendedAction = "Obtain the complete denial reason, controlling policy/Table of Benefits, and original submission before deciding whether to contest.";
  const missingEvidence: string[] = [];

  switch (classification) {
    case "administrative_deficiency":
      reasonableBasis = support.length ? "STRONG" : "POSSIBLE";
      disputedReason = "The denial appears administrative. If the missing items can be corrected, resubmission or reconsideration may be appropriate without disputing the underlying benefit.";
      recommendedAction = "Correct the identified paperwork deficiency, attach the missing documents, and request reconsideration/resubmission.";
      if (!support.length) missingEvidence.push("Corrected or newly supplied administrative documents");
      break;
    case "exclusion":
      reasonableBasis = includesAny(`${draft.policyText} ${draft.benefitText}`, ["covered", "exception", "endorsement"]) ? "POSSIBLE" : "WEAK";
      disputedReason = "The payer cites an exclusion. A contest is strongest only if an endorsement, benefit schedule, exception, or more specific clause overrides that exclusion.";
      recommendedAction = reasonableBasis === "WEAK" ? "Verify whether any endorsement or exception applies before appealing; otherwise explain the exclusion rather than overstate an appeal basis." : "Compare the exclusion against endorsements and the benefit schedule, then cite the more specific controlling clause in a reconsideration request.";
      missingEvidence.push("Any endorsement or exception that modifies the cited exclusion");
      break;
    case "exhausted_benefit":
      reasonableBasis = includesAny(draft.benefitText, ["remaining", "available", "balance"]) && !includesAny(draft.benefitText, ["remaining balance usd 0", "remaining 0", "balance 0"]) ? "POSSIBLE" : "WEAK";
      disputedReason = "The denial is based on a benefit cap or exhausted balance. A contest requires evidence that the utilization calculation or applicable limit is wrong.";
      recommendedAction = "Request or compare the payer utilization ledger and the controlling sublimit. Appeal only if the remaining balance or applied limit appears inconsistent.";
      missingEvidence.push("Payer utilization ledger / remaining benefit calculation");
      break;
    case "missing_preauthorization":
      reasonableBasis = includesAny(draft.originalRequestText, ["authorized", "approval", "preauthorization number", "prior approval"]) ? "STRONG" : "POSSIBLE";
      disputedReason = "The payer cites missing preauthorization. Reconsideration depends on proof of prior approval, an emergency exception, or a policy clause allowing retrospective review.";
      recommendedAction = "Attach any authorization reference, submission timestamp, emergency documentation, or retrospective-authorization provision and request reconsideration.";
      missingEvidence.push("Authorization number/submission proof or applicable exception");
      break;
    case "nssf_issue":
      reasonableBasis = includesAny(draft.supportingEvidence, ["nssf", "cnss", "social security", "approval"]) ? "STRONG" : "POSSIBLE";
      disputedReason = "The denial appears tied to NSSF coordination. The key question is whether the required NSSF approval/decision was applicable and supplied.";
      recommendedAction = "Verify NSSF status and attach the applicable NSSF approval, refusal, or non-applicability evidence before reconsideration.";
      missingEvidence.push("NSSF status and applicable approval/decision evidence");
      break;
    case "insufficient_clinical_evidence":
      reasonableBasis = draft.physicianJustification.trim() ? "POSSIBLE" : "WEAK";
      disputedReason = "The payer says the clinical record is insufficient. ClaimBot can organize physician-provided facts but cannot independently determine medical necessity.";
      recommendedAction = "Ask the treating physician to review the stated clinical criteria/reason and provide any missing history, findings, prior treatment, or rationale supported by the medical record.";
      if (!draft.physicianJustification.trim()) missingEvidence.push("Treating physician clinical justification / supporting medical report");
      break;
    case "possible_inconsistency":
      reasonableBasis = draft.policyText.trim() && draft.benefitText.trim() ? "STRONG" : "POSSIBLE";
      disputedReason = "The denial reason appears potentially inconsistent with the supplied policy/benefit material and should be reconciled before accepting the denial at face value.";
      recommendedAction = "Request reconsideration citing the specific benefit/policy wording and ask the payer to explain which controlling clause supports the denial.";
      break;
    case "insufficient_information":
      missingEvidence.push("Detailed denial reason or denial letter", "Controlling policy / Table of Benefits", "Original request and supporting documents");
      break;
  }

  const summary = `${LABELS[classification]}. ${reasonableBasis === "INSUFFICIENT INFORMATION" ? "ClaimBot cannot assess a contest basis from the supplied material." : `Reconsideration basis: ${reasonableBasis.toLowerCase()}.`}`;

  return {
    classification,
    classificationLabel: LABELS[classification],
    reasonableBasis,
    summary,
    denialReason,
    disputedReason,
    applicablePolicyClause,
    benefitReference,
    supportingEvidence: support,
    missingEvidence: Array.from(new Set(missingEvidence)),
    recommendedAction,
    evidence,
    warnings: [
      "This is decision support based only on the supplied documents; it is not legal advice and does not determine coverage or medical necessity.",
      "A payer/TPA makes the final reconsideration and authorization decision.",
    ],
  };
}

export function buildAppealPackage(draft: DenialDraft, result: DenialAnalysisResult): AppealPackage {
  const insurer = insurerById(draft.insurerId)?.name ?? draft.insurerId;
  const tpa = tpaById(draft.tpaId)?.name ?? draft.tpaId;
  const service = serviceById(draft.serviceCategory)?.label ?? draft.serviceCategory;
  const procedure = draft.serviceCategory === "diagnostic_imaging"
    ? procedureById(draft.procedureId)?.label ?? draft.procedureId
    : "";
  const attachmentChecklist = Array.from(new Set([
    "Denial letter / denial reason",
    "Original request / claim form",
    "Insurance card / member identification",
    ...(draft.policyText.trim() ? ["Relevant policy clause / endorsement"] : []),
    ...(draft.benefitText.trim() ? ["Table of Benefits / benefit statement"] : []),
    ...(draft.supportingEvidence.trim() ? result.supportingEvidence : []),
    ...(draft.physicianJustification.trim() ? ["Treating physician justification / medical report"] : []),
    ...result.missingEvidence.map((item) => `Obtain before submission: ${item}`),
  ]));

  const requestedReconsideration = result.reasonableBasis === "WEAK"
    ? "Please confirm the controlling policy basis and provide the utilization/benefit calculation supporting the denial. If no contrary evidence is available, this package should be used as a clarification request rather than asserting entitlement."
    : "Please reconsider the denial in light of the cited policy/benefit wording and attached supporting evidence, and provide the controlling clause and rationale if the denial is maintained.";

  const letter = [
    "RECONSIDERATION REQUEST — CLAIMBOT DRAFT",
    "",
    `Patient: ${draft.patientName || "Not entered"}`,
    `Member / Policy ID: ${draft.memberId || "Not entered"}`,
    `Insurer / Administrator: ${insurer} / ${tpa}`,
    `Requested service: ${service}${procedure ? ` - ${procedure}` : ""}`,
    "",
    "Denial summary:",
    result.denialReason,
    "",
    "Basis for reconsideration / clarification:",
    result.disputedReason,
    "",
    "Applicable policy clause supplied:",
    result.applicablePolicyClause,
    "",
    "Benefit reference supplied:",
    result.benefitReference,
    "",
    "Treating physician justification (must be physician-reviewed):",
    draft.physicianJustification || "Not supplied.",
    "",
    "Requested action:",
    requestedReconsideration,
    "",
    "This draft was prepared from user-supplied information. Final coverage, medical necessity, eligibility, and authorization remain with the insurer/TPA.",
  ].join("\n");

  return {
    title: "ClaimBot Reconsideration Package",
    denialSummary: result.denialReason,
    disputedReason: result.disputedReason,
    applicablePolicyClause: result.applicablePolicyClause,
    benefitReference: result.benefitReference,
    supportingEvidence: result.supportingEvidence,
    missingEvidence: result.missingEvidence,
    physicianJustification: draft.physicianJustification || "Not supplied.",
    requestedReconsideration,
    attachmentChecklist,
    letter,
  };
}
