import { AlertTriangle, CheckCircle2, ChevronLeft, ClipboardCheck, ShieldCheck } from "lucide-react";
import { ReadinessBadge, StatusBadge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AuthRequest } from "@/types/auth";

interface RequestDetailsProps {
  request: AuthRequest;
  onBack: () => void;
}

export function RequestDetails({ request, onBack }: RequestDetailsProps) {
  const missing = request.missingItems ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <Card className="p-5 mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {getInitials(request.patient)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{request.patient}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="font-mono">{request.mrn}</span>
                <span>|</span>
                <span>DOB: {request.dob}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
            <ReadinessBadge readiness={request.readiness} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Request Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ["Service Requested", request.service],
              ["Diagnosis / motive", request.diagnosis],
              ["Insurance", request.insurance],
              ["TPA / Administrator", request.tpa],
              ["Provider", request.provider],
              ["Last Updated", request.updated],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-4 h-4 text-[#1A5FA8]" />
            <h3 className="font-semibold text-gray-900 text-sm">Readiness</h3>
          </div>
          <div className="text-4xl font-bold text-gray-900">
            {request.readinessScore == null ? "—" : `${request.readinessScore}%`}
          </div>
          <p className="text-xs text-gray-500 mt-1">Known scoreable documentation checks.</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Rule coverage</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{request.sourceCoverage ?? "Not recorded"}</p>
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          {missing.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          <h3 className="font-semibold text-gray-900 text-sm">Items Requiring Attention</h3>
        </div>
        {missing.length > 0 ? (
          <div className="space-y-2">
            {missing.map((item) => (
              <div key={item} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-amber-900">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No unresolved items were stored with this summary.</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#1A5FA8] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Prototype limitation</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Dashboard history stores a summary of the assessment run, not a complete medical record. Any policy assessment is document-based; ClaimBot does not track a live insurer eligibility, utilization, authorization, or adjudication decision.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 3)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
