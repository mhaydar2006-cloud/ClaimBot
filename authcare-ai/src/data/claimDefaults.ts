import { EMPTY_DOCUMENTS } from "@/data/insuranceData";
import { EMPTY_POLICY_PROFILE, SYNTHETIC_POLICIES } from "@/data/syntheticPolicies";
import type { ClaimDraft, ServiceCategory } from "@/types/claim";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyClaim(): ClaimDraft {
  return {
    patientName: "",
    dob: "",
    mrn: "",
    mobileNumber: "",
    insurerId: "sna",
    tpaId: "nextcare",
    memberId: "",
    nssfStatus: "unknown",
    providerNetworkStatus: "unknown",
    requestType: "preauthorization",
    serviceCategory: "diagnostic_imaging",
    procedureId: "mri",
    procedureOther: "",
    diagnosisMotive: "",
    physicianName: "",
    providerName: "",
    requestDate: todayIso(),
    serviceDate: "",
    admissionDate: "",
    physicianSignature: false,
    physicianStamp: false,
    numberOfSessions: "",
    medicationName: "",
    dosage: "",
    administration: "",
    quantity: "",
    duration: "",
    physicianFees: "",
    clinicalJustification: "",
    clinicalJustificationReviewed: false,
    aiJustification: "",
    policyText: "",
    policySummary: "",
    policyProfile: structuredClone(EMPTY_POLICY_PROFILE),
    documents: { ...EMPTY_DOCUMENTS },
    attachments: [],
  };
}

export function createDemoMriClaim(complete = false): ClaimDraft {
  const claim = createEmptyClaim();
  return {
    ...claim,
    patientName: "Demo Patient Alpha",
    dob: "1985-05-12",
    mrn: "DEMO-LB-20481",
    mobileNumber: "+961 70 000 000",
    insurerId: "sna",
    tpaId: "nextcare",
    memberId: "DEMO-SNA-88201934",
    nssfStatus: "yes",
    requestType: "preauthorization",
    serviceCategory: "diagnostic_imaging",
    procedureId: "mri",
    diagnosisMotive: "Persistent low back pain",
    physicianName: "Dr. Maya Demo",
    providerName: "Beirut Demo Clinic",
    requestDate: todayIso(),
    physicianSignature: true,
    physicianStamp: complete,
    clinicalJustification: "Persistent low back pain; lumbar MRI requested for further evaluation.",
    clinicalJustificationReviewed: true,
    policyProfile: structuredClone(SYNTHETIC_POLICIES[0]),
    policyText: SYNTHETIC_POLICIES[0].rawText,
    documents: {
      ...claim.documents,
      insurance_card: true,
      patient_id: true,
      unified_prescription: true,
      nssf_approval: complete,
    },
  };
}

export function defaultProcedureForService(service: ServiceCategory) {
  return service === "diagnostic_imaging" ? "mri" : "not_applicable";
}
