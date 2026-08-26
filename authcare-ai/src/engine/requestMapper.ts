import { insurerById, procedureById, serviceById, tpaById } from "@/data/insuranceData";
import type { AuthRequest, Readiness, Status } from "@/types/auth";
import type { ClaimDraft, ReviewResult } from "@/types/claim";

function formatDisplayDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function displayDob(value: string) {
  if (!value) return "Not entered";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function serviceLabel(claim: ClaimDraft) {
  const service = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
  if (claim.serviceCategory !== "diagnostic_imaging") return service;
  const procedure = claim.procedureId === "other"
    ? claim.procedureOther || "Other procedure"
    : procedureById(claim.procedureId)?.label ?? claim.procedureId;
  return `${service} - ${procedure}`;
}

function readinessFor(review: ReviewResult): Readiness {
  if (review.status === "DOCUMENTATION COMPLETE") return "Ready";
  if (review.status === "NOT READY") return "Not Ready";
  return "Needs Review";
}

function statusFor(review: ReviewResult): Status {
  return review.status === "DOCUMENTATION COMPLETE" ? "Documentation Complete" : "In Review";
}

export function claimReviewToRequest(
  claim: ClaimDraft,
  review: ReviewResult,
  id = Date.now(),
  now = new Date(),
): AuthRequest {
  return {
    id,
    patient: claim.patientName || "Unnamed synthetic patient",
    mrn: claim.mrn || `REQ-${id}`,
    dob: displayDob(claim.dob),
    insurance: insurerById(claim.insurerId)?.name ?? claim.insurerId,
    tpa: tpaById(claim.tpaId)?.name ?? claim.tpaId,
    service: serviceLabel(claim),
    diagnosis: claim.diagnosisMotive || "Not entered",
    status: statusFor(review),
    readiness: readinessFor(review),
    readinessScore: review.readinessScore,
    missingItems: [
      ...review.missing.map((item) => item.label),
      ...review.late.map((item) => item.label),
      ...review.unresolved.map((item) => item.label),
    ].slice(0, 8),
    sourceCoverage: review.ruleCoverageLabel,
    updated: formatDisplayDate(now),
    provider: claim.providerName || claim.physicianName || "Provider not entered",
  };
}
