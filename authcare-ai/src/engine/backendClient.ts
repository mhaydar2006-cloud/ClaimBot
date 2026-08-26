import type { AuthRequest } from "@/types/auth";
import type { ClaimDraft, ReviewResult } from "@/types/claim";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const TOKEN_KEY = "claimbot-backend-session-v1";

export function backendEnabled() {
  return API_BASE.length > 0;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function clearBackendSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!backendEnabled()) throw new Error("Persistent backend is not configured.");
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.detail === "string" ? payload.detail : `Backend request failed (${response.status}).`);
  return payload as T;
}

export async function loginBackend(email: string, password: string) {
  const result = await api<{ access_token: string; user: { id: number; email: string; role: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  window.sessionStorage.setItem(TOKEN_KEY, result.access_token);
  return result.user;
}

export async function backendHealth() {
  if (!backendEnabled()) return null;
  try {
    return await api<{ status: string; database: string; bootstrap_required: boolean; security: Record<string, boolean>; qdrant_configured: boolean }>("/health");
  } catch {
    return null;
  }
}

export async function clearBackendRequests() {
  if (!backendEnabled() || !getToken()) return false;
  await api("/requests", { method: "DELETE" });
  return true;
}

export async function loadBackendRequests(): Promise<AuthRequest[]> {
  if (!backendEnabled() || !getToken()) return [];
  const rows = await api<Array<{ payload: { dashboardRequest?: AuthRequest } }>>("/requests?limit=25");
  return rows.map((row) => row.payload?.dashboardRequest).filter((item): item is AuthRequest => Boolean(item));
}

function deidentifiedRemotePayload(request: AuthRequest, claim: ClaimDraft, review: ReviewResult) {
  const dashboardRequest: AuthRequest = {
    ...request,
    patient: `De-identified ${request.id}`,
    mrn: "",
    dob: "",
  };
  return {
    dashboardRequest,
    claimContext: {
      insurerId: claim.insurerId,
      tpaId: claim.tpaId,
      requestType: claim.requestType,
      serviceCategory: claim.serviceCategory,
      procedureId: claim.procedureId,
      nssfStatus: claim.nssfStatus,
      providerNetworkStatus: claim.providerNetworkStatus,
      policySourceMode: claim.policyProfile.sourceMode,
    },
    reviewSummary: {
      status: review.status,
      readinessScore: review.readinessScore,
      overallRecommendation: review.overallRecommendation,
      policyStatus: review.policyAssessment.status,
      sourceIds: review.sourceIds,
    },
  };
}

export async function syncAssessmentToBackend(request: AuthRequest, claim: ClaimDraft, review: ReviewResult) {
  if (!backendEnabled() || !getToken()) return false;
  await api("/requests", {
    method: "POST",
    body: JSON.stringify({
      external_id: String(request.id),
      contains_phi: false,
      patient_name: "",
      dob: "",
      member_id: "",
      mrn: "",
      insurer_slug: claim.insurerId,
      tpa_slug: claim.tpaId,
      service_category: claim.serviceCategory,
      request_type: claim.requestType,
      payload: deidentifiedRemotePayload(request, claim, review),
      assessment: {
        status: review.status,
        readinessScore: review.readinessScore,
        overallRecommendation: review.overallRecommendation,
        policyAssessment: review.policyAssessment,
        dimensions: review.dimensions,
        publicKnowledge: review.publicKnowledge,
        sourceIds: review.sourceIds,
      },
    }),
  });
  return true;
}
