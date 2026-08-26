import { createEmptyClaim } from "@/data/claimDefaults";
import { SYNTHETIC_POLICIES } from "@/data/syntheticPolicies";
import { validateClaim } from "@/engine/validator";
import type { ClaimDraft, DocumentationStatus, PolicyCoverageStatus } from "@/types/claim";

export interface SelfTestDefinition {
  id: string;
  name: string;
  description: string;
  claim: ClaimDraft;
  expectedStatus: DocumentationStatus;
  expectedMissing?: string[];
  expectedUnresolved?: string[];
  expectedLate?: string[];
  expectedScore?: number | null;
  expectedPolicyStatus?: PolicyCoverageStatus;
}

export interface SelfTestResult extends SelfTestDefinition {
  passed: boolean;
  actualStatus: DocumentationStatus;
  actualScore: number | null;
  actualMissing: string[];
  actualUnresolved: string[];
  actualLate: string[];
  actualPolicyStatus: PolicyCoverageStatus;
  failures: string[];
}

export const SELF_TEST_NOW = new Date("2026-08-19T12:00:00+03:00");

function baseClaim(): ClaimDraft {
  const claim = createEmptyClaim();
  return {
    ...claim,
    patientName: "Synthetic Test Patient",
    dob: "1985-05-12",
    mrn: "TEST-LB-001",
    mobileNumber: "+961 70 000 000",
    memberId: "TEST-POLICY-001",
    diagnosisMotive: "Synthetic clinical motive for rules-engine testing",
    physicianName: "Dr. Test Physician",
    providerName: "Synthetic Test Clinic",
    requestDate: "2026-08-19",
    physicianSignature: true,
    physicianStamp: true,
  };
}

function nextcareMri(nssfStatus: ClaimDraft["nssfStatus"] = "yes") {
  const claim = baseClaim();
  return {
    ...claim,
    insurerId: "sna" as const,
    tpaId: "nextcare" as const,
    nssfStatus,
    requestType: "preauthorization" as const,
    serviceCategory: "diagnostic_imaging" as const,
    procedureId: "mri" as const,
    documents: {
      ...claim.documents,
      unified_prescription: true,
      insurance_card: true,
      patient_id: true,
      nssf_approval: nssfStatus === "yes",
    },
  };
}

function nextcareHospitalization(complete = true) {
  const claim = baseClaim();
  return {
    ...claim,
    insurerId: "sna" as const,
    tpaId: "nextcare" as const,
    nssfStatus: "yes" as const,
    requestType: "preauthorization" as const,
    serviceCategory: "hospitalization_elective" as const,
    procedureId: "not_applicable" as const,
    admissionDate: "2026-08-25",
    documents: {
      ...claim.documents,
      medical_report_mra: true,
      insurance_card: true,
      patient_id: true,
      related_results: complete,
      nssf_approval: true,
    },
  };
}

function medivisaMri(nssfStatus: ClaimDraft["nssfStatus"] = "yes") {
  const claim = baseClaim();
  return {
    ...claim,
    insurerId: "medgulf" as const,
    tpaId: "medivisa" as const,
    nssfStatus,
    requestType: "preauthorization" as const,
    serviceCategory: "diagnostic_imaging" as const,
    procedureId: "mri" as const,
    documents: {
      ...claim.documents,
      medical_report: true,
      unified_prescription: true,
      insurance_card: true,
      patient_id: true,
      nssf_approval: nssfStatus === "yes",
    },
  };
}

function mednetReimbursement(serviceDate: string) {
  const claim = baseClaim();
  return {
    ...claim,
    insurerId: "fidelity" as const,
    tpaId: "mednet" as const,
    nssfStatus: "no" as const,
    requestType: "reimbursement" as const,
    serviceCategory: "doctor_visit" as const,
    procedureId: "not_applicable" as const,
    serviceDate,
    documents: {
      ...claim.documents,
      receipts_breakdown: true,
      medical_report: true,
      treatment_plan: true,
      diagnostic_results_copies: true,
    },
  };
}

