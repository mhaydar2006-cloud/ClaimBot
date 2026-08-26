import type {
  ClaimDocuments,
  InsurerOption,
  ProcedureId,
  ServiceOption,
  TpaOption,
} from "@/types/claim";

export const INSURERS: InsurerOption[] = [
  {
    id: "sna",
    name: "SNA",
    allowedTpas: ["nextcare"],
    defaultTpa: "nextcare",
    mappingStatus: "verified",
    sourceId: "sna_medical_claim",
    note: "SNA directs medical claims and inpatient pre-approvals through Nextcare/Lumi.",
  },
  {
    id: "fidelity",
    name: "Fidelity Insurance",
    allowedTpas: ["unknown", "nextcare", "mednet"],
    defaultTpa: "unknown",
    mappingStatus: "verified",
    sourceId: "fidelity_tpas",
    note: "Fidelity publicly lists both Nextcare and MedNet as medical TPAs. ClaimBot does not guess which one applies: confirm the TPA on the patient's card or plan before using a payer checklist.",
  },
  {
    id: "libano-suisse",
    name: "Libano-Suisse",
    allowedTpas: ["globemed"],
    defaultTpa: "globemed",
    mappingStatus: "verified",
    sourceId: "libano_suisse_claims",
    note: "Libano-Suisse describes GlobeMed Lebanon as the provider-side approval administrator for medical admissions.",
  },
  {
    id: "medgulf",
    name: "MEDGULF",
    allowedTpas: ["medivisa"],
    defaultTpa: "medivisa",
    mappingStatus: "verified",
    sourceId: "medgulf_medivisa",
    note: "MEDGULF identifies MediVisa as its healthcare TPA in Lebanon.",
  },
  {
    id: "lia-assurex",
    name: "LIA Assurex",
    allowedTpas: ["internal"],
    defaultTpa: "internal",
    mappingStatus: "verified",
    sourceId: "lia_medical",
    note: "LIA Assurex states that its office handles the medical product through claims administration.",
  },
  {
    id: "other",
    name: "Other / Not Listed",
    allowedTpas: ["nextcare", "globemed", "mednet", "medivisa", "internal", "unknown"],
    mappingStatus: "manual",
    note: "Select the administrator shown on the patient's insurance card or policy documents.",
  },
];

export const TPAS: TpaOption[] = [
  {
    id: "nextcare",
    name: "Nextcare",
    ruleCoverage: "Strong",
    note: "Verified Lebanon pre-authorization and reimbursement rules are encoded from official Nextcare guidance.",
  },
  {
    id: "medivisa",
    name: "MediVisa",
    ruleCoverage: "Strong",
    note: "Verified ambulatory, medication, and hospital admission guidance is encoded from official MediVisa pages.",
  },
  {
    id: "globemed",
    name: "GlobeMed Lebanon",
    ruleCoverage: "Partial",
    note: "Verified Libano-Suisse/GlobeMed admission rules are encoded. Other payer-specific GlobeMed requirements remain under validation.",
  },
  {
    id: "mednet",
    name: "MedNet Liban",
    ruleCoverage: "Partial",
    note: "Verified reimbursement-document guidance is encoded. Detailed pre-authorization document rules remain under validation.",
  },
  {
    id: "internal",
    name: "Internal insurer administration",
    ruleCoverage: "Unavailable",
    note: "No provider-side rulebook has been encoded yet. ClaimBot will require manual verification.",
  },
  {
    id: "unknown",
    name: "Unknown / To Verify",
    ruleCoverage: "Unavailable",
    note: "Confirm the administrator before relying on a documentation checklist.",
  },
];

export const SERVICES: ServiceOption[] = [
  {
    id: "doctor_visit",
    label: "Doctor Visit",
    description: "Direct-billing consultation or reimbursement of physician fees.",
  },
  {
    id: "diagnostic_imaging",
    label: "Diagnostic / Imaging",
    description: "MRI, CT, X-ray, ultrasound, laboratory, PET, and other tests.",
  },
  {
    id: "physiotherapy",
    label: "Physiotherapy",
    description: "Physiotherapy authorization or reimbursement requests.",
  },
  {
    id: "medication_acute",
    label: "Medication - Acute",
    description: "Short-term outpatient prescription requests.",
  },
  {
    id: "medication_chronic",
    label: "Medication - Chronic",
    description: "Recurring/chronic prescription requests.",
  },
  {
    id: "hospitalization_elective",
    label: "Hospitalization - Elective",
    description: "Scheduled inpatient/day-care admission requiring pre-authorization.",
  },
  {
    id: "hospitalization_emergency",
    label: "Hospitalization - Emergency",
    description: "Emergency/hot-case admission workflow.",
  },
];

export const PROCEDURES: { id: ProcedureId; label: string }[] = [
  { id: "mri", label: "MRI" },
  { id: "mra", label: "MRA" },
  { id: "ct_scan", label: "CT Scan" },
  { id: "xray", label: "X-Ray" },
  { id: "ultrasound", label: "Ultrasound" },
  { id: "laboratory", label: "Laboratory Test" },
  { id: "pet_scan", label: "PET Scan" },
  { id: "other", label: "Other" },
];

export const DOCUMENT_LABELS: Record<keyof ClaimDocuments, string> = {
  insurance_card: "Insurance card",
  patient_id: "Patient identification",
  unified_prescription: "Unified prescription / physician request",
  medical_report: "Detailed medical report",
  medical_report_mra: "Medical Report for Admission (MRA)",
  nssf_approval: "NSSF prior approval",
  related_results: "Related diagnostic / procedure results",
  previous_radiology_results: "Previous radiology results",
  hospitalization_claim_form: "Hospitalization claim form",
  emergency_room_sheet: "Emergency room sheet",
  operating_room_sheet: "Operating room sheet",
  discharge_summary: "Discharge summary",
  itemized_invoice_receipt: "Itemized invoice and receipt",
  itemized_pharmacy_bill: "Itemized pharmacy bill",
  nssf_documents: "NSSF documents / unified prescription",
  nssf_detailed_bill_receipt: "Detailed NSSF bill + receipt for NSSF difference",
  chronic_medical_report: "Detailed chronic medical report",
  prescription_key: "Prescription key",
  preauthorization_form: "Pre-authorization form",
  receipts_breakdown: "Breakdown of receipts / payments",
  treatment_plan: "Treatment plan",
  diagnostic_results_copies: "Copies of diagnostic test results",
  referral_letter: "Treating physician referral letter",
};

export const EMPTY_DOCUMENTS: ClaimDocuments = Object.keys(DOCUMENT_LABELS).reduce(
  (accumulator, key) => {
    accumulator[key as keyof ClaimDocuments] = false;
    return accumulator;
  },
  {} as ClaimDocuments,
);

export function insurerById(id: string) {
  return INSURERS.find((insurer) => insurer.id === id);
}

export function tpaById(id: string) {
  return TPAS.find((tpa) => tpa.id === id);
}

export function serviceById(id: string) {
  return SERVICES.find((service) => service.id === id);
}

export function procedureById(id: string) {
  return PROCEDURES.find((procedure) => procedure.id === id);
}
