import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  ExternalLink,
  FlaskConical,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { FieldLabel, SelectInput, TextInput } from "@/components/common/FormControls";
import { DEMO_USER } from "@/data/mockData";
import { getSource, SOURCES } from "@/data/sources";
import { backendHealth } from "@/engine/backendClient";
import { RULE_SETS } from "@/engine/ruleSets";
import { SELF_TESTS, runSelfTests, type SelfTestResult } from "@/tests/scenarios";
import type { TpaId } from "@/types/claim";

interface SettingsProps {
  storedRequestCount: number;
  remoteRequestCount: number;
  backendMode: boolean;
  onClearLocalHistory: () => void;
  onClearBackendHistory: () => Promise<string | null>;
}

type BackendHealth = Awaited<ReturnType<typeof backendHealth>>;

export function Settings({
  storedRequestCount,
  remoteRequestCount,
  backendMode,
  onClearLocalHistory,
  onClearBackendHistory,
}: SettingsProps) {
  const [tests, setTests] = useState<SelfTestResult[] | null>(null);
  const [health, setHealth] = useState<BackendHealth>(null);
  const [remoteAction, setRemoteAction] = useState("");
  const passed = tests?.filter((test) => test.passed).length ?? 0;
  const coverageRows = useMemo(() => buildCoverageRows(), []);
  const privacySource = getSource("lebanon_law_81");

  useEffect(() => {
    let active = true;
    if (!backendMode) return () => { active = false; };
    void backendHealth().then((result) => {
      if (active) setHealth(result);
    });
    return () => { active = false; };
  }, [backendMode]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-[#1A5FA8]" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Workspace Profile</h2>
            <p className="text-xs text-gray-500">
              {backendMode
                ? "Persistent backend authentication is enabled. Profile editing remains presentation-only in this prototype."
                : "Local demo mode is active. Configure VITE_API_BASE_URL to use persistent backend authentication."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Display name</FieldLabel>
            <TextInput defaultValue={DEMO_USER.name} />
          </div>
          <div>
            <FieldLabel>Work email</FieldLabel>
            <TextInput defaultValue={DEMO_USER.email} />
          </div>
          <div>
            <FieldLabel>Organization</FieldLabel>
            <TextInput defaultValue={DEMO_USER.organization} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <SelectInput
              options={["Insurance coordinator", "Clinician", "Hospital admissions", "Billing team", "Admin"]}
              defaultValue="Insurance coordinator"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Payer / TPA Rule Coverage</h2>
              <p className="text-xs text-gray-500">Only public, source-backed rules are encoded. Unsupported combinations deliberately return Review Required.</p>
            </div>
          </div>
          <Badge className="bg-slate-100 text-slate-700">{SOURCES.filter((source) => source.organization !== "ClaimBot").length} external sources registered</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 border-b border-gray-100">
              <tr>
                {['Administrator', 'Rule coverage', 'Scored rules', 'Workflow notes', 'Prototype behavior'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coverageRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{row.name}</td>
                  <td className="px-5 py-3.5"><CoverageBadge coverage={row.coverage} /></td>
                  <td className="px-5 py-3.5 text-gray-600">{row.scored}</td>
                  <td className="px-5 py-3.5 text-gray-600">{row.info}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[320px]">{row.behavior}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">QA Self-Test</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                Runs the existing {SELF_TESTS.length} synthetic claim/policy regression scenarios through the same deterministic <code className="font-mono">validateClaim()</code> engine. The suite is intentionally frozen unless a real defect requires a regression fix.
              </p>
            </div>
          </div>
          <Button onClick={() => setTests(runSelfTests())} icon={<RefreshCw className="w-4 h-4" />} className="flex-shrink-0">
            Run Existing QA Suite
          </Button>
        </div>

        {tests && (
          <div className="mt-5">
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${passed === tests.length ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              {passed === tests.length ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
              <div>
                <p className={`font-bold ${passed === tests.length ? "text-emerald-900" : "text-red-900"}`}>{passed}/{tests.length} tests passed</p>
                <p className={`text-xs mt-0.5 ${passed === tests.length ? "text-emerald-700" : "text-red-700"}`}>
                  {passed === tests.length
                    ? "All expected statuses and targeted missing/conditional/timing rules matched."
                    : "At least one existing regression scenario no longer matches the expected engine behavior. Do not demo until fixed."}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {tests.map((test) => (
                <div key={test.id} className={`rounded-xl border p-3.5 ${test.passed ? "border-gray-100 bg-gray-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex items-start gap-3">
                    {test.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400">{test.id}</span>
                        <p className="text-sm font-semibold text-gray-800">{test.name}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                        <Badge className="bg-white text-gray-600">Expected: {test.expectedStatus}</Badge>
                        <Badge className="bg-white text-gray-600">Actual: {test.actualStatus}</Badge>
                        <Badge className="bg-white text-gray-600">Score: {test.actualScore == null ? "—" : `${test.actualScore}%`}</Badge>
                      </div>
                      {!test.passed && test.failures.length > 0 && (
                        <ul className="mt-2 list-disc list-inside text-xs text-red-700 space-y-0.5">
                          {test.failures.map((failure) => <li key={failure}>{failure}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SettingsCard
          icon={<Building2 className="w-4 h-4 text-[#1A5FA8]" />}
          title="Local Request History"
          description={`${storedRequestCount} locally created request${storedRequestCount === 1 ? "" : "s"} are stored in this browser. Use synthetic/de-identified data in local prototype mode.`}
          action={storedRequestCount > 0 ? (
            <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onClearLocalHistory}>Clear Local History</Button>
          ) : undefined}
        />
        <SettingsCard
          icon={<Database className="w-4 h-4 text-indigo-600" />}
          title="Persistent Backend"
          description={backendMode
            ? `${health?.status === "ok" ? "Connected" : "Configured"}. ${health ? `Database: ${health.database}. Qdrant: ${health.qdrant_configured ? "configured" : "database fallback"}.` : "Health status is not currently available."} Remote frontend sync is de-identified by default.`
            : "Not configured. The app continues to work locally; set VITE_API_BASE_URL when you want authenticated persistence."}
          action={backendMode && remoteRequestCount > 0 ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={async () => {
                setRemoteAction("Clearing...");
                const error = await onClearBackendHistory();
                setRemoteAction(error ?? "Backend history cleared.");
              }}
            >
              Clear De-identified Backend History
            </Button>
          ) : undefined}
          footer={remoteAction || (backendMode ? `${remoteRequestCount} remote request${remoteRequestCount === 1 ? "" : "s"} loaded for this session.` : undefined)}
        />
        <SettingsCard
          icon={<Lock className="w-4 h-4 text-slate-600" />}
          title="Authentication & Roles"
          description={backendMode
            ? "Backend mode uses hashed passwords, expiring signed sessions, and role checks for privileged knowledge/audit operations. Tokens are held in sessionStorage, not localStorage."
            : "The local-only login is a demo gate, not security. Persistent authentication becomes active only when the optional backend is configured."}
        />
        <SettingsCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          title="Patient Data Safety"
          description="Default posture remains synthetic/de-identified data only. Backend PHI storage is disabled unless explicitly enabled with an encryption key after privacy/security review; the frontend's optional remote sync removes patient name, MRN and DOB."
          footer={privacySource?.url ? (
            <a href={privacySource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A5FA8] hover:underline">
              Lebanon Law 81/2018 context <ExternalLink className="w-3 h-3" />
            </a>
          ) : "Privacy controls are engineering safeguards, not a legal compliance determination."}
        />
      </div>
    </div>
  );
}

function buildCoverageRows() {
  const ids: TpaId[] = ["nextcare", "medivisa", "globemed", "mednet", "internal"];
  const descriptions: Record<TpaId, { name: string; coverage: "verified" | "partial" | "unavailable"; behavior: string }> = {
    nextcare: { name: "Nextcare", coverage: "verified", behavior: "Broad verified Lebanon pre-authorization and reimbursement guidance across the supported service families." },
    medivisa: { name: "MediVisa", coverage: "verified", behavior: "Verified ambulatory/NSSF, chronic medication, elective admission, and emergency admission workflows." },
    globemed: { name: "GlobeMed Lebanon", coverage: "partial", behavior: "Public CareGate/FIT workflow plus verified Libano-Suisse admission requirements; unsupported service-specific checklists remain manual." },
    mednet: { name: "MedNet Liban", coverage: "partial", behavior: "Verified reimbursement documents, physiotherapy referral, and 60-day Lebanon timing; public pre-authorization material is not a full service-by-service checklist." },
    internal: { name: "Internal / unknown", coverage: "unavailable", behavior: "Only ClaimBot intake completeness is checked; manual payer verification is mandatory." },
    unknown: { name: "Unknown", coverage: "unavailable", behavior: "Manual payer verification is mandatory." },
  };

  return ids.map((id) => {
    const rules = RULE_SETS[id].rules;
    return {
      id,
      ...descriptions[id],
      scored: rules.filter((rule) => rule.kind !== "workflow" && rule.requirementLevel !== "informational").length,
      info: rules.filter((rule) => rule.kind === "workflow" || rule.requirementLevel === "informational").length,
    };
  });
}

function CoverageBadge({ coverage }: { coverage: "verified" | "partial" | "unavailable" }) {
  const style = coverage === "verified"
    ? "bg-emerald-100 text-emerald-700"
    : coverage === "partial"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";
  return <Badge className={style}>{coverage.toUpperCase()}</Badge>;
}

function SettingsCard({
  icon,
  title,
  description,
  action,
  footer,
}: {
  icon: JSX.Element;
  title: string;
  description: string;
  action?: JSX.Element;
  footer?: JSX.Element | string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">{icon}</div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
      {footer && <div className="mt-3 text-xs text-gray-500">{footer}</div>}
    </Card>
  );
}
