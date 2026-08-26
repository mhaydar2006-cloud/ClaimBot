import { COMMON_RULES, getRuleSet } from "@/engine/ruleSets";
import { tpaById } from "@/data/insuranceData";
import { assessPolicy } from "@/engine/policyIntelligence";
import { retrievePublicKnowledge } from "@/engine/publicKnowledge";
import type {
  ClaimDraft,
  ClaimRule,
  EvaluatedRequirement,
  ReviewResult,
  RuleCoverage,
  RuleSet,
  AssessmentDimension,
  OverallRecommendation,
  PolicyAssessment,
} from "@/types/claim";

type ConditionState = "applies" | "not_applicable" | "unresolved";

function pathValue(record: unknown, path?: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
}

function hasValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function baseRuleMatches(rule: ClaimRule, claim: ClaimDraft) {
  if (!rule.requestTypes.includes(claim.requestType)) return false;
  if (!rule.services.includes(claim.serviceCategory)) return false;
  if (rule.insurerIds && !rule.insurerIds.includes(claim.insurerId)) return false;
  if (rule.procedures && !rule.procedures.includes(claim.procedureId)) return false;
  return true;
}

function evaluateCondition(rule: ClaimRule, claim: ClaimDraft): ConditionState {
  const condition = rule.condition;
  if (!condition) return "applies";

  if (condition.insurerIds && !condition.insurerIds.includes(claim.insurerId)) {
    return "not_applicable";
  }

  if (condition.procedures && !condition.procedures.includes(claim.procedureId)) {
    return "not_applicable";
  }

  if (condition.nssfStatuses) {
    if (claim.nssfStatus === "unknown") return "unresolved";
    if (!condition.nssfStatuses.includes(claim.nssfStatus)) return "not_applicable";
  }

  return "applies";
}

function daysBetween(dateValue: string, now: Date) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = now.getTime() - parsed.getTime();
  return Math.floor(diff / 86_400_000);
}

function evaluateRule(rule: ClaimRule, claim: ClaimDraft, now: Date): EvaluatedRequirement | null {
  if (!baseRuleMatches(rule, claim)) return null;

  const conditionState = evaluateCondition(rule, claim);
  if (conditionState === "not_applicable") return null;

  if (rule.requirementLevel === "informational" || rule.kind === "workflow") {
    return {
      ruleId: rule.id,
      label: rule.label,
      explanation: rule.explanation,
      action: rule.action,
      sourceId: rule.sourceId,
      verification: rule.verification,
      requirementLevel: rule.requirementLevel,
      state: "informational",
    };
  }

  if (conditionState === "unresolved") {
    return {
      ruleId: rule.id,
      label: rule.label,
      explanation: rule.explanation,
      action: rule.action,
      sourceId: rule.sourceId,
      verification: rule.verification,
      requirementLevel: rule.requirementLevel,
      state: "unresolved",
    };
  }

  if (rule.kind === "deadline") {
    const rawDate = pathValue(claim, rule.target);
    if (typeof rawDate !== "string" || !rawDate.trim()) {
      return {
        ruleId: rule.id,
        label: rule.label,
        explanation: rule.explanation,
        action: rule.action,
        sourceId: rule.sourceId,
        verification: rule.verification,
        requirementLevel: rule.requirementLevel,
        state: "missing",
      };
    }

    const elapsedDays = daysBetween(rawDate, now);
    if (elapsedDays === null) {
      return {
        ruleId: rule.id,
        label: rule.label,
        explanation: "The service date could not be interpreted. " + rule.explanation,
        action: rule.action,
        sourceId: rule.sourceId,
        verification: rule.verification,
        requirementLevel: rule.requirementLevel,
        state: "unresolved",
      };
    }

    if (elapsedDays < 0) {
      return {
        ruleId: rule.id,
        label: rule.label,
        explanation: `The entered service date is in the future relative to the review date. ${rule.explanation}`,
        action: "Verify the date of treatment/service before relying on the reimbursement timing check.",
        sourceId: rule.sourceId,
        verification: rule.verification,
        requirementLevel: rule.requirementLevel,
        state: "unresolved",
      };
    }

    if (rule.deadlineDays && elapsedDays > rule.deadlineDays) {
      return {
        ruleId: rule.id,
        label: rule.label,
        explanation: `${rule.explanation} The entered service date is ${elapsedDays} days before the review date.`,
        action: rule.action,
        sourceId: rule.sourceId,
        verification: rule.verification,
        requirementLevel: rule.requirementLevel,
        state: "late",
      };
    }

    return {
      ruleId: rule.id,
      label: rule.label,
      explanation: rule.explanation,
      action: rule.action,
      sourceId: rule.sourceId,
      verification: rule.verification,
      requirementLevel: rule.requirementLevel,
      state: "completed",
    };
  }

  const value = pathValue(claim, rule.target);
  const satisfied = hasValue(value);

  if (rule.requirementLevel === "conditional" && !rule.condition && !satisfied) {
    return {
      ruleId: rule.id,
      label: rule.label,
      explanation: rule.explanation,
      action: rule.action,
      sourceId: rule.sourceId,
      verification: rule.verification,
      requirementLevel: rule.requirementLevel,
      state: "unresolved",
    };
  }

  return {
    ruleId: rule.id,
    label: rule.label,
    explanation: rule.explanation,
    action: rule.action,
    sourceId: rule.sourceId,
    verification: rule.verification,
    requirementLevel: rule.requirementLevel,
    state: satisfied ? "completed" : "missing",
  };
}

