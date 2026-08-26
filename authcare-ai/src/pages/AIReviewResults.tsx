import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { insurerById, procedureById, serviceById, tpaById } from "@/data/insuranceData";
import { getSource } from "@/data/sources";
import type { ClaimDraft, EvaluatedRequirement, ReviewResult } from "@/types/claim";

interface AIReviewResultsProps {
  claim: ClaimDraft;
  review: ReviewResult;
  onGenerate: () => void;
  onBack: () => void;
}

export function AIReviewResults({ claim, review, onGenerate, onBack }: AIReviewResultsProps) {
  const patientLine = [
    claim.patientName || "Unnamed patient",
    serviceLabel(claim),
    `${insurerById(claim.insurerId)?.name ?? claim.insurerId} / ${tpaById(claim.tpaId)?.name ?? claim.tpaId}`,
  ].join(" | ");

  const score = review.readinessScore;
  const scoreStroke = score === null ? 0 : score;
  const tone = statusTone(review.status);

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Form
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5FA8] to-[#0B3D78] flex items-center justify-center">
          <ListChecks className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Claim Readiness Results</h2>
          <p className="text-xs text-gray-500">{patientLine}</p>
        </div>
        <span className="sm:ml-auto text-xs text-gray-400">Source-backed prototype review</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Known-Requirement Readiness</p>
          <div className="flex flex-col items-center py-2">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={tone.stroke}
                  strokeWidth="3"
                  strokeDasharray={`${scoreStroke} ${100 - scoreStroke}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{score === null ? "N/A" : score}</span>
                {score !== null && <span className="text-[10px] text-gray-400">/100</span>}
              </div>
            </div>
            <Badge className={`mt-3 text-sm px-3 py-1 ${tone.badge}`}>{review.status}</Badge>
          </div>
          <div className="mt-3 space-y-1.5">
            <ReviewStat label="Applicable checks" value={`${review.applicableRuleCount}`} />
            <ReviewStat label="External payer checks" value={`${review.payerRuleCount}`} />
            <ReviewStat label="Rule coverage" value={review.ruleCoverage} />
          </div>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 content-start">
          <Metric label="Completed" value={review.completed.length} className="text-emerald-600" />
          <Metric label="Missing" value={review.missing.length} className="text-red-600" />
          <Metric label="Unresolved" value={review.unresolved.length} className="text-amber-600" />
          <Metric label="Timing" value={review.late.length} className="text-violet-600" />
          <Card className="p-4 col-span-2 sm:col-span-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rule Coverage</p>
            <p className="text-sm font-medium text-gray-800">{review.ruleCoverageLabel}</p>
          </Card>
        </div>
      </div>

      <Card className="p-5 mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Overall submission recommendation</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{review.overallRecommendation}</p>
          </div>
          <Badge className="bg-slate-100 text-slate-700">Not payer authorization</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
          {review.dimensions.map((dimension) => (
            <div key={dimension.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">{dimension.label}</p>
              <Badge className={`mt-2 ${dimensionTone(dimension.status)}`}>{dimension.status}</Badge>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{dimension.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 mb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Policy Intelligence</h3>
            <p className="text-xs text-gray-500 mt-1">Assessment from the structured policy and retrieved supplied clauses.</p>
          </div>
          <Badge className={policyTone(review.policyAssessment.status)}>{review.policyAssessment.status}</Badge>
        </div>
        <p className="text-sm text-gray-700 mt-3 leading-relaxed">{review.policyAssessment.summary}</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
          <ReviewStat label="Preauthorization" value={review.policyAssessment.preauthorization} />
          <ReviewStat label="NSSF coordination" value={review.policyAssessment.nssfCoordination} />
          <ReviewStat label="Network" value={review.policyAssessment.network} />
          <ReviewStat label="Confidence" value={review.policyAssessment.confidence} />
        </div>
        <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3"><p className="text-xs text-gray-600"><strong>Limit note:</strong> {review.policyAssessment.limitNote}</p></div>
        {review.policyAssessment.conflicts.length > 0 && <div className="mt-3 space-y-2">{review.policyAssessment.conflicts.map((conflict) => <div key={conflict} className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700">{conflict}</div>)}</div>}
        {review.policyAssessment.evidence.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Retrieved policy evidence</p>
            <div className="space-y-2">{review.policyAssessment.evidence.map((item) => <div key={item.id} className="rounded-lg border border-gray-100 p-3"><p className="text-[10px] text-gray-400">{item.source} · relevance {item.score}</p><p className="text-xs text-gray-700 mt-1 leading-relaxed">{item.text}</p></div>)}</div>
          </div>
        )}
      </Card>

      <Card className="p-5 mb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Retrieved Public Payer Knowledge</h3>
            <p className="text-xs text-gray-500 mt-1">Verified public workflow material retrieved for this exact TPA, request type and service. This is kept separate from patient-specific policy coverage.</p>
          </div>
          <Badge className={review.publicKnowledge.confidence === "high" ? "bg-emerald-100 text-emerald-700" : review.publicKnowledge.confidence === "none" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}>
            {review.publicKnowledge.confidence.toUpperCase()} RETRIEVAL CONFIDENCE
          </Badge>
        </div>
        <p className="text-xs text-gray-600 mt-3 leading-relaxed">{review.publicKnowledge.note}</p>
        {review.publicKnowledge.evidence.length > 0 ? (
          <div className="mt-4 space-y-2">
            {review.publicKnowledge.evidence.map((item) => {
              const source = getSource(item.sourceId);
              return (
                <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-gray-800">{source?.organization ?? item.organizationName} — {source?.title ?? item.sourceId}</p>
                        <Badge className={item.verification === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{item.verification}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{item.text}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">Relevance score {item.score}{item.matchedTerms.length ? ` · matched: ${item.matchedTerms.slice(0, 6).join(", ")}` : ""}</p>
                    </div>
                    {source?.url && (
                      <a href={source.url} target="_blank" rel="noreferrer" className="text-[#1A5FA8] hover:text-[#0B3D78]" title="Open official source">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">No public knowledge was retrieved for this exact combination. ClaimBot will not fill the gap with an invented payer rule.</div>
        )}
      </Card>

      {review.warnings.length > 0 && (
        <div className="space-y-2 mb-5">
          {review.warnings.map((warning, index) => (
            <div key={warning} className={`rounded-xl border p-3 flex gap-2.5 ${index === 0 && review.ruleCoverage !== "verified" ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
              <ShieldAlert className={`w-4 h-4 flex-shrink-0 mt-0.5 ${index === 0 && review.ruleCoverage !== "verified" ? "text-amber-600" : "text-slate-500"}`} />
              <p className="text-xs text-gray-700 leading-relaxed">{warning}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <RequirementCard
          title="Missing Requirements"
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          items={review.missing}
          emptyText="No currently applicable known requirements are missing."
          tone="red"
        />
        <RequirementCard
          title="Conditional / Unresolved"
          icon={<Info className="w-4 h-4 text-amber-500" />}
          items={review.unresolved}
          emptyText="No unresolved conditional items."
          tone="amber"
        />
      </div>

      {review.late.length > 0 && (
        <div className="mb-4">
          <RequirementCard
            title="Timing Issues"
            icon={<Clock3 className="w-4 h-4 text-violet-500" />}
            items={review.late}
            emptyText="No timing issues detected."
            tone="violet"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <RequirementCard
          title="Completed Checks"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          items={review.completed}
          emptyText="No completed checks yet."
          tone="emerald"
          compact
        />
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-[#1A5FA8]" />
            <h3 className="font-semibold text-gray-900 text-sm">Suggested Next Actions</h3>
          </div>
          <div className="space-y-2.5 text-xs text-gray-600">
            {review.nextActions.map((suggestion, index) => (
              <div key={`${suggestion}-${index}`} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 text-[#1A5FA8] flex items-center justify-center text-[10px] font-bold">
                  {index + 1}
                </span>
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {review.informational.length > 0 && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Workflow Notes</h3>
          </div>
          <div className="space-y-3">
            {review.informational.map((item) => (
              <div key={item.ruleId} className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-sm font-medium text-blue-900">{item.label}</p>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">ClaimBot Summary</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{review.summary}</p>
          {claim.clinicalJustification && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Clinical justification draft</p>
              <p className="text-xs text-gray-700 leading-relaxed">{claim.clinicalJustification}</p>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Sources Used</h3>
          <div className="space-y-3">
            {review.sourceIds.map((sourceId) => {
              const source = getSource(sourceId);
              if (!source) return null;
              return (
                <div key={source.id} className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-800">{source.organization} - {source.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Accessed {source.accessed}{source.section ? ` · ${source.section}` : ""}{source.page ? ` · p. ${source.page}` : ""}</p>
                      {source.verificationStatus && <p className="text-[10px] text-gray-400 mt-0.5">Registry status: {source.verificationStatus}{source.version ? ` · ${source.version}` : ""}</p>}
                    </div>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer" className="text-[#1A5FA8] hover:text-[#0B3D78]" title="Open official source">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-6">
        <strong>Scope boundary:</strong> ClaimBot can assess apparent coverage from supplied policy material and known public workflow rules, but it cannot verify live eligibility, remaining utilization, unpublished clinical criteria, network entitlement, or final payer authorization.
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
        <Button variant="secondary" icon={<Edit3 className="w-4 h-4" />} onClick={onBack}>
          Edit Request
        </Button>
        <Button icon={<FileText className="w-4 h-4" />} onClick={onGenerate}>
          Generate Assessment Report
        </Button>
      </div>
    </div>
  );
}

function RequirementCard({
  title,
  icon,
  items,
  emptyText,
  tone,
  compact = false,
}: {
  title: string;
  icon: JSX.Element;
  items: EvaluatedRequirement[];
  emptyText: string;
  tone: "red" | "amber" | "emerald" | "violet";
  compact?: boolean;
}) {
  const toneStyles = {
    red: "bg-red-50 border-red-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    violet: "bg-violet-50 border-violet-100",
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <Badge className="ml-auto bg-gray-100 text-gray-600">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.ruleId} className={`rounded-lg border p-3 ${toneStyles[tone]}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <Badge className={item.verification === "verified" ? "bg-white text-emerald-700" : item.verification === "internal" ? "bg-white text-slate-600" : "bg-white text-amber-700"}>
                  {item.verification.toUpperCase()}
                </Badge>
              </div>
              {!compact && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.explanation}</p>}
              {!compact && item.action && <p className="text-xs font-medium text-gray-700 mt-1.5">Action: {item.action}</p>}
              {!compact && (() => { const source = getSource(item.sourceId); return source?.url ? <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1A5FA8] mt-2 hover:underline">Why is this required?<ExternalLink className="w-3 h-3" /></a> : null; })()}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className={`text-3xl font-bold ${className}`}>{value}</div>
    </Card>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-700 capitalize text-right">{value}</span>
    </div>
  );
}

function serviceLabel(claim: ClaimDraft) {
  const base = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
  if (claim.serviceCategory !== "diagnostic_imaging") return base;
  const procedure = claim.procedureId === "other"
    ? claim.procedureOther || "Other procedure"
    : procedureById(claim.procedureId)?.label ?? claim.procedureId;
  return `${base} - ${procedure}`;
}

function statusTone(status: ReviewResult["status"]) {
  if (status === "DOCUMENTATION COMPLETE") {
    return { stroke: "#059669", badge: "bg-emerald-100 text-emerald-700" };
  }
  if (status === "NOT READY") {
    return { stroke: "#DC2626", badge: "bg-red-100 text-red-700" };
  }
  return { stroke: "#F59E0B", badge: "bg-amber-100 text-amber-700" };
}

function dimensionTone(status: ReviewResult["dimensions"][number]["status"]) {
  if (status === "PASS" || status === "APPEARS COVERED") return "bg-emerald-100 text-emerald-700";
  if (status === "APPEARS EXCLUDED") return "bg-red-100 text-red-700";
  if (status === "LIMIT MAY APPLY" || status === "REVIEW REQUIRED") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function policyTone(status: ReviewResult["policyAssessment"]["status"]) {
  if (status === "APPEARS COVERED") return "bg-emerald-100 text-emerald-700";
  if (status === "APPEARS EXCLUDED" || status === "POLICY CONFLICT DETECTED") return "bg-red-100 text-red-700";
  if (status === "LIMIT MAY APPLY") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}