const mriMissing = nextcareMri("yes");
mriMissing.physicianStamp = false;
mriMissing.documents.nssf_approval = false;

const mriUnknownNssf = nextcareMri("unknown");
mriUnknownNssf.documents.nssf_approval = false;

const mriNoNssf = nextcareMri("no");
mriNoNssf.documents.nssf_approval = false;

const emergency = baseClaim();
emergency.insurerId = "sna";
emergency.tpaId = "nextcare";
emergency.nssfStatus = "no";
emergency.requestType = "preauthorization";
emergency.serviceCategory = "hospitalization_emergency";
emergency.procedureId = "not_applicable";
emergency.documents.insurance_card = true;
emergency.documents.patient_id = true;

const acuteMedication = baseClaim();
acuteMedication.insurerId = "sna";
acuteMedication.tpaId = "nextcare";
acuteMedication.nssfStatus = "no";
acuteMedication.requestType = "preauthorization";
acuteMedication.serviceCategory = "medication_acute";
acuteMedication.procedureId = "not_applicable";
acuteMedication.documents.unified_prescription = true;
acuteMedication.documents.insurance_card = true;
acuteMedication.documents.patient_id = true;

const chronicMedication = baseClaim();
chronicMedication.insurerId = "sna";
chronicMedication.tpaId = "nextcare";
chronicMedication.nssfStatus = "no";
chronicMedication.requestType = "preauthorization";
chronicMedication.serviceCategory = "medication_chronic";
chronicMedication.procedureId = "not_applicable";
chronicMedication.documents.preauthorization_form = true;

const nextcareDoctorReimbursement = baseClaim();
nextcareDoctorReimbursement.insurerId = "fidelity";
nextcareDoctorReimbursement.tpaId = "nextcare";
nextcareDoctorReimbursement.nssfStatus = "no";
nextcareDoctorReimbursement.requestType = "reimbursement";
nextcareDoctorReimbursement.serviceCategory = "doctor_visit";
nextcareDoctorReimbursement.procedureId = "not_applicable";
nextcareDoctorReimbursement.physicianFees = "Synthetic fee recorded";
nextcareDoctorReimbursement.documents.unified_prescription = true;
nextcareDoctorReimbursement.documents.insurance_card = true;
nextcareDoctorReimbursement.documents.patient_id = true;

const nextcarePhysioReimbursement = baseClaim();
nextcarePhysioReimbursement.insurerId = "sna";
nextcarePhysioReimbursement.tpaId = "nextcare";
nextcarePhysioReimbursement.nssfStatus = "no";
nextcarePhysioReimbursement.requestType = "reimbursement";
nextcarePhysioReimbursement.serviceCategory = "physiotherapy";
nextcarePhysioReimbursement.procedureId = "not_applicable";
nextcarePhysioReimbursement.numberOfSessions = "";
nextcarePhysioReimbursement.documents.unified_prescription = true;
nextcarePhysioReimbursement.documents.itemized_invoice_receipt = true;
nextcarePhysioReimbursement.documents.insurance_card = true;
nextcarePhysioReimbursement.documents.patient_id = true;
nextcarePhysioReimbursement.documents.previous_radiology_results = true;

const medivisaUnknown = medivisaMri("unknown");
medivisaUnknown.documents.nssf_approval = false;

const medivisaHospital = baseClaim();
medivisaHospital.insurerId = "medgulf";
medivisaHospital.tpaId = "medivisa";
medivisaHospital.nssfStatus = "no";
medivisaHospital.requestType = "preauthorization";
medivisaHospital.serviceCategory = "hospitalization_elective";
medivisaHospital.procedureId = "not_applicable";
medivisaHospital.documents.hospitalization_claim_form = true;
medivisaHospital.documents.related_results = true;

