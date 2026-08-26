export type InsurerId =
  | "sna"
  | "fidelity"
  | "libano-suisse"
  | "medgulf"
  | "lia-assurex"
  | "other";

export type TpaId = "nextcare" | "globemed" | "mednet" | "medivisa" | "internal" | "unknown";

export type NssfStatus = "yes" | "no" | "unknown";
export type RequestType = "preauthorization" | "reimbursement";
export type NetworkStatus = "in_network" | "out_of_network" | "unknown";

export type ServiceCategory =
  | "doctor_visit"
  | "diagnostic_imaging"
  | "physiotherapy"
  | "medication_acute"
  | "medication_chronic"
  | "hospitalization_elective"
  | "hospitalization_emergency";

export type ProcedureId =
  | "mri"
  | "mra"
  | "ct_scan"
  | "xray"
  | "ultrasound"
  | "laboratory"
  | "pet_scan"
  | "other"
  | "not_applicable";

export type DocumentKey =
  | "insurance_card"
  | "patient_id"
  | "unified_prescription"
  | "medical_report"
  | "medical_report_mra"
  | "nssf_approval"
  | "related_results"
  | "previous_radiology_results"
  | "hospitalization_claim_form"
  | "emergency_room_sheet"
  | "operating_room_sheet"
  | "discharge_summary"
  | "itemized_invoice_receipt"
  | "itemized_pharmacy_bill"
  | "nssf_documents"
  | "nssf_detailed_bill_receipt"
  | "chronic_medical_report"
  | "prescription_key"
  | "preauthorization_form"
  | "receipts_breakdown"
  | "treatment_plan"
  | "diagnostic_results_copies"
  | "referral_letter";

export type RuleVerification = "verified" | "conditional" | "internal";
export type RuleLevel = "required" | "conditional" | "informational";
export type RuleKind = "field" | "document" | "workflow" | "deadline";

export type ClaimDocuments = Record<DocumentKey, boolean>;

export interface UploadedAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export type PolicySourceMode = "none" | "synthetic" | "structured" | "pasted" | "uploaded";
export type PolicyBenefitStatus = "covered" | "excluded" | "conditional";

export interface PolicyBenefitEntry {
  id: string;
  category: ServiceCategory | "all";
  label: string;
  status: PolicyBenefitStatus;
  annualLimit?: number | null;
  remainingLimit?: number | null;
  copayPercent?: number | null;
  sessionLimit?: number | null;
  preauthorizationRequired?: boolean;
  nssfCoordination?: "required" | "may_apply" | "not_required" | "unknown";
  networkOnly?: boolean;
  notes?: string;
}

export interface PolicyProfile {
  id: string;
  name: string;
  insurerName: string;
  planName: string;
  sourceMode: PolicySourceMode;
  currency: string;
  annualLimit: number | null;
  deductible: number | null;
  coinsurancePercent: number | null;
  networkRestriction: "network_only" | "out_of_network_allowed" | "not_stated";
  preauthorizationRequired: boolean | null;
  nssfCoordination: "required" | "may_apply" | "not_required" | "unknown";
  exclusions: string[];
  waitingPeriods: string[];
  sublimits: string[];
  sessionLimits: string[];
  benefitEntries: PolicyBenefitEntry[];
  rawText: string;
}

export interface ClaimDraft {
  patientName: string;
  dob: string;
  mrn: string;
  mobileNumber: string;
  insurerId: InsurerId;
  tpaId: TpaId;
  memberId: string;
  nssfStatus: NssfStatus;
  providerNetworkStatus: NetworkStatus;
  requestType: RequestType;
  serviceCategory: ServiceCategory;
  procedureId: ProcedureId;
  procedureOther: string;
  diagnosisMotive: string;
  physicianName: string;
  providerName: string;
  requestDate: string;
  serviceDate: string;
  admissionDate: string;
  physicianSignature: boolean;
  physicianStamp: boolean;
  numberOfSessions: string;
  medicationName: string;
  dosage: string;
  administration: string;
  quantity: string;
  duration: string;
  physicianFees: string;
  clinicalJustification: string;
  clinicalJustificationReviewed: boolean;
  aiJustification?: string;
  policyText: string;
  policySummary?: string;
  policyProfile: PolicyProfile;
  documents: ClaimDocuments;
  attachments: UploadedAttachment[];
}

export interface RuleCondition {
  nssfStatuses?: NssfStatus[];
  procedures?: ProcedureId[];
  insurerIds?: InsurerId[];
}

export interface ClaimRule {
  id: string;
  organizationId: string;
  organizationName: string;
  requestTypes: RequestType[];
  services: ServiceCategory[];
  procedures?: ProcedureId[];
  insurerIds?: InsurerId[];
  kind: RuleKind;
  requirementLevel: RuleLevel;
  verification: RuleVerification;
  target?: string;
  label: string;
  explanation: string;
  action?: string;
  sourceId: string;
  condition?: RuleCondition;
  deadlineDays?: number;
}