function getCoverage(claim: ClaimDraft, externalRequirements: EvaluatedRequirement[]): RuleCoverage {
  const scoredExternal = externalRequirements.filter((item) => item.state !== "informational");
  if (scoredExternal.length === 0) return "unavailable";

  if (claim.tpaId === "nextcare") {
    // Nextcare explicitly names MRI, CT and physiotherapy in the public NSSF pre-approval examples.
    // For an NSSF beneficiary requesting another diagnostic procedure, keep the base checklist
    // but downgrade overall confidence so the user is told to verify procedure-specific NSSF rules.
    if (
      claim.requestType === "preauthorization" &&
      claim.serviceCategory === "diagnostic_imaging" &&
      claim.nssfStatus === "yes" &&
      !["mri", "ct_scan"].includes(claim.procedureId)
    ) {
      return "partial";
    }
    return "verified";
  }

  if (claim.tpaId === "medivisa") return "verified";

  // Libano-Suisse publishes a sufficiently specific GlobeMed hospitalization workflow
  // for these two admission paths. Other GlobeMed service combinations remain partial/unavailable.
  if (
    claim.tpaId === "globemed" &&
    claim.insurerId === "libano-suisse" &&
    claim.requestType === "preauthorization" &&
    (claim.serviceCategory === "hospitalization_elective" || claim.serviceCategory === "hospitalization_emergency")
  ) {
    return "verified";
  }

  return "partial";
}