const globemedHospital = baseClaim();
globemedHospital.insurerId = "libano-suisse";
globemedHospital.tpaId = "globemed";
globemedHospital.nssfStatus = "no";
globemedHospital.requestType = "preauthorization";
globemedHospital.serviceCategory = "hospitalization_elective";
globemedHospital.procedureId = "not_applicable";
globemedHospital.documents.medical_report_mra = true;
globemedHospital.documents.insurance_card = true;
globemedHospital.documents.patient_id = true;

const globemedUnsupported = baseClaim();
globemedUnsupported.insurerId = "other";
globemedUnsupported.tpaId = "globemed";
globemedUnsupported.nssfStatus = "no";
globemedUnsupported.requestType = "preauthorization";
globemedUnsupported.serviceCategory = "diagnostic_imaging";
globemedUnsupported.procedureId = "mri";

const internalUnknown = baseClaim();
internalUnknown.insurerId = "lia-assurex";
internalUnknown.tpaId = "internal";
internalUnknown.nssfStatus = "no";
internalUnknown.requestType = "preauthorization";
internalUnknown.serviceCategory = "diagnostic_imaging";
internalUnknown.procedureId = "mri";

const missingCommon = nextcareMri("no");
missingCommon.patientName = "";

const mednetFuture = mednetReimbursement("2026-08-25");

export const SELF_TESTS: SelfTestDefinition[] = [
  {
    id: "NC-MRI-001",
    name: "Nextcare MRI - missing stamp and NSSF approval",
    description: "A deliberately incomplete SNA/Nextcare MRI pre-authorization must be blocked.",
    claim: mriMissing,
    expectedStatus: "NOT READY",
    expectedMissing: ["Physician stamp confirmed", "Applicable NSSF prior approval"],
  },
  {
    id: "NC-MRI-002",
    name: "Nextcare MRI - complete NSSF case",
    description: "All encoded Nextcare MRI checks are complete.",
    claim: nextcareMri("yes"),
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-MRI-003",
    name: "Nextcare MRI - unknown NSSF status",
    description: "Unknown NSSF status must prevent an unconditional ready result.",
    claim: mriUnknownNssf,
    expectedStatus: "REVIEW REQUIRED",
    expectedUnresolved: ["Applicable NSSF prior approval"],
  },
  {
    id: "NC-MRI-004",
    name: "Nextcare MRI - non-NSSF patient",
    description: "NSSF approval should not be demanded when NSSF status is No.",
    claim: mriNoNssf,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-HOSP-001",
    name: "Nextcare elective admission - complete",
    description: "Complete elective inpatient documentation should pass the encoded checklist.",
    claim: nextcareHospitalization(true),
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-HOSP-002",
    name: "Nextcare elective admission - missing results",
    description: "Related procedure/test results are deliberately removed.",
    claim: nextcareHospitalization(false),
    expectedStatus: "NOT READY",
    expectedMissing: ["Related procedure / test results"],
  },
  {
    id: "NC-ER-001",
    name: "Nextcare emergency admission - intake complete",
    description: "Card and ID are present; workflow guidance remains informational.",
    claim: emergency,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-MED-001",
    name: "Nextcare acute medication - complete",
    description: "Prescription, signature/stamp, card and ID are present.",
    claim: acuteMedication,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-MED-002",
    name: "Nextcare chronic medication - request form complete",
    description: "The chronic prescription request form is present; pharmacy card/ID/key steps are informational after approval.",
    claim: chronicMedication,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-REIMB-001",
    name: "Nextcare doctor-visit reimbursement - complete non-NSSF",
    description: "Core reimbursement documents and physician fee field are present.",
    claim: nextcareDoctorReimbursement,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "NC-REIMB-002",
    name: "Nextcare physiotherapy reimbursement - missing session count",
    description: "Number of sessions is required by the encoded reimbursement rule.",
    claim: nextcarePhysioReimbursement,
    expectedStatus: "NOT READY",
    expectedMissing: ["Number of physiotherapy sessions"],
  },
  {
    id: "MV-MRI-001",
    name: "MediVisa MRI - complete NSSF case",
    description: "MEDGULF/MediVisa MRI flow with its documented supporting materials.",
    claim: medivisaMri("yes"),
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "MV-MRI-002",
    name: "MediVisa MRI - unknown NSSF",
    description: "MediVisa procedure-specific NSSF requirement remains unresolved.",
    claim: medivisaUnknown,
    expectedStatus: "REVIEW REQUIRED",
    expectedUnresolved: ["NSSF prior approval for applicable services"],
  },
  {
    id: "MV-HOSP-001",
    name: "MediVisa elective admission - non-NSSF complete",
    description: "Hospitalization claim form and related results are present.",
    claim: medivisaHospital,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "GM-HOSP-001",
    name: "GlobeMed/Libano-Suisse elective admission",
    description: "Tests the insurer-specific public Libano-Suisse/GlobeMed hospital workflow.",
    claim: globemedHospital,
    expectedStatus: "DOCUMENTATION COMPLETE",
    expectedScore: 100,
  },
  {
    id: "GM-UNSUPPORTED-001",
    name: "GlobeMed diagnostic imaging - no verified exact checklist",
    description: "ClaimBot must explicitly fall back to manual verification instead of inventing a checklist.",
    claim: globemedUnsupported,
    expectedStatus: "REVIEW REQUIRED",
    expectedScore: null,
  },
  {
    id: "MN-REIMB-001",
    name: "MedNet reimbursement - complete within 60 days",
    description: "Known reimbursement checks pass, but public rule coverage remains partial by design.",
    claim: mednetReimbursement("2026-08-01"),
    expectedStatus: "REVIEW REQUIRED",
  },
  {
    id: "MN-REIMB-002",
    name: "MedNet reimbursement - 90+ day submission",
    description: "The entered Lebanon treatment date is beyond the public 60-day guidance.",
    claim: mednetReimbursement("2026-05-01"),
    expectedStatus: "NOT READY",
    expectedLate: ["Lebanon reimbursement submission window"],
  },
  {
    id: "INT-001",
    name: "Internal/unknown administrator",
    description: "No external checklist exists, so ClaimBot must require manual verification.",
    claim: internalUnknown,
    expectedStatus: "REVIEW REQUIRED",
    expectedScore: null,
  },
  {
    id: "COMMON-001",
    name: "Common intake field missing",
    description: "Missing patient name should block an otherwise complete Nextcare request.",
    claim: missingCommon,
    expectedStatus: "NOT READY",
    expectedMissing: ["Patient full name"],
  },
  {
    id: "MN-DATE-001",
    name: "MedNet reimbursement - future service date",
    description: "A future reimbursement service date must be flagged for human review.",
    claim: mednetFuture,
    expectedStatus: "REVIEW REQUIRED",
    expectedUnresolved: ["Lebanon reimbursement submission window"],
  },
];



