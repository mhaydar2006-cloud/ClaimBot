import { useCallback, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { createEmptyClaim } from "@/data/claimDefaults";
import { DEMO_USER, INITIAL_REQUESTS } from "@/data/mockData";
import {
  backendEnabled,
  clearBackendRequests,
  clearBackendSession,
  loadBackendRequests,
  loginBackend,
  syncAssessmentToBackend,
} from "@/engine/backendClient";
import { claimReviewToRequest } from "@/engine/requestMapper";
import { clearStoredRequests, loadStoredRequests, saveStoredRequests } from "@/engine/storage";
import { validateClaim } from "@/engine/validator";
import { ReadinessLoading } from "@/pages/AILoading";
import { AIReviewResults } from "@/pages/AIReviewResults";
import { Dashboard } from "@/pages/Dashboard";
import { DenialAnalysis } from "@/pages/DenialAnalysis";
import { GeneratedDocument } from "@/pages/GeneratedDocument";
import { Login } from "@/pages/Login";
import { NewAuthorization } from "@/pages/NewAuthorization";
import { RequestDetails } from "@/pages/RequestDetails";
import { Settings } from "@/pages/Settings";
import type { AuthRequest, NavSection, Screen } from "@/types/auth";
import type { ClaimDraft, ReviewResult } from "@/types/claim";

export default function App() {
  const persistentBackend = backendEnabled();
  const [screen, setScreen] = useState<Screen>("login");
  const [activeNav, setActiveNav] = useState<NavSection>("dashboard");
  const [selectedRequest, setSelectedRequest] = useState<AuthRequest | null>(null);
  const [claimDraft, setClaimDraft] = useState<ClaimDraft>(() => createEmptyClaim());
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [storedRequests, setStoredRequests] = useState<AuthRequest[]>(() => loadStoredRequests());
  const [remoteRequests, setRemoteRequests] = useState<AuthRequest[]>([]);

  const requests = useMemo(
    () => dedupeRequests([...storedRequests, ...remoteRequests, ...INITIAL_REQUESTS]),
    [storedRequests, remoteRequests],
  );

  const goToDashboard = useCallback(() => {
    setActiveNav("dashboard");
    setScreen("dashboard");
  }, []);

  const handleLogin = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!persistentBackend) {
      goToDashboard();
      return null;
    }
    try {
      await loginBackend(email, password);
      const remote = await loadBackendRequests();
      setRemoteRequests(remote);
      goToDashboard();
      return null;
    } catch (error) {
      clearBackendSession();
      return error instanceof Error ? error.message : "Unable to sign in to the ClaimBot backend.";
    }
  }, [goToDashboard, persistentBackend]);

  const goToNewAuthorization = useCallback(() => {
    setClaimDraft(createEmptyClaim());
    setReviewResult(null);
    setSelectedRequest(null);
    setActiveNav("new-auth");
    setScreen("new-auth");
  }, []);

  const editCurrentClaim = useCallback(() => {
    setActiveNav("new-auth");
    setScreen("new-auth");
  }, []);

  const handleNav = (section: NavSection, targetScreen: Screen) => {
    if (section === "new-auth") {
      goToNewAuthorization();
      return;
    }
    setActiveNav(section);
    setScreen(targetScreen);
  };

  const handleLogout = () => {
    clearBackendSession();
    setRemoteRequests([]);
    setSelectedRequest(null);
    setReviewResult(null);
    setClaimDraft(createEmptyClaim());
    setActiveNav("dashboard");
    setScreen("login");
  };

  const handleRunReview = (claim: ClaimDraft) => {
    const review = validateClaim(claim);
    setClaimDraft(claim);
    setReviewResult(review);

    const request = claimReviewToRequest(claim, review);
    setStoredRequests((current) => {
      const next = [request, ...current].slice(0, 25);
      saveStoredRequests(next);
      return next;
    });

    if (persistentBackend) {
      void syncAssessmentToBackend(request, claim, review).catch(() => {
        // The deterministic assessment remains usable if optional persistence is unavailable.
      });
    }

    setScreen("readiness-loading");
  };

  const handleClearLocalHistory = () => {
    clearStoredRequests();
    setStoredRequests([]);
  };

  const handleClearBackendHistory = async (): Promise<string | null> => {
    if (!persistentBackend) return null;
    try {
      await clearBackendRequests();
      setRemoteRequests([]);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Unable to clear backend history.";
    }
  };

  const topBar = getTopBarProps(screen, activeNav, selectedRequest, goToNewAuthorization);

  if (screen === "login") {
    return <Login onLogin={handleLogin} backendMode={persistentBackend} />;
  }

  return (
    <div className="flex h-screen bg-[#EEF3FA] overflow-hidden">
      <Sidebar active={activeNav} onNav={handleNav} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar title={topBar.title} subtitle={topBar.subtitle} onNew={topBar.onNew} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden print:p-0 print:overflow-visible">
          {renderScreen()}
        </main>
      </div>
    </div>
  );

  function renderScreen() {
    switch (screen) {
      case "new-auth":
        return (
          <NewAuthorization
            initialClaim={claimDraft}
            onRunReview={handleRunReview}
            onBack={goToDashboard}
          />
        );
      case "readiness-loading":
        return <ReadinessLoading onComplete={() => setScreen("readiness-review")} />;
      case "readiness-review":
        if (!reviewResult) {
          return (
            <NewAuthorization
              initialClaim={claimDraft}
              onRunReview={handleRunReview}
              onBack={goToDashboard}
            />
          );
        }
        return (
          <AIReviewResults
            claim={claimDraft}
            review={reviewResult}
            onGenerate={() => setScreen("output")}
            onBack={editCurrentClaim}
          />
        );
      case "output":
        if (!reviewResult) {
          return (
            <NewAuthorization
              initialClaim={claimDraft}
              onRunReview={handleRunReview}
              onBack={goToDashboard}
            />
          );
        }
        return (
          <GeneratedDocument
            claim={claimDraft}
            review={reviewResult}
            onBack={() => setScreen("readiness-review")}
            onDone={goToDashboard}
          />
        );
      case "request-detail":
        if (!selectedRequest) {
          return <Dashboard requests={requests} onNewAuth={goToNewAuthorization} onViewRequest={openRequest} />;
        }
        return <RequestDetails request={selectedRequest} onBack={goToDashboard} />;
      case "denial-analysis":
        return <DenialAnalysis />;
      case "settings":
        return (
          <Settings
            storedRequestCount={storedRequests.length}
            remoteRequestCount={remoteRequests.length}
            backendMode={persistentBackend}
            onClearLocalHistory={handleClearLocalHistory}
            onClearBackendHistory={handleClearBackendHistory}
          />
        );
      case "dashboard":
      default:
        return <Dashboard requests={requests} onNewAuth={goToNewAuthorization} onViewRequest={openRequest} />;
    }
  }

  function openRequest(request: AuthRequest) {
    setSelectedRequest(request);
    setActiveNav("dashboard");
    setScreen("request-detail");
  }
}