function buildCoverageLabel(claim: ClaimDraft, coverage: RuleCoverage, externalCount: number) {
  const tpa = tpaById(claim.tpaId)?.name ?? claim.tpaId;
  if (coverage === "verified") return `${tpa}: verified public rule pack (${externalCount} applicable checks)`;
  if (coverage === "partial") return `${tpa}: partial public rule coverage (${externalCount} applicable checks)`;
  return `${tpa}: no verified checklist for this exact request type/service`;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function validateClaim(claim: ClaimDraft, now = new Date()): ReviewResult {
  const payerRuleSet = getRuleSet(claim.tpaId);
  const commonEvaluated = COMMON_RULES.rules
    .map((rule) => evaluateRule(rule, claim, now))
    .filter((item): item is EvaluatedRequirement => Boolean(item));
  const payerEvaluated = payerRuleSet.rules
    .map((rule) => evaluateRule(rule, claim, now))
    .filter((item): item is EvaluatedRequirement => Boolean(item));

  const evaluated = [...commonEvaluated, ...payerEvaluated];
  const completed = evaluated.filter((item) => item.state === "completed");
  const missing = evaluated.filter((item) => item.state === "missing");
  const unresolved = evaluated.filter((item) => item.state === "unresolved");
  const informational = evaluated.filter((item) => item.state === "informational");
  const late = evaluated.filter((item) => item.state === "late");

  const payerRuleCount = payerEvaluated.filter((item) => item.state !== "informational").length;
  const coverage = getCoverage(claim, payerEvaluated);

  const scoreable = evaluated.filter(
    (item) =>
      item.state === "completed" ||
      item.state === "missing" ||
      item.state === "late" ||
      item.state === "unresolved",
  );
  const scoreCompleted = scoreable.filter((item) => item.state === "completed").length;
  const readinessScore = payerRuleCount === 0 || scoreable.length === 0
    ? null
    : Math.round((scoreCompleted / scoreable.length) * 100);

  let status: ReviewResult["status"];
  if (payerRuleCount === 0) {
    status = "REVIEW REQUIRED";
  } else if (missing.length > 0 || late.length > 0) {
    status = "NOT READY";
  } else if (unresolved.length > 0 || coverage !== "verified") {
    status = "REVIEW REQUIRED";
  } else {
    status = "DOCUMENTATION COMPLETE";
  }

  const policyAssessment = assessPolicy(claim);
  const publicKnowledge = retrievePublicKnowledge(claim);
  const dimensions = buildDimensions(claim, status, coverage, payerRuleCount, policyAssessment, missing.length, late.length, unresolved.length);
  const overallRecommendation = buildOverallRecommendation(status, policyAssessment, dimensions);

  const warnings: string[] = [
    "ClaimBot assesses documentation and apparent policy coverage only from encoded public rules and user-supplied policy material. Eligibility, live utilization, medical necessity, and final authorization remain with the payer/TPA.",
  ];

  if (payerRuleCount === 0) {
    warnings.unshift("No verified provider-side checklist is encoded for this exact payer/TPA/request combination. Manual verification is required.");
  } else if (coverage === "partial") {
    warnings.unshift("This request is evaluated using partial public rule coverage. Confirm payer-specific requirements before submission.");
  }

  if (claim.nssfStatus === "unknown" && unresolved.some((item) => item.label.toLowerCase().includes("nssf"))) {
    warnings.push("NSSF status is unresolved and affects at least one conditional requirement.");
  }

  const nextActions = unique([
    ...missing.map((item) => item.action ?? `Complete: ${item.label}`),
    ...late.map((item) => item.action ?? `Review timing: ${item.label}`),
    ...unresolved.map((item) => item.action ?? `Verify: ${item.label}`),
  ]).slice(0, 8);

  if (policyAssessment.status === "APPEARS EXCLUDED" || policyAssessment.status === "POLICY CONFLICT DETECTED") {
    nextActions.unshift("Review the policy issue before submission and verify the controlling clause or endorsement.");
  } else if (policyAssessment.status === "POLICY INFORMATION INSUFFICIENT") {
    nextActions.push("Load the controlling policy / Table of Benefits or verify coverage with the payer.");
  } else if (policyAssessment.status === "LIMIT MAY APPLY") {
    nextActions.push("Verify the applicable limit and current remaining utilization with the payer.");
  }
  if (claim.providerNetworkStatus === "unknown" && claim.policyProfile.networkRestriction === "network_only") {
    nextActions.push("Verify that the selected provider is within the policy network.");
  }
  if (nextActions.length === 0 && status === "DOCUMENTATION COMPLETE") {
    nextActions.push("Proceed through the provider's normal payer/TPA submission channel for final assessment.");
  }
  if (payerRuleCount === 0) {
    nextActions.unshift("Verify the checklist directly with the selected insurer/TPA before submission.");
  }

  const summary = buildSummary(status, missing.length, unresolved.length, late.length, coverage);

  return {
    status,
    readinessScore,
    completed,
    missing,
    unresolved,
    informational,
    late,
    applicableRuleCount: evaluated.length,
    payerRuleCount,
    sourceIds: unique([...evaluated.map((item) => item.sourceId), ...publicKnowledge.evidence.map((item) => item.sourceId)]),
    ruleCoverage: coverage,
    ruleCoverageLabel: buildCoverageLabel(claim, coverage, payerRuleCount),
    policyAssessment,
    publicKnowledge,
    dimensions,
    overallRecommendation,
    summary,
    nextActions,
    warnings,
  };
}

function buildDimensions(
  claim: ClaimDraft,
  documentationStatus: ReviewResult["status"],
  coverage: RuleCoverage,
  payerRuleCount: number,
  policy: PolicyAssessment,
  missingCount: number,
  lateCount: number,
  unresolvedCount: number,
): AssessmentDimension[] {
  const documentation: AssessmentDimension = {
    key: "documentation",
    label: "Documentation",
    status: documentationStatus === "DOCUMENTATION COMPLETE" ? "PASS" : documentationStatus === "NOT READY" ? "REVIEW REQUIRED" : "NOT VERIFIED",
    detail: documentationStatus === "DOCUMENTATION COMPLETE"
      ? "All currently applicable known documentation checks are complete."
      : documentationStatus === "NOT READY"
        ? `${missingCount} missing and ${lateCount} timing issue(s) require correction.`
        : "The exact payer checklist is partial/unavailable or a conditional requirement is unresolved.",
  };

  const policyStatus: AssessmentDimension["status"] = policy.status === "APPEARS COVERED"
    ? "APPEARS COVERED"
    : policy.status === "APPEARS EXCLUDED"
      ? "APPEARS EXCLUDED"
      : policy.status === "LIMIT MAY APPLY"
        ? "LIMIT MAY APPLY"
        : policy.status === "POLICY INFORMATION INSUFFICIENT"
          ? "INSUFFICIENT DATA"
          : "REVIEW REQUIRED";

  const authorization: AssessmentDimension = {
    key: "authorization",
    label: "Authorization Rules",
    status: payerRuleCount === 0 ? "NOT VERIFIED" : coverage === "verified" && unresolvedCount === 0 && missingCount === 0 && lateCount === 0 ? "PASS" : "REVIEW REQUIRED",
    detail: payerRuleCount === 0
      ? "No verified public checklist is encoded for this exact payer/service combination."
      : coverage === "verified"
        ? "Public authorization/documentation rules are encoded for this workflow; unresolved items still require correction or verification."
        : "Only partial public authorization rules are available; verify payer-specific requirements.",
  };

  const clinical: AssessmentDimension = {
    key: "clinical",
    label: "Clinical Criteria",
    status: claim.clinicalJustification && claim.clinicalJustificationReviewed ? "REVIEW REQUIRED" : "INSUFFICIENT DATA",
    detail: claim.clinicalJustification && claim.clinicalJustificationReviewed
      ? "Physician-provided justification is present and marked reviewed, but ClaimBot does not independently determine medical necessity."
      : "Clinical criteria require treating-physician/payer review; ClaimBot does not independently determine medical necessity.",
  };

  return [
    documentation,
    { key: "policy", label: "Policy Coverage", status: policyStatus, detail: policy.summary },
    { key: "eligibility", label: "Eligibility", status: "NOT VERIFIED", detail: "Live member eligibility and benefit utilization require payer/TPA access." },
    authorization,
    clinical,
  ];
}

function buildOverallRecommendation(
  documentationStatus: ReviewResult["status"],
  policy: PolicyAssessment,
  dimensions: AssessmentDimension[],
): OverallRecommendation {
  if (documentationStatus === "NOT READY") return "CORRECT BEFORE SUBMISSION";
  if (policy.status === "APPEARS EXCLUDED" || policy.status === "POLICY CONFLICT DETECTED") return "REVIEW POLICY ISSUE";
  const authorization = dimensions.find((item) => item.key === "authorization");
  if (documentationStatus === "REVIEW REQUIRED" || policy.status === "POLICY INFORMATION INSUFFICIENT" || policy.status === "LIMIT MAY APPLY" || authorization?.status !== "PASS") {
    return "VERIFY WITH PAYER";
  }
  return "READY FOR PAYER REVIEW";
}

function buildSummary(
  status: ReviewResult["status"],
  missingCount: number,
  unresolvedCount: number,
  lateCount: number,
  coverage: RuleCoverage,
) {
  if (status === "DOCUMENTATION COMPLETE") {
    return "All currently applicable verified documentation checks encoded for this request are complete. ClaimBot separately evaluates apparent policy coverage from supplied material; final eligibility, medical necessity, benefit utilization, and authorization still belong to the payer/TPA.";
  }

  if (status === "NOT READY") {
    const parts: string[] = [];
    if (missingCount) parts.push(`${missingCount} missing requirement${missingCount === 1 ? "" : "s"}`);
    if (lateCount) parts.push(`${lateCount} timing issue${lateCount === 1 ? "" : "s"}`);
    return `The request is not documentation-ready because ClaimBot found ${parts.join(" and ")}.`;
  }

  if (coverage === "unavailable") {
    return "ClaimBot can check intake completeness, but it does not yet have a verified provider-side checklist for this exact request. Manual payer/TPA verification is required.";
  }

  return `Known requirements are checked, but ${unresolvedCount} conditional item${unresolvedCount === 1 ? " remains" : "s remain"} unresolved or the available rule coverage is partial.`;
}

export function getExpectedDocumentRules(claim: ClaimDraft) {
  const payerRuleSet = getRuleSet(claim.tpaId);
  const allRules = [...COMMON_RULES.rules, ...payerRuleSet.rules];
  return allRules.filter((rule) => {
    if (rule.kind !== "document" || !rule.target?.startsWith("documents.")) return false;
    if (!baseRuleMatches(rule, claim)) return false;
    const condition = evaluateCondition(rule, claim);
    return condition !== "not_applicable";
  });
}

export function getRuleSetSummary(tpaId: ClaimDraft["tpaId"]): RuleSet {
  return getRuleSet(tpaId);
}