function cloneClaim<T>(value: T): T {
  return structuredClone(value);
}

const expandedCases: SelfTestDefinition[] = [];
let expandedClaim: ClaimDraft;

expandedClaim = nextcareMri("no"); expandedClaim.dob = "";
expandedCases.push({ id: "COMMON-002", name: "Common DOB missing", description: "Required patient date of birth is missing.", claim: expandedClaim, expectedStatus: "NOT READY", expectedMissing: ["Date of birth"] });
expandedClaim = nextcareMri("no"); expandedClaim.memberId = "";
expandedCases.push({ id: "COMMON-003", name: "Common member ID missing", description: "Required member/policy identifier is missing.", claim: expandedClaim, expectedStatus: "NOT READY", expectedMissing: ["Insurance member / policy identifier"] });
expandedClaim = nextcareMri("no"); expandedClaim.diagnosisMotive = "";
expandedCases.push({ id: "COMMON-004", name: "Common diagnosis missing", description: "Required clinical motive is missing.", claim: expandedClaim, expectedStatus: "NOT READY", expectedMissing: ["Diagnosis / clinical motive"] });
expandedClaim = nextcareMri("no"); expandedClaim.physicianSignature = false;
expandedCases.push({ id: "COMMON-005", name: "MRI signature missing", description: "Payer-specific physician signature check fails.", claim: expandedClaim, expectedStatus: "NOT READY", expectedMissing: ["Physician signature confirmed"] });
expandedClaim = nextcareMri("no"); expandedClaim.physicianStamp = false;
expandedCases.push({ id: "COMMON-006", name: "MRI stamp missing", description: "Payer-specific physician stamp check fails.", claim: expandedClaim, expectedStatus: "NOT READY", expectedMissing: ["Physician stamp confirmed"] });

