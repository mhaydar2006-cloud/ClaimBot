import type { InsurerId, ProcedureId, ServiceCategory, TpaId } from "@/types/claim";

export type DenialClassification =
  | "administrative_deficiency"
  | "exclusion"
  | "exhausted_benefit"
  | "missing_preauthorization"
  | "nssf_issue"
  | "insufficient_clinical_evidence"
  | "possible_inconsistency"
  | "insufficient_information";

export interface DenialDraft {
  patientName: string;
  memberId: string;
  insurerId: InsurerId;
  tpaId: TpaId;
  serviceCategory: ServiceCategory;
  procedureId: ProcedureId;
  denialText: string;
  originalRequestText: string;
  policyText: string;
  benefitText: string;
  supportingEvidence: string;
  physicianJustification: string;
}

export interface DenialEvidence {
  label: string;
  text: string;
  source: "denial" | "policy" | "benefits" | "request" | "support";
}

export interface DenialAnalysisResult {
  classification: DenialClassification;
  classificationLabel: string;
  reasonableBasis: "STRONG" | "POSSIBLE" | "WEAK" | "INSUFFICIENT INFORMATION";
  summary: string;
  denialReason: string;
  disputedReason: string;
  applicablePolicyClause: string;
  benefitReference: string;
  supportingEvidence: string[];
  missingEvidence: string[];
  recommendedAction: string;
  evidence: DenialEvidence[];
  warnings: string[];
}

export interface AppealPackage {
  title: string;
  denialSummary: string;
  disputedReason: string;
  applicablePolicyClause: string;
  benefitReference: string;
  supportingEvidence: string[];
  missingEvidence: string[];
  physicianJustification: string;
  requestedReconsideration: string;
  attachmentChecklist: string[];
  letter: string;
}
