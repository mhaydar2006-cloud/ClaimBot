import { AlertCircle, CheckCircle2, ChevronRight, ClipboardList, Plus, ShieldCheck } from "lucide-react";
import { Badge, ReadinessBadge, StatusBadge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { DEMO_USER } from "@/data/mockData";
import type { AuthRequest } from "@/types/auth";

interface DashboardProps {
  requests: AuthRequest[];
  onNewAuth: () => void;
  onViewRequest: (request: AuthRequest) => void;
}

export function Dashboard({ requests, onNewAuth, onViewRequest }: DashboardProps) {
  if (requests.length === 0) {
    return <EmptyRequestsState onNew={onNewAuth} />;
  }

  const notReadyRequest = requests.find((request) => request.readiness === "Not Ready");
  const readyCount = requests.filter((request) => request.readiness === "Ready").length;
  const reviewCount = requests.filter((request) => request.readiness !== "Ready").length;
  const averageScore = averageKnownScore(requests);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Good day, {DEMO_USER.name}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {formatToday()} | {DEMO_USER.organization}
          </p>
        </div>
        <Button onClick={onNewAuth} size="lg" icon={<Plus className="w-4 h-4" />}>
          New Request
        </Button>
      </div>

      {notReadyRequest && (
        <div className="rounded-xl bg-gradient-to-r from-[#0B1F3A] to-[#1A3A6A] p-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              Readiness Alert: {notReadyRequest.patient}&apos;s request has unresolved documentation
            </p>
            <p className="text-blue-200 text-xs mt-0.5">
              {notReadyRequest.missingItems?.slice(0, 2).join(" • ") || "Open the request to review the missing requirements."}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onViewRequest(notReadyRequest)}>
            View Request
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Requests in workspace" value={`${requests.length}`} tone="blue" note="Synthetic/local prototype history" />
        <MetricCard label="Documentation ready" value={`${readyCount}`} tone="emerald" note="Ready under encoded rules only" />
        <MetricCard label="Need attention" value={`${reviewCount}`} tone="amber" note="Not Ready or Review Required" />
        <MetricCard label="Avg. known readiness" value={averageScore === null ? "—" : `${averageScore}%`} tone="slate" note="Excludes unsupported rule packs" />
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Recent Claim Readiness Requests</h3>
            <p className="text-xs text-gray-400 mt-0.5">New checks are saved locally in this browser for the prototype.</p>
          </div>
          <Badge className="bg-blue-50 text-blue-700">Synthetic / de-identified data only</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Patient", "Insurance / TPA", "Requested Service", "Status", "Readiness", "Score", "Last Updated", ""].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  onClick={() => onViewRequest(request)}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{request.patient}</div>
                    <div className="text-xs text-gray-400 mt-0.5 font-mono">{request.mrn}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                    <div>{request.insurance}</div>
                    <div className="text-xs text-gray-400">{request.tpa}</div>
                  </td>
                  <td className="px-5 py-3.5 max-w-[260px]">
                    <span className="text-gray-700 truncate block" title={request.service}>{request.service}</span>
                    <span className="text-xs text-gray-400 truncate block">{request.diagnosis}</span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={request.status} /></td>
                  <td className="px-5 py-3.5"><ReadinessBadge readiness={request.readiness} /></td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-gray-700">{request.readinessScore == null ? "—" : `${request.readinessScore}%`}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{request.updated}</td>
                  <td className="px-5 py-3.5">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded" aria-label={`Open ${request.patient}`}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Source-backed rule engine</p>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Nextcare and MediVisa have broad verified public workflows encoded. Libano-Suisse/GlobeMed admissions and MedNet reimbursement are supported where public documentation is sufficient.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Policy-aware, not payer approval prediction</p>
            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
              ClaimBot can assess apparent coverage from supplied policy evidence, but it does not predict payer approval or independently determine live eligibility or medical necessity. Unsupported combinations return Review Required instead of invented rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone: "blue" | "amber" | "emerald" | "slate";
  note: string;
}) {
  const styles = {
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <Badge className={styles[tone]}>MVP</Badge>
      </div>
      <div className="text-3xl font-bold text-gray-900 mt-3">{value}</div>
      <p className="text-[11px] text-gray-400 mt-1.5">{note}</p>
    </Card>
  );
}

function EmptyRequestsState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
        <ClipboardList className="w-10 h-10 text-blue-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No requests yet</h3>
      <p className="text-gray-500 text-sm max-w-sm mb-6">
        Start a synthetic request and run it through ClaimBot&apos;s deterministic documentation-readiness engine.
      </p>
      <Button onClick={onNew} icon={<Plus className="w-4 h-4" />} size="lg">Create First Request</Button>
    </div>
  );
}

function averageKnownScore(requests: AuthRequest[]) {
  const scores = requests.map((request) => request.readinessScore).filter((score): score is number => typeof score === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}