for (const [id, procedure, expected] of [
  ["NC-CT-001", "ct_scan", "DOCUMENTATION COMPLETE"],
  ["NC-MRA-001", "mra", "REVIEW REQUIRED"],
  ["NC-XRAY-001", "xray", "DOCUMENTATION COMPLETE"],
  ["NC-US-001", "ultrasound", "DOCUMENTATION COMPLETE"],
  ["NC-LAB-001", "laboratory", "DOCUMENTATION COMPLETE"],
] as const) {
  expandedClaim = nextcareMri(procedure === "mra" ? "yes" : "no");
  expandedClaim.procedureId = procedure;
  expandedCases.push({ id, name: `Nextcare ${procedure} workflow`, description: "Procedure-specific public rule coverage regression.", claim: expandedClaim, expectedStatus: expected });
}

expandedClaim = baseClaim(); expandedClaim.insurerId="sna"; expandedClaim.tpaId="nextcare"; expandedClaim.serviceCategory="physiotherapy"; expandedClaim.procedureId="not_applicable"; expandedClaim.nssfStatus="no"; expandedClaim.numberOfSessions="10"; Object.assign(expandedClaim.documents,{unified_prescription:true,insurance_card:true,patient_id:true});
expandedCases.push({ id:"NC-PHYS-001", name:"Nextcare physiotherapy complete", description:"Non-NSSF physiotherapy request with known documents.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE" });
expandedClaim = cloneClaim(expandedClaim); expandedClaim.nssfStatus="yes"; expandedClaim.documents.nssf_approval=false;
expandedCases.push({ id:"NC-PHYS-002", name:"Nextcare physiotherapy missing NSSF", description:"NSSF prior approval is missing where applicable.", claim:expandedClaim, expectedStatus:"NOT READY" });
expandedClaim = cloneClaim(acuteMedication); expandedClaim.documents.patient_id=false;
expandedCases.push({ id:"NC-MED-003", name:"Acute medication missing ID", description:"Patient ID is deliberately missing.", claim:expandedClaim, expectedStatus:"NOT READY" });
expandedClaim = cloneClaim(chronicMedication); expandedClaim.documents.preauthorization_form=false;
expandedCases.push({ id:"NC-MED-004", name:"Chronic medication missing form", description:"Chronic request form is missing.", claim:expandedClaim, expectedStatus:"NOT READY" });

expandedClaim = baseClaim(); expandedClaim.insurerId="medgulf"; expandedClaim.tpaId="medivisa"; expandedClaim.serviceCategory="hospitalization_emergency"; expandedClaim.procedureId="not_applicable"; expandedClaim.nssfStatus="no"; Object.assign(expandedClaim.documents,{hospitalization_claim_form:true,insurance_card:true,patient_id:true});
expandedCases.push({ id:"MV-ER-001", name:"MediVisa emergency complete", description:"Emergency admission documents are present.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE" });
expandedClaim = cloneClaim(medivisaHospital); expandedClaim.documents.related_results=false;
expandedCases.push({ id:"MV-HOSP-002", name:"MediVisa admission missing results", description:"Related diagnostic results are missing.", claim:expandedClaim, expectedStatus:"NOT READY" });
expandedClaim = medivisaMri("no"); expandedClaim.documents.medical_report=false;
expandedCases.push({ id:"MV-MRI-003", name:"MediVisa MRI missing report", description:"Detailed medical report is missing.", claim:expandedClaim, expectedStatus:"NOT READY" });

