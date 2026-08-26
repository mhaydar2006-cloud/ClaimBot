import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  Home,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { DOCUMENT_LABELS, insurerById, procedureById, serviceById, tpaById } from "@/data/insuranceData";
import { getSource } from "@/data/sources";
import type { ClaimDraft, EvaluatedRequirement, ReviewResult } from "@/types/claim";

interface GeneratedDocumentProps {
  claim: ClaimDraft;
  review: ReviewResult;
  onBack: () => void;
  onDone: () => void;
}

export function GeneratedDocument({ claim, review, onBack, onDone }: GeneratedDocumentProps) {
  const reportId = reportIdentifier(claim);
  const insurer = insurerById(claim.insurerId)?.name ?? claim.insurerId;
  const tpa = tpaById(claim.tpaId)?.name ?? claim.tpaId;
  const service = buildServiceLabel(claim);
  const attachedDocuments = Object.entries(claim.documents)
    .filter(([, available]) => available)
    .map(([key]) => DOCUMENT_LABELS[key as keyof typeof DOCUMENT_LABELS]);

  function downloadJson() {
    const payload = {
      reportId,
      generatedAt: new Date().toISOString(),
      disclaimer: "Decision support only. Apparent policy coverage is based on supplied documents; live eligibility, utilization, medical necessity, and final authorization remain with the payer/TPA.",
      claim: {
        patientName: claim.patientName,
        dob: claim.dob,
        memberId: claim.memberId,
        insurer,
        tpa,
        nssfStatus: claim.nssfStatus,
        requestType: claim.requestType,
        service,
        diagnosisMotive: claim.diagnosisMotive,
        physicianName: claim.physicianName,
        providerName: claim.providerName,
        requestDate: claim.requestDate,
        serviceDate: claim.serviceDate,
        admissionDate: claim.admissionDate,
        clinicalJustification: claim.clinicalJustification,
      },
      review,
      availableDocuments: attachedDocuments,
      attachmentMetadata: claim.attachments,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${reportId}-claim-readiness.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto print:max-w-none">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Readiness Review
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadJson}>
            Download JSON
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
            Print / Save PDF
          </Button>
          <Button size="sm" icon={<Home className="w-3.5 h-3.5" />} onClick={onDone}>
            Return to Dashboard
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden print-report print:shadow-none print:border-0">
        <div className="bg-[#0B1F3A] px-6 sm:px-8 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:bg-white print:text-black print:border-b-2 print:border-gray-800">
          <div>
            <p className="text-blue-300 text-xs font-medium uppercase tracking-widest mb-1 print:text-gray-500">ClaimBot Assessment Report</p>
            <p className="text-white text-xl font-semibold print:text-black">ClaimBot Lebanon</p>
            <p className="text-blue-200 text-xs mt-1 print:text-gray-600">Provider-side claim readiness, policy and denial decision-support prototype</p>
          </div>
          <div className="sm:text-right">
            <p className="text-blue-300 text-xs print:text-gray-500">Report ID</p>
            <p className="text-white text-sm font-mono print:text-black">{reportId}</p>
            <p className="text-blue-300 text-[11px] mt-1 print:text-gray-500">Generated {formatDateTime(new Date())}</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-7 text-sm">
          <div className={`rounded-xl border p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${statusClass(review.status)}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Documentation Status</p>
              <p className="text-2xl font-bold mt-1">{review.status}</p>
              <p className="text-xs mt-1 max-w-2xl leading-relaxed">{review.summary}</p>
            </div>
            <div className="sm:text-right flex-shrink-0">
              <p className="text-xs font-medium opacity-70">Readiness score</p>
              <p className="text-4xl font-bold">{review.readinessScore == null ? "—" : `${review.readinessScore}%`}</p>
              <p className="text-[10px] opacity-70">Known scoreable checks only</p>
            </div>
          </div>

          <section>
            <SectionTitle>Patient & Coverage</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ReportField label="Patient" value={claim.patientName || "Not entered"} />
              <ReportField label="DOB" value={formatIsoDate(claim.dob)} />
              <ReportField label="Member / Policy ID" value={claim.memberId || "Not entered"} />
              <ReportField label="Insurance" value={insurer} />
              <ReportField label="TPA / Administrator" value={tpa} />
              <ReportField label="NSSF status" value={nssfLabel(claim.nssfStatus)} />
              <ReportField label="Provider network" value={claim.providerNetworkStatus === "in_network" ? "In network (user confirmed)" : claim.providerNetworkStatus === "out_of_network" ? "Out of network (user confirmed)" : "Not verified"} />
            </div>
          </section>

          <section>
            <SectionTitle>Requested Service</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ReportField label="Request type" value={claim.requestType === "preauthorization" ? "Pre-Authorization" : "Reimbursement"} />
              <ReportField label="Service" value={service} />
              <ReportField label="Request date" value={formatIsoDate(claim.requestDate)} />
              <ReportField label="Diagnosis / motive" value={claim.diagnosisMotive || "Not entered"} wide />
              <ReportField label="Treating physician" value={claim.physicianName || "Not entered"} />
              <ReportField label="Provider / facility" value={claim.providerName || "Not entered"} />
              {claim.serviceDate && <ReportField label="Service date" value={formatIsoDate(claim.serviceDate)} />}
              {claim.admissionDate && <ReportField label="Admission date" value={formatIsoDate(claim.admissionDate)} />}
            </div>
          </section>

          {claim.clinicalJustification && (
            <section>
              <SectionTitle>Clinical Justification Wording</SectionTitle>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{claim.clinicalJustification}</p>
              <p className="text-[11px] text-gray-400 mt-2">This wording must be reviewed against the treating physician&apos;s source facts before use.</p>
            </section>
          )}

          {claim.policySummary && (
            <section>
              <SectionTitle>Optional Policy / Benefits Text Summary</SectionTitle>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{claim.policySummary}</p>
              <p className="text-[11px] text-gray-400 mt-2">This optional AI summary reflects only user-supplied text. The separate Policy Intelligence section applies deterministic apparent-coverage rules and still does not verify live eligibility or authorization.</p>
            </section>
          )}

          <section>
            <SectionTitle>Combined ClaimBot Assessment</SectionTitle>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall recommendation</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{review.overallRecommendation}</p>
              <p className="text-[11px] text-slate-500 mt-1">This is a provider-side recommendation, not insurer approval.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {review.dimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700">{dimension.label}</p>
                  <p className="text-xs font-bold mt-1">{dimension.status}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{dimension.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Policy Intelligence</SectionTitle>
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-900">{review.policyAssessment.status}</p><Badge className="bg-gray-100 text-gray-600">{review.policyAssessment.confidence} confidence</Badge></div>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.policyAssessment.summary}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                <ReportField label="Preauthorization" value={review.policyAssessment.preauthorization} />
                <ReportField label="NSSF coordination" value={review.policyAssessment.nssfCoordination} />
                <ReportField label="Network" value={review.policyAssessment.network} />
              </div>
              <p className="text-xs text-gray-600 mt-3"><strong>Limit note:</strong> {review.policyAssessment.limitNote}</p>
              {review.policyAssessment.evidence.length > 0 && <div className="mt-4 space-y-2">{review.policyAssessment.evidence.map((item) => <div key={item.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3"><p className="text-[10px] text-gray-400">Retrieved evidence · score {item.score}</p><p className="text-xs text-gray-700 mt-1 leading-relaxed">{item.text}</p></div>)}</div>}
            </div>
          </section>

          <section>
            <SectionTitle>Retrieved Public Payer Knowledge</SectionTitle>
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900">Public workflow retrieval</p>
                <Badge className="bg-gray-100 text-gray-600">{review.publicKnowledge.confidence} confidence</Badge>
              </div>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">{review.publicKnowledge.note}</p>
              {review.publicKnowledge.evidence.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {review.publicKnowledge.evidence.map((item) => {
                    const source = getSource(item.sourceId);
                    return (
                      <div key={item.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                        <p className="text-[10px] font-semibold text-gray-500">{source?.organization ?? item.organizationName} — {source?.title ?? item.sourceId} · {item.verification} · relevance {item.score}</p>
                        <p className="text-xs text-gray-700 mt-1 leading-relaxed">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-amber-700 mt-3">No public payer knowledge was available for this exact request combination; direct payer verification is required.</p>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Readiness Findings</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FindingBlock
                title="Missing / blocking"
                icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
                items={[...review.missing, ...review.late]}
                empty="No known blocking requirements were found."
                tone="red"
              />
              <FindingBlock
                title="Conditional / needs verification"
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                items={review.unresolved}
                empty="No conditional requirements remain unresolved."
                tone="amber"
              />
              <FindingBlock
                title="Completed checks"
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                items={review.completed}
                empty="No scored requirements are marked complete yet."
                tone="emerald"
              />
              <FindingBlock
                title="Workflow notes"
                icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
                items={review.informational}
                empty="No additional workflow note is encoded for this request."
                tone="blue"
              />
            </div>
          </section>

          <section>
            <SectionTitle>Next Actions</SectionTitle>
            <ol className="space-y-2">
              {review.nextActions.map((action, index) => (
                <li key={`${index}-${action}`} className="flex gap-3 text-gray-700">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-[#1A5FA8] flex items-center justify-center text-xs font-bold flex-shrink-0">{index + 1}</span>
                  <span className="pt-0.5">{action}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle>Available Documents / Attachments</SectionTitle>
            {attachedDocuments.length === 0 && claim.attachments.length === 0 ? (
              <p className="text-xs text-gray-400">No documents were marked available and no local attachment metadata was added.</p>
            ) : (
              <div className="space-y-2">
                {attachedDocuments.map((document) => (
                  <div key={document} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{document}</span>
                  </div>
                ))}
                {claim.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <FileText className="w-4 h-4 text-[#1A5FA8] flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{attachment.name}</span>
                    <Badge className="bg-white text-gray-500">metadata only</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Rule Sources Used</SectionTitle>
            <div className="space-y-3">
              {review.sourceIds.map((sourceId) => {
                const source = getSource(sourceId);
                if (!source) return null;
                return (
                  <div key={source.id} className="rounded-lg border border-gray-100 p-3 flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-[#1A5FA8] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{source.organization} — {source.title}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{source.scope}</p>
                      <p className="text-[11px] text-gray-400 mt-1">Last verified by this prototype: {source.accessed}{source.section ? ` · ${source.section}` : ""}{source.page ? ` · p. ${source.page}` : ""}</p>
                      {source.verificationStatus && <p className="text-[10px] text-gray-400 mt-0.5">Registry status: {source.verificationStatus}{source.version ? ` · ${source.version}` : ""}</p>}
                    </div>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noreferrer" className="no-print text-[#1A5FA8] hover:text-[#0B3D78]" title="Open official source">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Important limitation</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              ClaimBot evaluates documentation readiness and apparent policy coverage from cited public rules plus user-supplied policy material. It does <strong>not</strong> verify live patient eligibility, current benefit utilization, unpublished medical-necessity criteria, network entitlement, or final authorization. When information is partial, conflicting, or unavailable, the report explicitly requires direct verification with the insurer/TPA.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-gray-400">
            <span>ClaimBot Lebanon MVP | Synthetic / de-identified data only</span>
            <span>{review.ruleCoverageLabel}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FindingBlock({
  title,
  icon,
  items,
  empty,
  tone,
}: {
  title: string;
  icon: JSX.Element;
  items: EvaluatedRequirement[];
  empty: string;
  tone: "red" | "amber" | "emerald" | "blue";
}) {
  const styles = {
    red: "border-red-100 bg-red-50/70",
    amber: "border-amber-100 bg-amber-50/70",
    emerald: "border-emerald-100 bg-emerald-50/70",
    blue: "border-blue-100 bg-blue-50/70",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h5 className="text-sm font-semibold text-gray-900">{title}</h5>
        <Badge className="ml-auto bg-white/80 text-gray-600">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.ruleId} className="rounded-lg bg-white/80 border border-white p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{item.verification}</span>
              </div>
              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{item.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pb-1.5 border-b border-gray-100">{children}</h4>;
}

function ReportField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-medium text-gray-800 break-words">{value}</p>
    </div>
  );
}

function reportIdentifier(claim: ClaimDraft) {
  const raw = claim.mrn || claim.memberId || "DEMO";
  const clean = raw.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 24);
  return `CB-${clean || "DEMO"}`;
}

function buildServiceLabel(claim: ClaimDraft) {
  const service = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
  if (claim.serviceCategory !== "diagnostic_imaging") return service;
  const procedure = claim.procedureId === "other"
    ? claim.procedureOther || "Other procedure"
    : procedureById(claim.procedureId)?.label ?? claim.procedureId;
  return `${service} - ${procedure}`;
}

function nssfLabel(status: ClaimDraft["nssfStatus"]) {
  if (status === "yes") return "Yes";
  if (status === "no") return "No";
  return "Unknown / requires verification";
}

function statusClass(status: ReviewResult["status"]) {
  if (status === "DOCUMENTATION COMPLETE") return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (status === "NOT READY") return "bg-red-50 border-red-200 text-red-900";
  return "bg-amber-50 border-amber-200 text-amber-900";
}

function formatIsoDate(value: string) {
  if (!value) return "Not entered";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}
