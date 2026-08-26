export type Screen =
  | "login"
  | "dashboard"
  | "new-auth"
  | "readiness-loading"
  | "readiness-review"
  | "output"
  | "request-detail"
  | "denial-analysis"
  | "settings";

export type NavSection = "dashboard" | "new-auth" | "denial-analysis" | "settings";

export type Status = "Draft" | "In Review" | "Prepared" | "Documentation Complete" | "Returned";
export type Readiness = "Ready" | "Needs Review" | "Not Ready";

export interface AuthRequest {
  id: number;
  patient: string;
  mrn: string;
  dob: string;
  insurance: string;
  tpa: string;
  service: string;
  diagnosis: string;
  status: Status;
  readiness: Readiness;
  readinessScore?: number | null;
  missingItems?: string[];
  sourceCoverage?: string;
  updated: string;
  provider: string;
}

export interface SupportingDocument {
  name: string;
  type?: string;
  size?: string;
  date?: string;
}

export interface RequestComment {
  author: string;
  time: string;
  text: string;
}

export interface GeneratedDocumentField {
  label: string;
  value: string;
}
