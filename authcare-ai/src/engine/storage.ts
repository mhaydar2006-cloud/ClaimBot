import type { AuthRequest } from "@/types/auth";

const STORAGE_KEY = "claimbot-request-history-v1";

export function loadStoredRequests(): AuthRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuthRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredRequests(requests: AuthRequest[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests.slice(0, 25)));
  } catch {
    // Storage is best-effort in this prototype.
  }
}

export function clearStoredRequests() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in prototype mode.
  }
}
