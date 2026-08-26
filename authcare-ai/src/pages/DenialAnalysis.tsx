import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileDown, FileText, Printer, RefreshCcw, Scale, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { FieldLabel, SelectInput, TextAreaInput, TextInput } from "@/components/common/FormControls";
import { INSURERS, PROCEDURES, SERVICES, insurerById, serviceById, tpaById } from "@/data/insuranceData";
import { analyzeDenial, buildAppealPackage, createDenialDemo, createEmptyDenialDraft } from "@/engine/denialIntelligence";
import type { DenialAnalysisResult, DenialDraft } from "@/types/denial";
import type { InsurerId, ProcedureId, ServiceCategory, TpaId } from "@/types/claim";

export function DenialAnalysis() {
  const [draft, setDraft] = useState<DenialDraft>(() => createEmptyDenialDraft());
  const [result, setResult] = useState<DenialAnalysisResult | null>(null);
  const [showPackage, setShowPackage] = useState(false);
  const appeal = useMemo(() => result ? buildAppealPackage(draft, result) : null, [draft, result]);
  const insurer = insurerById(draft.insurerId);
  const allowedTpas = insurer?.allowedTpas ?? ["unknown"];

  function update<K extends keyof DenialDraft>(key: K, value: DenialDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setResult(null);
    setShowPackage(false);
  }

  function updateInsurer(id: InsurerId) {
    const next = insurerById(id);
    setDraft((current) => ({ ...current, insurerId: id, tpaId: next?.defaultTpa ?? next?.allowedTpas[0] ?? "unknown" }));
    setResult(null);
    setShowPackage(false);
  }

  function loadDemo(kind: Parameters<typeof createDenialDemo>[0]) {
    setDraft(createDenialDemo(kind));
    setResult(null);
    setShowPackage(false);
  }

  async function loadTextFile(file: File | undefined, field: "denialText" | "policyText" | "benefitText" | "originalRequestText") {
    if (!file) return;
    if (file.size > 2_000_000) {
      window.alert("Keep text uploads under 2 MB for this prototype.");
      return;
    }
    const text = await file.text();
    update(field, text);
  }

  function runAnalysis() {
    setResult(analyzeDenial(draft));
    setShowPackage(false);
  }

  function downloadJson() {
    if (!result || !appeal) return;
    const payload = JSON.stringify({ draft, result, appeal }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `claimbot-denial-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="no-print">
        <h2 className="text-xl font-bold text-gray-900">Denial Intelligence &amp; Reconsideration</h2>
        <p className="text-sm text-gray-500 mt-1">Classify a denial, compare it with supplied policy/benefit evidence, identify missing support, and produce a physician-reviewable reconsideration package.</p>
      </div>

      <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">Use synthetic or de-identified information only. ClaimBot can identify an apparent inconsistency or administrative correction path; it cannot guarantee that an appeal will succeed or independently decide medical necessity.</p>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => loadDemo("excluded")}>Demo: legitimate exclusion</Button>
        <Button variant="secondary" size="sm" onClick={() => loadDemo("paperwork")}>Demo: missing paperwork</Button>
        <Button variant="secondary" size="sm" onClick={() => loadDemo("contestable")}>Demo: contestable denial</Button>
        <Button variant="secondary" size="sm" onClick={() => loadDemo("limit")}>Demo: exhausted limit</Button>
        <Button variant="secondary" size="sm" onClick={() => loadDemo("insufficient")}>Demo: insufficient info</Button>
      </div>

      <Card className="no-print p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><FieldLabel>Patient</FieldLabel><TextInput value={draft.patientName} onChange={(e) => update("patientName", e.target.value)} placeholder="Demo Patient" /></div>
          <div><FieldLabel>Member / policy ID</FieldLabel><TextInput value={draft.memberId} onChange={(e) => update("memberId", e.target.value)} placeholder="DEMO-001" /></div>
          <div><FieldLabel>Insurer</FieldLabel><SelectInput value={draft.insurerId} onChange={(e) => updateInsurer(e.target.value as InsurerId)} options={INSURERS.map((item) => ({ value: item.id, label: item.name }))} /></div>
          <div><FieldLabel>TPA</FieldLabel><SelectInput value={draft.tpaId} onChange={(e) => update("tpaId", e.target.value as TpaId)} options={allowedTpas.map((id) => ({ value: id, label: tpaById(id)?.name ?? id }))} /></div>
          <div><FieldLabel>Service</FieldLabel><SelectInput value={draft.serviceCategory} onChange={(e) => update("serviceCategory", e.target.value as ServiceCategory)} options={SERVICES.map((item) => ({ value: item.id, label: item.label }))} /></div>
          {draft.serviceCategory === "diagnostic_imaging" && <div><FieldLabel>Procedure</FieldLabel><SelectInput value={draft.procedureId} onChange={(e) => update("procedureId", e.target.value as ProcedureId)} options={PROCEDURES.map((item) => ({ value: item.id, label: item.label }))} /></div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <div>
            <FieldLabel>Denial reason / letter *</FieldLabel>
            <TextAreaInput rows={7} value={draft.denialText} onChange={(e) => update("denialText", e.target.value)} placeholder="Paste the payer denial reason or a synthetic denial letter..." />
            <TextUpload label="Load denial text file" onFile={(file) => void loadTextFile(file, "denialText")} />
          </div>
          <div>
            <FieldLabel>Original request / submission</FieldLabel>
            <TextAreaInput rows={7} value={draft.originalRequestText} onChange={(e) => update("originalRequestText", e.target.value)} placeholder="Describe what was originally submitted..." />
            <TextUpload label="Load original request text" onFile={(file) => void loadTextFile(file, "originalRequestText")} />
          </div>
          <div>
            <FieldLabel>Policy / relevant clauses</FieldLabel>
            <TextAreaInput rows={6} value={draft.policyText} onChange={(e) => update("policyText", e.target.value)} placeholder="Paste the controlling policy or endorsement wording..." />
            <TextUpload label="Load policy text file" onFile={(file) => void loadTextFile(file, "policyText")} />
          </div>
          <div>
            <FieldLabel>Table of Benefits / utilization evidence</FieldLabel>
            <TextAreaInput rows={6} value={draft.benefitText} onChange={(e) => update("benefitText", e.target.value)} placeholder="Paste benefit, limit, remaining balance, session-cap or preauthorization information..." />
            <TextUpload label="Load benefit text file" onFile={(file) => void loadTextFile(file, "benefitText")} />
          </div>
          <div><FieldLabel>Supporting documents / evidence</FieldLabel><TextAreaInput rows={5} value={draft.supportingEvidence} onChange={(e) => update("supportingEvidence", e.target.value)} placeholder="Separate items with new lines or semicolons..." /></div>
          <div><FieldLabel>Physician justification</FieldLabel><TextAreaInput rows={5} value={draft.physicianJustification} onChange={(e) => update("physicianJustification", e.target.value)} placeholder="Physician-provided facts only; physician review required before use." /></div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={runAnalysis} size="lg" icon={<Search className="w-4 h-4" />}>Analyze Denial</Button>
          <Button variant="ghost" onClick={() => { setDraft(createEmptyDenialDraft()); setResult(null); setShowPackage(false); }} icon={<RefreshCcw className="w-4 h-4" />}>Reset</Button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="no-print p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="w-10 h-10 rounded-xl bg-[#0B1F3A] flex items-center justify-center"><Scale className="w-5 h-5 text-white" /></div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-900">{result.classificationLabel}</h3>
                  <BasisBadge basis={result.reasonableBasis} />
                </div>
                <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
              <AnalysisBlock title="Denial reason" text={result.denialReason} />
              <AnalysisBlock title="Disputed / reviewable basis" text={result.disputedReason} />
              <AnalysisBlock title="Applicable policy clause" text={result.applicablePolicyClause} />
              <AnalysisBlock title="Benefit reference" text={result.benefitReference} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <ListBlock title="Supporting evidence" items={result.supportingEvidence} empty="No supporting evidence was supplied." tone="green" />
              <ListBlock title="Missing evidence" items={result.missingEvidence} empty="No additional missing evidence was identified by the heuristic." tone="amber" />
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Recommended next action</p>
              <p className="text-sm text-blue-900 mt-1 leading-relaxed">{result.recommendedAction}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => setShowPackage(true)} icon={<FileText className="w-4 h-4" />}>Generate Reconsideration Package</Button>
              <Button variant="secondary" onClick={downloadJson} icon={<FileDown className="w-4 h-4" />}>Download JSON</Button>
            </div>
          </Card>

          {showPackage && appeal && (
            <Card className="p-6 sm:p-8 print:shadow-none print:border-0">
              <div className="no-print flex flex-wrap justify-end gap-2 mb-5">
                <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>Print / Save PDF</Button>
              </div>
              <div className="border-b border-gray-200 pb-4 mb-5">
                <h2 className="text-xl font-bold text-gray-900">{appeal.title}</h2>
                <p className="text-xs text-gray-500 mt-1">Draft for provider / physician review — not a payer decision</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
                <MiniField label="Patient" value={draft.patientName || "Not entered"} />
                <MiniField label="Member ID" value={draft.memberId || "Not entered"} />
                <MiniField label="Insurer / TPA" value={`${insurerById(draft.insurerId)?.name ?? draft.insurerId} / ${tpaById(draft.tpaId)?.name ?? draft.tpaId}`} />
                <MiniField label="Service" value={serviceById(draft.serviceCategory)?.label ?? draft.serviceCategory} />
              </div>
              <PackageSection title="Denial summary" text={appeal.denialSummary} />
              <PackageSection title="Disputed reason" text={appeal.disputedReason} />
              <PackageSection title="Applicable policy clause" text={appeal.applicablePolicyClause} />
              <PackageSection title="Benefit reference" text={appeal.benefitReference} />
              <PackageSection title="Physician justification" text={appeal.physicianJustification} />
              <PackageSection title="Requested reconsideration" text={appeal.requestedReconsideration} />
              <section className="mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attachment checklist</h4>
                <div className="space-y-2">{appeal.attachmentChecklist.map((item) => <div key={item} className="flex items-start gap-2 text-sm text-gray-700"><span className="mt-0.5 w-4 h-4 rounded border border-gray-300 flex-shrink-0" />{item}</div>)}</div>
              </section>
              <section className="mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Letter draft</h4>
                <pre className="font-sans whitespace-pre-wrap text-sm leading-relaxed text-gray-700 rounded-xl bg-gray-50 border border-gray-100 p-4">{appeal.letter}</pre>
              </section>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">The provider/physician must verify all facts, policy clauses, attachments, and clinical wording before submission. ClaimBot does not provide legal advice, determine medical necessity, or guarantee reconsideration.</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function BasisBadge({ basis }: { basis: DenialAnalysisResult["reasonableBasis"] }) {
  const cls = basis === "STRONG" ? "bg-emerald-100 text-emerald-700" : basis === "POSSIBLE" ? "bg-blue-100 text-blue-700" : basis === "WEAK" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600";
  return <Badge className={cls}>{basis}</Badge>;
}

function AnalysisBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</p><p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{text}</p></div>;
}

function ListBlock({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: "green" | "amber" }) {
  const icon = tone === "green" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <div className="rounded-xl border border-gray-100 p-4"><div className="flex items-center gap-2 mb-2">{icon}<p className="text-sm font-semibold text-gray-800">{title}</p></div>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="text-xs text-gray-600 leading-relaxed">• {item}</p>)}</div> : <p className="text-xs text-gray-400">{empty}</p>}</div>;
}

function MiniField({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-400">{label}</p><p className="font-medium text-gray-800">{value}</p></div>;
}

function PackageSection({ title, text }: { title: string; text: string }) {
  return <section className="mb-5"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h4><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p></section>;
}

function TextUpload({ label, onFile }: { label: string; onFile: (file: File | undefined) => void }) {
  return (
    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#1A5FA8] hover:text-[#0B1F3A]">
      <FileText className="h-3.5 w-3.5" />
      {label}
      <input
        type="file"
        accept=".txt,.md,.json,.csv,text/plain,application/json,text/markdown,text/csv"
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
}