expandedClaim = baseClaim(); expandedClaim.insurerId="libano-suisse"; expandedClaim.tpaId="globemed"; expandedClaim.serviceCategory="hospitalization_emergency"; expandedClaim.procedureId="not_applicable"; expandedClaim.nssfStatus="no"; expandedClaim.documents.insurance_card=true; expandedClaim.documents.patient_id=true; expandedClaim.documents.medical_report_mra=true;
expandedCases.push({ id:"GM-ER-001", name:"GlobeMed hot case complete", description:"Libano-Suisse emergency admission workflow.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE" });
expandedClaim = cloneClaim(globemedHospital); expandedClaim.documents.medical_report_mra=false;
expandedCases.push({ id:"GM-HOSP-002", name:"GlobeMed elective missing MRA", description:"Elective MRA is missing.", claim:expandedClaim, expectedStatus:"NOT READY" });
expandedClaim = baseClaim(); expandedClaim.insurerId="other"; expandedClaim.tpaId="globemed"; expandedClaim.requestType="reimbursement"; expandedClaim.serviceCategory="doctor_visit"; expandedClaim.procedureId="not_applicable";
expandedCases.push({ id:"GM-UNSUPPORTED-002", name:"GlobeMed reimbursement unsupported", description:"No exact verified checklist is invented.", claim:expandedClaim, expectedStatus:"REVIEW REQUIRED", expectedScore:null });

expandedCases.push({ id:"MN-REIMB-003", name:"MedNet recent reimbursement", description:"Recent reimbursement remains Review Required because coverage is partial.", claim:mednetReimbursement("2026-08-18"), expectedStatus:"REVIEW REQUIRED" });
expandedClaim = mednetReimbursement("");
expandedCases.push({ id:"MN-REIMB-004", name:"MedNet missing service date", description:"Timing cannot be checked without a service date.", claim:expandedClaim, expectedStatus:"NOT READY", expectedMissing:["Lebanon reimbursement submission window"] });
expandedClaim = mednetReimbursement("2026-09-01");
expandedCases.push({ id:"MN-REIMB-005", name:"MedNet future service date", description:"Future service date remains unresolved.", claim:expandedClaim, expectedStatus:"REVIEW REQUIRED", expectedUnresolved:["Lebanon reimbursement submission window"] });
expandedClaim = baseClaim(); expandedClaim.insurerId="fidelity"; expandedClaim.tpaId="mednet"; expandedClaim.serviceCategory="diagnostic_imaging"; expandedClaim.procedureId="mri";
expandedCases.push({ id:"MN-PREAUTH-001", name:"MedNet preauthorization unsupported", description:"Detailed MedNet preauthorization checklist is unavailable.", claim:expandedClaim, expectedStatus:"REVIEW REQUIRED", expectedScore:null });
expandedClaim = baseClaim(); expandedClaim.insurerId="fidelity"; expandedClaim.tpaId="unknown";
expandedCases.push({ id:"UNKNOWN-001", name:"Fidelity unknown TPA", description:"ClaimBot refuses to guess the administrator.", claim:expandedClaim, expectedStatus:"REVIEW REQUIRED", expectedScore:null });
expandedClaim = baseClaim(); expandedClaim.insurerId="other"; expandedClaim.tpaId="unknown"; expandedClaim.serviceCategory="hospitalization_elective"; expandedClaim.procedureId="not_applicable";
expandedCases.push({ id:"UNKNOWN-002", name:"Other insurer unknown TPA", description:"Unknown administrator fails safely.", claim:expandedClaim, expectedStatus:"REVIEW REQUIRED", expectedScore:null });