function dedupeRequests(requests: AuthRequest[]) {
  const seen = new Set<number>();
  return requests.filter((request) => {
    if (seen.has(request.id)) return false;
    seen.add(request.id);
    return true;
  });
}

function getTopBarProps(
  screen: Screen,
  activeNav: NavSection,
  selectedRequest: AuthRequest | null,
  onNew: () => void,
) {
  switch (screen) {
    case "new-auth":
      return { title: "New Request", subtitle: "Prepare a Lebanese insurance request for readiness review" };
    case "readiness-loading":
      return { title: "Readiness Review", subtitle: "Running deterministic source-backed checks..." };
    case "readiness-review":
      return { title: "Readiness Review Results", subtitle: "Missing, conditional, and completed requirements" };
    case "output":
      return { title: "Assessment Report", subtitle: "ClaimBot provider-side decision-support report" };
    case "request-detail":
      return { title: selectedRequest?.patient ?? "Request Detail", subtitle: selectedRequest?.mrn };
    case "denial-analysis":
      return { title: "Analyze Denial", subtitle: "Classify, compare, and prepare a reconsideration package" };
    case "settings":
      return { title: "Settings & QA", subtitle: `${DEMO_USER.organization} prototype controls` };
    case "dashboard":
    default:
      return {
        title: activeNav === "settings" ? "Settings & QA" : "Dashboard",
        subtitle: `${DEMO_USER.organization} - Lebanese Claim Readiness Workspace`,
        onNew,
      };
  }
}