export interface RuleSet {
  organizationId: string;
  organizationName: string;
  country: string;
  coverageNote: string;
  rules: ClaimRule[];
}

export type SourceVerificationStatus = "verified" | "partial" | "internal";

export interface SourceRecord {
  id: string;
  organization: string;
  title: string;
  url?: string;
  accessed: string;
  scope: string;
  section?: string;
  page?: string;
  version?: string;
  verificationStatus?: SourceVerificationStatus;
}


export interface PublicKnowledgeChunk {
  id: string;
  organizationId: TpaId | string;
  organizationName: string;
  sourceId: string;
  insurerIds?: InsurerId[];
  requestTypes: RequestType[];
  services: ServiceCategory[];
  tags: string[];
  text: string;
  verification: "verified" | "partial";
}

export interface PublicKnowledgeEvidence {
  id: string;
  text: string;
  sourceId: string;
  organizationName: string;
  verification: "verified" | "partial";
  score: number;
  matchedTerms: string[];
}

export interface PublicKnowledgeRetrieval {
  confidence: "high" | "medium" | "low" | "none";
  evidence: PublicKnowledgeEvidence[];
  note: string;
}

export type RequirementState = "completed" | "missing" | "unresolved" | "informational" | "late";

export interface EvaluatedRequirement {
  ruleId: string;
  label: string;
  explanation: string;
  action?: string;
  sourceId: string;
  verification: RuleVerification;
  requirementLevel: RuleLevel;
  state: RequirementState;
}

export type DocumentationStatus = "DOCUMENTATION COMPLETE" | "NOT READY" | "REVIEW REQUIRED";
export type RuleCoverage = "verified" | "partial" | "unavailable";
export type PolicyCoverageStatus =
  | "APPEARS COVERED"
  | "APPEARS EXCLUDED"
  | "LIMIT MAY APPLY"
  | "POLICY INFORMATION INSUFFICIENT"
  | "POLICY CONFLICT DETECTED";

export interface PolicyEvidence {
  id: string;
  text: string;
  source: string;
  score: number;
}

export interface PolicyAssessment {
  status: PolicyCoverageStatus;
  confidence: "high" | "medium" | "low";
  summary: string;
  matchedBenefit?: PolicyBenefitEntry;
  preauthorization: "REQUIRED" | "NOT INDICATED" | "UNKNOWN";
  nssfCoordination: "REQUIRED" | "MAY APPLY" | "NOT INDICATED" | "UNKNOWN";
  network: "IN NETWORK" | "OUT OF NETWORK" | "NOT VERIFIED" | "NO RESTRICTION STATED";
  limitNote: string;
  evidence: PolicyEvidence[];
  conflicts: string[];
  warnings: string[];
}

export type AssessmentDimensionStatus =
  | "PASS"
  | "APPEARS COVERED"
  | "APPEARS EXCLUDED"
  | "LIMIT MAY APPLY"
  | "NOT VERIFIED"
  | "INSUFFICIENT DATA"
  | "REVIEW REQUIRED";

export interface AssessmentDimension {
  key: "documentation" | "policy" | "eligibility" | "authorization" | "clinical";
  label: string;
  status: AssessmentDimensionStatus;
  detail: string;
}

export type OverallRecommendation =
  | "READY FOR PAYER REVIEW"
  | "CORRECT BEFORE SUBMISSION"
  | "VERIFY WITH PAYER"
  | "REVIEW POLICY ISSUE";

export interface ReviewResult {
  status: DocumentationStatus;
  readinessScore: number | null;
  completed: EvaluatedRequirement[];
  missing: EvaluatedRequirement[];
  unresolved: EvaluatedRequirement[];
  informational: EvaluatedRequirement[];
  late: EvaluatedRequirement[];
  applicableRuleCount: number;
  payerRuleCount: number;
  sourceIds: string[];
  ruleCoverage: RuleCoverage;
  ruleCoverageLabel: string;
  policyAssessment: PolicyAssessment;
  publicKnowledge: PublicKnowledgeRetrieval;
  dimensions: AssessmentDimension[];
  overallRecommendation: OverallRecommendation;
  summary: string;
  nextActions: string[];
  warnings: string[];
}

export interface InsurerOption {
  id: InsurerId;
  name: string;
  allowedTpas: TpaId[];
  defaultTpa?: TpaId;
  mappingStatus: "verified" | "manual";
  sourceId?: string;
  note?: string;
}

export interface TpaOption {
  id: TpaId;
  name: string;
  ruleCoverage: string;
  note: string;
}

export interface ServiceOption {
  id: ServiceCategory;
  label: string;
  description: string;
}