// Policy Intelligence coverage matrix.
expandedClaim = nextcareMri("yes"); expandedClaim.policyProfile = cloneClaim(SYNTHETIC_POLICIES[0]); expandedClaim.policyText = expandedClaim.policyProfile.rawText;
expandedCases.push({ id:"POL-COVER-001", name:"Comprehensive policy MRI", description:"Synthetic comprehensive policy should produce an affirmative document-based benefit signal.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE", expectedPolicyStatus:"APPEARS COVERED" });
expandedClaim = baseClaim(); expandedClaim.serviceCategory="physiotherapy"; expandedClaim.procedureId="not_applicable"; expandedClaim.policyProfile=cloneClaim(SYNTHETIC_POLICIES[2]); expandedClaim.policyText=expandedClaim.policyProfile.rawText;
expandedCases.push({ id:"POL-EXCL-001", name:"Explicit physiotherapy exclusion", description:"Synthetic policy explicitly excludes physiotherapy.", claim:expandedClaim, expectedStatus:"NOT READY", expectedPolicyStatus:"APPEARS EXCLUDED" });
expandedClaim = nextcareMri("no"); expandedClaim.policyProfile=cloneClaim(SYNTHETIC_POLICIES[1]); expandedClaim.policyText=expandedClaim.policyProfile.rawText;
expandedCases.push({ id:"POL-LIMIT-001", name:"Limited diagnostic benefit", description:"Structured diagnostic sublimit should surface LIMIT MAY APPLY.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE", expectedPolicyStatus:"LIMIT MAY APPLY" });
expandedClaim = nextcareMri("no"); expandedClaim.policyProfile=cloneClaim(SYNTHETIC_POLICIES[4]); expandedClaim.policyText=expandedClaim.policyProfile.rawText;
expandedCases.push({ id:"POL-CONFLICT-001", name:"Conflicting MRI policy clauses", description:"Conflicting coverage/exclusion evidence must not be silently resolved.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE", expectedPolicyStatus:"POLICY CONFLICT DETECTED" });
expandedClaim = nextcareMri("no");
expandedCases.push({ id:"POL-MISSING-001", name:"No policy supplied", description:"Without policy data coverage remains insufficient.", claim:expandedClaim, expectedStatus:"DOCUMENTATION COMPLETE", expectedPolicyStatus:"POLICY INFORMATION INSUFFICIENT" });

SELF_TESTS.push(...expandedCases);

function includesAll(actual: string[], expected: string[] | undefined) {
  return (expected ?? []).every((label) => actual.includes(label));
}

export function runSelfTests(): SelfTestResult[] {
  return SELF_TESTS.map((test) => {
    const review = validateClaim(test.claim, SELF_TEST_NOW);
    const actualMissing = review.missing.map((item) => item.label);
    const actualUnresolved = review.unresolved.map((item) => item.label);
    const actualLate = review.late.map((item) => item.label);
    const failures: string[] = [];

    if (review.status !== test.expectedStatus) {
      failures.push(`Expected status ${test.expectedStatus}, got ${review.status}.`);
    }
    if (test.expectedScore !== undefined && review.readinessScore !== test.expectedScore) {
      failures.push(`Expected score ${String(test.expectedScore)}, got ${String(review.readinessScore)}.`);
    }
    if (!includesAll(actualMissing, test.expectedMissing)) {
      failures.push(`Expected missing item(s): ${(test.expectedMissing ?? []).join(", ")}.`);
    }
    if (!includesAll(actualUnresolved, test.expectedUnresolved)) {
      failures.push(`Expected unresolved item(s): ${(test.expectedUnresolved ?? []).join(", ")}.`);
    }
    if (!includesAll(actualLate, test.expectedLate)) {
      failures.push(`Expected timing issue(s): ${(test.expectedLate ?? []).join(", ")}.`);
    }
    if (test.expectedPolicyStatus && review.policyAssessment.status !== test.expectedPolicyStatus) {
      failures.push(`Expected policy status ${test.expectedPolicyStatus}, got ${review.policyAssessment.status}.`);
    }

    return {
      ...test,
      passed: failures.length === 0,
      actualStatus: review.status,
      actualScore: review.readinessScore,
      actualMissing,
      actualUnresolved,
      actualLate,
      actualPolicyStatus: review.policyAssessment.status,
      failures,
    };
  });
}
