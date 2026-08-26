import type { AuthRequest, RequestComment, SupportingDocument } from "@/types/auth";

export const DEMO_USER = {
  name: "Dr. Maya Demo",
  initials: "MD",
  email: "demo@claimbot.example",
  organization: "Beirut Demo Clinic",
};

export const INITIAL_REQUESTS: AuthRequest[] = [
  {
    id: 1,
    patient: "Demo Patient Alpha",
    mrn: "DEMO-LB-20481",
    dob: "12/05/1985",
    insurance: "SNA",
    tpa: "Nextcare",
    service: "Lumbar Spine MRI",
    diagnosis: "Persistent low back pain",
    status: "In Review",
    readiness: "Not Ready",
    readinessScore: 80,
    missingItems: ["Physician stamp confirmed", "Applicable NSSF prior approval"],
    sourceCoverage: "Nextcare: verified public rule pack (6 applicable checks)",
    updated: "Aug 19, 2026",
    provider: DEMO_USER.name,
  },
  {
    id: 2,
    patient: "Demo Patient Bravo",
    mrn: "DEMO-LB-18734",
    dob: "03/09/1974",
    insurance: "Libano-Suisse",
    tpa: "GlobeMed Lebanon",
    service: "Elective Hospital Admission",
    diagnosis: "Synthetic demo diagnosis",
    status: "In Review",
    readiness: "Needs Review",
    readinessScore: 91,
    missingItems: ["NSSF status verification"],
    sourceCoverage: "GlobeMed Lebanon: verified public rule pack (7 applicable checks)",
    updated: "Aug 18, 2026",
    provider: "Dr. Karim Demo",
  },
  {
    id: 3,
    patient: "Demo Patient Charlie",
    mrn: "DEMO-LB-31205",
    dob: "22/11/1979",
    insurance: "Fidelity Insurance",
    tpa: "MedNet Liban",
    service: "Reimbursement - Doctor Visit",
    diagnosis: "Synthetic demo diagnosis",
    status: "In Review",
    readiness: "Not Ready",
    readinessScore: 75,
    missingItems: ["Full and detailed medical report", "Breakdown of receipts / payments"],
    sourceCoverage: "MedNet Liban: partial public rule coverage (5 applicable checks)",
    updated: "Aug 18, 2026",
    provider: "Dr. Rana Demo",
  },
];

export const FORM_STEPS = [
  "Patient",
  "Coverage",
  "Service",
  "Documentation",
  "Review",
];

export const READINESS_LOADING_STEPS = [
  "Loading insurer, TPA, and policy context...",
  "Matching the request to verified public rule packs...",
  "Checking required fields and documents...",
  "Retrieving relevant policy / Table of Benefits clauses...",
  "Assessing exclusions, limits, NSSF and authorization conditions...",
  "Preparing the combined ClaimBot assessment...",
];

export const REQUEST_DOCUMENTS: SupportingDocument[] = [
  { name: "Demo_Insurance_Card.pdf", size: "420 KB", date: "Aug 19, 2026" },
  { name: "Demo_Physician_Request.pdf", size: "610 KB", date: "Aug 19, 2026" },
  { name: "Demo_Patient_ID.pdf", size: "380 KB", date: "Aug 19, 2026" },
];

export const REQUEST_COMMENTS: RequestComment[] = [
  {
    author: DEMO_USER.name,
    time: "Aug 19, 10:20 AM",
    text: "Synthetic demo note: physician documentation should be checked before payer submission.",
  },
  {
    author: "ClaimBot Demo Admin",
    time: "Aug 19, 10:35 AM",
    text: "Prototype note: apparent policy coverage may be assessed from supplied evidence, while live patient-specific payer verification remains separate.",
  },
];
