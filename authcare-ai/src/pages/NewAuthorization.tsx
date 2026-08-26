import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { FieldLabel, SelectInput, TextAreaInput, TextInput } from "@/components/common/FormControls";
import { createDemoMriClaim, defaultProcedureForService } from "@/data/claimDefaults";
import { EMPTY_POLICY_PROFILE, SYNTHETIC_POLICIES, syntheticPolicyById } from "@/data/syntheticPolicies";
import {
  DOCUMENT_LABELS,
  INSURERS,
  PROCEDURES,
  SERVICES,
  insurerById,
  procedureById,
  serviceById,
  tpaById,
} from "@/data/insuranceData";
import { improveMedicalJustification, summarizePolicyExcerpt } from "@/engine/aiAssistant";
import { getExpectedDocumentRules, getRuleSetSummary } from "@/engine/validator";
import { FORM_STEPS } from "@/data/mockData";
import type {
  ClaimDocuments,
  ClaimDraft,
  InsurerId,
  NssfStatus,
  NetworkStatus,
  PolicyBenefitEntry,
  PolicyBenefitStatus,
  ProcedureId,
  RequestType,
  ServiceCategory,
  TpaId,
} from "@/types/claim";

interface NewAuthorizationProps {
  initialClaim: ClaimDraft;
  onRunReview: (claim: ClaimDraft) => void;
  onBack: () => void;
}

export function NewAuthorization({ initialClaim, onRunReview, onBack }: NewAuthorizationProps) {
  const [step, setStep] = useState(1);
  const [claim, setClaim] = useState<ClaimDraft>(initialClaim);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyNote, setPolicyNote] = useState("");

  const expectedDocumentRules = useMemo(() => getExpectedDocumentRules(claim), [claim]);
  const expectedDocuments = useMemo(() => {
    const byTarget = new Map<string, (typeof expectedDocumentRules)[number]>();
    expectedDocumentRules.forEach((rule) => {
      if (rule.target) byTarget.set(rule.target, rule);
    });
    return Array.from(byTarget.values());
  }, [expectedDocumentRules]);

  function update<K extends keyof ClaimDraft>(key: K, value: ClaimDraft[K]) {
    setClaim((current) => ({ ...current, [key]: value }));
  }

  function updateDocument(key: keyof ClaimDocuments, value: boolean) {
    setClaim((current) => ({
      ...current,
      documents: { ...current.documents, [key]: value },
    }));
  }

  function updateInsurer(insurerId: InsurerId) {
    const insurer = insurerById(insurerId);
    const nextTpa = insurer?.defaultTpa ?? insurer?.allowedTpas[0] ?? "unknown";
    setClaim((current) => ({
      ...current,
      insurerId,
      tpaId: nextTpa,
    }));
  }

  function updateService(serviceCategory: ServiceCategory) {
    setClaim((current) => ({
      ...current,
      serviceCategory,
      procedureId: defaultProcedureForService(serviceCategory),
    }));
  }

  async function runJustificationAssistant() {
    setAiBusy(true);
    setAiNote("");
    const serviceLabel = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
    const result = await improveMedicalJustification(claim.clinicalJustification, {
      diagnosis: claim.diagnosisMotive,
      service: serviceLabel,
    });
    setClaim((current) => ({ ...current, aiJustification: result.text }));
    setAiNote(result.note);
    setAiBusy(false);
  }

  async function runPolicySummary() {
    setPolicyBusy(true);
    setPolicyNote("");
    const result = await summarizePolicyExcerpt(claim.policyText);
    setClaim((current) => ({ ...current, policySummary: result.text }));
    setPolicyNote(result.note);
    setPolicyBusy(false);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2.5 flex-1">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Prototype mode: use synthetic or de-identified data only. ClaimBot checks documentation and can assess apparent coverage from supplied policy evidence; live payer coverage/eligibility and medical necessity remain outside the prototype.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => { setClaim(createDemoMriClaim(false)); setStep(1); }}>
            Load Incomplete MRI Demo
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setClaim(createDemoMriClaim(true)); setStep(1); }}>
            Load Complete MRI Demo
          </Button>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">New Claim / Pre-Authorization Request</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Step {step} of {FORM_STEPS.length} - {FORM_STEPS[step - 1]}
            </p>
          </div>
          <span className="text-sm font-semibold text-[#1A5FA8]">
            {Math.round(((step - 1) / (FORM_STEPS.length - 1)) * 100)}% complete
          </span>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {FORM_STEPS.map((label, index) => {
            const stepNumber = index + 1;
            const done = stepNumber < step;
            const active = stepNumber === step;
            return (
              <div key={label} className="flex items-center flex-1 min-w-[100px]">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-[#1A5FA8] text-white ring-4 ring-[#1A5FA8]/20"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : stepNumber}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium text-center leading-tight max-w-[78px] ${
                      active ? "text-[#1A5FA8]" : done ? "text-emerald-600" : "text-gray-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        {step === 1 && <PatientStep claim={claim} update={update} />}
        {step === 2 && (
          <CoverageStep
            claim={claim}
            onInsurerChange={updateInsurer}
            update={update}
            policyBusy={policyBusy}
            policyNote={policyNote}
            onSummarizePolicy={runPolicySummary}
          />
        )}
        {step === 3 && (
          <ServiceStep
            claim={claim}
            update={update}
            onServiceChange={updateService}
            aiBusy={aiBusy}
            aiNote={aiNote}
            onImprove={runJustificationAssistant}
          />
        )}
        {step === 4 && (
          <DocumentationStep
            claim={claim}
            expectedDocuments={expectedDocuments}
            updateDocument={updateDocument}
            update={update}
          />
        )}
        {step === 5 && (
          <ReviewStep claim={claim} expectedDocumentCount={expectedDocuments.length} onRunReview={() => onRunReview(claim)} />
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onBack() : setStep((currentStep) => Math.max(1, currentStep - 1)))}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            {step === 1 ? "Cancel" : "Previous"}
          </Button>
          {step < FORM_STEPS.length && (
            <Button onClick={() => setStep((currentStep) => Math.min(FORM_STEPS.length, currentStep + 1))}>
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function PatientStep({
  claim,
  update,
}: {
  claim: ClaimDraft;
  update: <K extends keyof ClaimDraft>(key: K, value: ClaimDraft[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Patient Information</h3>
        <p className="text-xs text-gray-500 mt-1">Enter only synthetic or de-identified information for the prototype.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FieldLabel>Full patient name *</FieldLabel>
          <TextInput value={claim.patientName} onChange={(event) => update("patientName", event.target.value)} placeholder="Demo Patient Alpha" />
        </div>
        <div>
          <FieldLabel>Date of birth *</FieldLabel>
          <TextInput type="date" value={claim.dob} onChange={(event) => update("dob", event.target.value)} />
        </div>
        <div>
          <FieldLabel>Medical record number</FieldLabel>
          <TextInput value={claim.mrn} onChange={(event) => update("mrn", event.target.value)} placeholder="DEMO-LB-20481" />
        </div>
        <div>
          <FieldLabel>Patient mobile number</FieldLabel>
          <TextInput value={claim.mobileNumber} onChange={(event) => update("mobileNumber", event.target.value)} placeholder="+961 ..." />
        </div>
        <div>
          <FieldLabel>Insurance member / policy ID *</FieldLabel>
          <TextInput value={claim.memberId} onChange={(event) => update("memberId", event.target.value)} placeholder="DEMO-POL-001" />
        </div>
      </div>
    </div>
  );
}

function CoverageStep({
  claim,
  onInsurerChange,
  update,
  policyBusy,
  policyNote,
  onSummarizePolicy,
}: {
  claim: ClaimDraft;
  onInsurerChange: (id: InsurerId) => void;
  update: <K extends keyof ClaimDraft>(key: K, value: ClaimDraft[K]) => void;
  policyBusy: boolean;
  policyNote: string;
  onSummarizePolicy: () => void;
}) {
  const insurer = insurerById(claim.insurerId);
  const allowedTpas = insurer?.allowedTpas ?? ["unknown"];
  const tpa = tpaById(claim.tpaId);
  const currentBenefit = claim.policyProfile.benefitEntries.find((entry) => entry.category === claim.serviceCategory);

  function updatePolicy(partial: Partial<ClaimDraft["policyProfile"]>) {
    update("policyProfile", { ...claim.policyProfile, ...partial, sourceMode: claim.policyProfile.sourceMode === "synthetic" ? "structured" : claim.policyProfile.sourceMode === "none" ? "structured" : claim.policyProfile.sourceMode });
  }

  function selectSyntheticPolicy(id: string) {
    if (!id) {
      update("policyProfile", structuredClone(EMPTY_POLICY_PROFILE));
      update("policyText", "");
      return;
    }
    const policy = syntheticPolicyById(id);
    if (!policy) return;
    const copy = structuredClone(policy);
    update("policyProfile", copy);
    update("policyText", copy.rawText);
  }

  function updateCurrentBenefit(status: PolicyBenefitStatus | "unknown", field?: "annualLimit" | "remainingLimit" | "sessionLimit" | "preauthorizationRequired", rawValue?: string | boolean) {
    const others = claim.policyProfile.benefitEntries.filter((entry) => entry.category !== claim.serviceCategory);
    if (status === "unknown") {
      updatePolicy({ benefitEntries: others });
      return;
    }
    const base = currentBenefit ?? {
      id: `custom-${claim.serviceCategory}`,
      category: claim.serviceCategory,
      label: `${serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory} benefit`,
      status,
    };
    let next: PolicyBenefitEntry = { ...base, status };
    if (field === "preauthorizationRequired") next = { ...next, preauthorizationRequired: Boolean(rawValue) };
    if (field === "annualLimit") next = { ...next, annualLimit: rawValue === "" ? null : Number(rawValue) };
    if (field === "remainingLimit") next = { ...next, remainingLimit: rawValue === "" ? null : Number(rawValue) };
    if (field === "sessionLimit") next = { ...next, sessionLimit: rawValue === "" ? null : Number(rawValue) };
    updatePolicy({ benefitEntries: [...others, next] });
  }

  async function loadPolicyFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    update("policyText", text);
    update("policyProfile", {
      ...claim.policyProfile,
      id: `uploaded-${file.name}`,
      name: file.name,
      sourceMode: "uploaded",
      rawText: text,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Coverage, Administrator &amp; Policy Intelligence</h3>
        <p className="text-xs text-gray-500 mt-1">ClaimBot keeps insurer, operational TPA, and patient-specific policy evidence as separate layers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Insurance company *</FieldLabel>
          <SelectInput value={claim.insurerId} onChange={(event) => onInsurerChange(event.target.value as InsurerId)} options={INSURERS.map((option) => ({ value: option.id, label: option.name }))} />
        </div>
        <div>
          <FieldLabel>TPA / Administrator *</FieldLabel>
          <SelectInput value={claim.tpaId} onChange={(event) => update("tpaId", event.target.value as TpaId)} options={allowedTpas.map((id) => ({ value: id, label: tpaById(id)?.name ?? id }))} />
        </div>
        <div>
          <FieldLabel>NSSF status *</FieldLabel>
          <SelectInput value={claim.nssfStatus} onChange={(event) => update("nssfStatus", event.target.value as NssfStatus)} options={[
            { value: "yes", label: "Yes - patient benefits from NSSF" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Unknown / needs verification" },
          ]} />
        </div>
        <div>
          <FieldLabel>Provider network status</FieldLabel>
          <SelectInput value={claim.providerNetworkStatus} onChange={(event) => update("providerNetworkStatus", event.target.value as NetworkStatus)} options={[
            { value: "unknown", label: "Unknown / not verified" },
            { value: "in_network", label: "In network (confirmed by user)" },
            { value: "out_of_network", label: "Out of network (confirmed by user)" },
          ]} />
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Current payer mapping</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">{insurer?.note}</p>
            {tpa && <p className="text-xs text-blue-700 mt-1"><strong>Public rule coverage:</strong> {tpa.ruleCoverage} - {tpa.note}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-emerald-950">Policy / Table of Benefits</h4>
            <p className="text-xs text-emerald-800 mt-1">Load a synthetic demo, enter structured benefit facts, paste text, or upload a text/JSON policy export. ClaimBot retrieves relevant clauses and produces an apparent-coverage assessment.</p>
          </div>
          <Badge className="bg-white text-emerald-700 border border-emerald-100">Local retrieval + rules</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Synthetic policy demo</FieldLabel>
            <SelectInput value={claim.policyProfile.sourceMode === "synthetic" ? claim.policyProfile.id : ""} onChange={(event) => selectSyntheticPolicy(event.target.value)} options={[
              { value: "", label: "Custom / no synthetic policy" },
              ...SYNTHETIC_POLICIES.map((policy) => ({ value: policy.id, label: policy.name })),
            ]} />
          </div>
          <div>
            <FieldLabel>Policy source mode</FieldLabel>
            <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm text-gray-700 capitalize">{claim.policyProfile.sourceMode.replace("_", " ")}</div>
          </div>
          <div>
            <FieldLabel>Plan name</FieldLabel>
            <TextInput value={claim.policyProfile.planName} onChange={(event) => updatePolicy({ planName: event.target.value })} placeholder="e.g. Comprehensive Plus" />
          </div>
          <div>
            <FieldLabel>Annual policy limit</FieldLabel>
            <TextInput type="number" min="0" value={claim.policyProfile.annualLimit ?? ""} onChange={(event) => updatePolicy({ annualLimit: event.target.value ? Number(event.target.value) : null })} placeholder="e.g. 50000" />
          </div>
          <div>
            <FieldLabel>Deductible</FieldLabel>
            <TextInput type="number" min="0" value={claim.policyProfile.deductible ?? ""} onChange={(event) => updatePolicy({ deductible: event.target.value ? Number(event.target.value) : null })} />
          </div>
          <div>
            <FieldLabel>Copay / coinsurance %</FieldLabel>
            <TextInput type="number" min="0" max="100" value={claim.policyProfile.coinsurancePercent ?? ""} onChange={(event) => updatePolicy({ coinsurancePercent: event.target.value ? Number(event.target.value) : null })} />
          </div>
          <div>
            <FieldLabel>Network restriction</FieldLabel>
            <SelectInput value={claim.policyProfile.networkRestriction} onChange={(event) => updatePolicy({ networkRestriction: event.target.value as ClaimDraft["policyProfile"]["networkRestriction"] })} options={[
              { value: "not_stated", label: "Not stated" },
              { value: "network_only", label: "Network only" },
              { value: "out_of_network_allowed", label: "Out-of-network may be allowed" },
            ]} />
          </div>
          <div>
            <FieldLabel>Policy-level NSSF coordination</FieldLabel>
            <SelectInput value={claim.policyProfile.nssfCoordination} onChange={(event) => updatePolicy({ nssfCoordination: event.target.value as ClaimDraft["policyProfile"]["nssfCoordination"] })} options={[
              { value: "unknown", label: "Unknown" },
              { value: "required", label: "Required" },
              { value: "may_apply", label: "May apply" },
              { value: "not_required", label: "Not indicated" },
            ]} />
          </div>
        </div>

        <div className="rounded-lg bg-white border border-emerald-100 p-3">
          <p className="text-xs font-semibold text-gray-800 mb-3">Current service benefit entry: {serviceById(claim.serviceCategory)?.label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Benefit status</FieldLabel>
              <SelectInput value={currentBenefit?.status ?? "unknown"} onChange={(event) => updateCurrentBenefit(event.target.value as PolicyBenefitStatus | "unknown")} options={[
                { value: "unknown", label: "Not entered" },
                { value: "covered", label: "Covered" },
                { value: "conditional", label: "Covered with condition / limit" },
                { value: "excluded", label: "Excluded" },
              ]} />
            </div>
            <div>
              <FieldLabel>Service annual limit</FieldLabel>
              <TextInput type="number" min="0" disabled={!currentBenefit} value={currentBenefit?.annualLimit ?? ""} onChange={(event) => updateCurrentBenefit(currentBenefit?.status ?? "conditional", "annualLimit", event.target.value)} />
            </div>
            <div>
              <FieldLabel>Known remaining amount</FieldLabel>
              <TextInput type="number" min="0" disabled={!currentBenefit} value={currentBenefit?.remainingLimit ?? ""} onChange={(event) => updateCurrentBenefit(currentBenefit?.status ?? "conditional", "remainingLimit", event.target.value)} />
            </div>
            <div>
              <FieldLabel>Session limit</FieldLabel>
              <TextInput type="number" min="0" disabled={!currentBenefit} value={currentBenefit?.sessionLimit ?? ""} onChange={(event) => updateCurrentBenefit(currentBenefit?.status ?? "conditional", "sessionLimit", event.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Exclusions (one per line)</FieldLabel>
          <TextAreaInput rows={3} value={claim.policyProfile.exclusions.join("\n")} onChange={(event) => updatePolicy({ exclusions: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} placeholder="Physiotherapy\nPET scans..." />
        </div>

        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1">
            <FieldLabel>Policy / Table of Benefits text</FieldLabel>
            <label className="text-xs font-medium text-[#1A5FA8] cursor-pointer hover:underline">
              Upload text / JSON policy
              <input type="file" accept=".txt,.md,.json,text/plain,application/json" className="hidden" onChange={(event) => void loadPolicyFile(event.target.files?.[0])} />
            </label>
          </div>
          <TextAreaInput rows={6} value={claim.policyText} onChange={(event) => { update("policyText", event.target.value); updatePolicy({ rawText: event.target.value, sourceMode: "pasted" }); }} placeholder="Paste synthetic/redacted policy or Table of Benefits text here..." />
          <p className="text-[11px] text-gray-500 mt-1">PDF text extraction is intentionally not performed in-browser in this prototype; paste extracted text or use a text/JSON export.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onSummarizePolicy} disabled={policyBusy} icon={<Sparkles className="w-3.5 h-3.5" />}>{policyBusy ? "Summarizing..." : "Optional AI summary"}</Button>
          <span className="text-[11px] text-emerald-700">Coverage logic does not depend on the AI endpoint.</span>
        </div>
        {claim.policySummary && <div className="rounded-lg bg-white border border-violet-100 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1">AI summary</p><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{claim.policySummary}</p></div>}
        {policyNote && <p className="text-xs text-violet-700">{policyNote}</p>}
      </div>
    </div>
  );
}

function ServiceStep({
  claim,
  update,
  onServiceChange,
  aiBusy,
  aiNote,
  onImprove,
}: {
  claim: ClaimDraft;
  update: <K extends keyof ClaimDraft>(key: K, value: ClaimDraft[K]) => void;
  onServiceChange: (service: ServiceCategory) => void;
  aiBusy: boolean;
  aiNote: string;
  onImprove: () => void;
}) {
  const isMedication = claim.serviceCategory === "medication_acute" || claim.serviceCategory === "medication_chronic";
  const isHospitalization = claim.serviceCategory === "hospitalization_elective" || claim.serviceCategory === "hospitalization_emergency";
  const isDiagnostic = claim.serviceCategory === "diagnostic_imaging";
  const isPhysio = claim.serviceCategory === "physiotherapy";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Requested Service</h3>
        <p className="text-xs text-gray-500 mt-1">The selected request type and service determine which verified rules ClaimBot loads.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Request type *</FieldLabel>
          <SelectInput
            value={claim.requestType}
            onChange={(event) => update("requestType", event.target.value as RequestType)}
            options={[
              { value: "preauthorization", label: "Pre-Authorization / Approval Request" },
              { value: "reimbursement", label: "Reimbursement Claim" },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Service category *</FieldLabel>
          <SelectInput
            value={claim.serviceCategory}
            onChange={(event) => onServiceChange(event.target.value as ServiceCategory)}
            options={SERVICES.map((service) => ({ value: service.id, label: service.label }))}
          />
        </div>

        {isDiagnostic && (
          <div>
            <FieldLabel>Procedure *</FieldLabel>
            <SelectInput
              value={claim.procedureId}
              onChange={(event) => update("procedureId", event.target.value as ProcedureId)}
              options={PROCEDURES.map((procedure) => ({ value: procedure.id, label: procedure.label }))}
            />
          </div>
        )}
        {isDiagnostic && claim.procedureId === "other" && (
          <div>
            <FieldLabel>Other procedure</FieldLabel>
            <TextInput value={claim.procedureOther} onChange={(event) => update("procedureOther", event.target.value)} />
          </div>
        )}

        <div className="sm:col-span-2">
          <FieldLabel>Diagnosis / clinical motive *</FieldLabel>
          <TextAreaInput
            rows={2}
            value={claim.diagnosisMotive}
            onChange={(event) => update("diagnosisMotive", event.target.value)}
            placeholder="Use the treating physician's documented diagnosis or motive."
          />
        </div>

        <div>
          <FieldLabel>Treating physician</FieldLabel>
          <TextInput value={claim.physicianName} onChange={(event) => update("physicianName", event.target.value)} placeholder="Dr. ..." />
        </div>
        <div>
          <FieldLabel>Provider / facility</FieldLabel>
          <TextInput value={claim.providerName} onChange={(event) => update("providerName", event.target.value)} placeholder="Clinic / hospital" />
        </div>
        <div>
          <FieldLabel>Request date</FieldLabel>
          <TextInput type="date" value={claim.requestDate} onChange={(event) => update("requestDate", event.target.value)} />
        </div>
        {claim.requestType === "reimbursement" && (
          <div>
            <FieldLabel>Date of treatment / service</FieldLabel>
            <TextInput type="date" value={claim.serviceDate} onChange={(event) => update("serviceDate", event.target.value)} />
          </div>
        )}
        {claim.serviceCategory === "hospitalization_elective" && (
          <div>
            <FieldLabel>Planned admission date</FieldLabel>
            <TextInput type="date" value={claim.admissionDate} onChange={(event) => update("admissionDate", event.target.value)} />
          </div>
        )}
        {isPhysio && (
          <div>
            <FieldLabel>Number of sessions</FieldLabel>
            <TextInput type="number" min="1" value={claim.numberOfSessions} onChange={(event) => update("numberOfSessions", event.target.value)} placeholder="e.g. 10" />
          </div>
        )}
        {claim.serviceCategory === "doctor_visit" && claim.requestType === "reimbursement" && (
          <div>
            <FieldLabel>Physician fees</FieldLabel>
            <TextInput value={claim.physicianFees} onChange={(event) => update("physicianFees", event.target.value)} placeholder="As stated on the claim document" />
          </div>
        )}
      </div>

      {isMedication && (
        <div className="rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Medication details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Medication name</FieldLabel>
              <TextInput value={claim.medicationName} onChange={(event) => update("medicationName", event.target.value)} />
            </div>
            <div>
              <FieldLabel>Dosage</FieldLabel>
              <TextInput value={claim.dosage} onChange={(event) => update("dosage", event.target.value)} />
            </div>
            <div>
              <FieldLabel>Administration</FieldLabel>
              <TextInput value={claim.administration} onChange={(event) => update("administration", event.target.value)} placeholder="e.g. once daily" />
            </div>
            <div>
              <FieldLabel>Quantity</FieldLabel>
              <TextInput value={claim.quantity} onChange={(event) => update("quantity", event.target.value)} />
            </div>
            <div>
              <FieldLabel>Duration</FieldLabel>
              <TextInput value={claim.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. 30 days" />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Physician document confirmation</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow
            label="Physician signature present"
            checked={claim.physicianSignature}
            onChange={(checked) => update("physicianSignature", checked)}
          />
          <ToggleRow
            label="Physician stamp present"
            checked={claim.physicianStamp}
            onChange={(checked) => update("physicianStamp", checked)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h4 className="text-sm font-semibold text-violet-900">Medical Justification Wording Assistant</h4>
          </div>
          <Badge className="bg-white text-violet-700 border border-violet-100">Optional AI</Badge>
        </div>
        <p className="text-xs text-violet-700 mb-3">
          Paste only physician-provided facts. The assistant is instructed to improve wording without adding symptoms, treatments, medical necessity claims, or coverage assertions.
        </p>
        <TextAreaInput
          rows={3}
          value={claim.clinicalJustification}
          onChange={(event) => update("clinicalJustification", event.target.value)}
          placeholder="Example: persistent low back pain; lumbar MRI requested for further evaluation."
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={onImprove} disabled={aiBusy} icon={<Sparkles className="w-3.5 h-3.5" />}>
            {aiBusy ? "Improving..." : "Improve wording"}
          </Button>
          {claim.aiJustification && (
            <Button size="sm" onClick={() => update("clinicalJustification", claim.aiJustification ?? "")}>
              Use improved version
            </Button>
          )}
        </div>
        {claim.aiJustification && (
          <div className="mt-3 rounded-lg bg-white border border-violet-100 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1">Suggested wording</p>
            <p className="text-sm text-gray-700 leading-relaxed">{claim.aiJustification}</p>
          </div>
        )}
        {aiNote && <p className="text-xs text-violet-700 mt-2">{aiNote}</p>}
        <label className="mt-3 flex items-start gap-2 text-xs text-violet-800 cursor-pointer">
          <input type="checkbox" checked={claim.clinicalJustificationReviewed} onChange={(event) => update("clinicalJustificationReviewed", event.target.checked)} className="mt-0.5 accent-[#1A5FA8]" />
          <span>I confirm the treating physician/user reviewed this wording against the source clinical facts before use.</span>
        </label>
      </div>

      {isHospitalization && (
        <div className="text-xs text-gray-500 flex gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Hospital workflows can differ significantly between elective and emergency admissions. ClaimBot keeps them separate rather than assuming the same checklist.
        </div>
      )}
    </div>
  );
}

function DocumentationStep({
  claim,
  expectedDocuments,
  updateDocument,
  update,
}: {
  claim: ClaimDraft;
  expectedDocuments: ReturnType<typeof getExpectedDocumentRules>;
  updateDocument: (key: keyof ClaimDocuments, value: boolean) => void;
  update: <K extends keyof ClaimDraft>(key: K, value: ClaimDraft[K]) => void;
}) {
  const uniqueDocuments = expectedDocuments.filter((rule, index, array) =>
    array.findIndex((candidate) => candidate.target === rule.target) === index,
  );

  function addFiles(files: FileList | null) {
    if (!files) return;
    const additions = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
    }));
    const currentIds = new Set(claim.attachments.map((file) => file.id));
    update("attachments", [...claim.attachments, ...additions.filter((file) => !currentIds.has(file.id))]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Documentation Checklist</h3>
        <p className="text-xs text-gray-500 mt-1">Check only documents you actually have. File names alone do not count as rule validation in this prototype.</p>
      </div>

      {uniqueDocuments.length > 0 ? (
        <div className="space-y-2.5">
          {uniqueDocuments.map((rule) => {
            const key = rule.target?.replace("documents.", "") as keyof ClaimDocuments;
            return (
              <label key={rule.target} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={Boolean(claim.documents[key])}
                  onChange={(event) => updateDocument(key, event.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#1A5FA8]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{DOCUMENT_LABELS[key] ?? rule.label}</span>
                    <Badge className={rule.requirementLevel === "conditional" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                      {rule.requirementLevel === "conditional" ? "Conditional" : "Required"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rule.explanation}</p>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No verified document checklist for this exact combination</p>
            <p className="text-xs text-amber-800 mt-1">You can still record attachments, but ClaimBot will return REVIEW REQUIRED and tell you to verify directly with the payer/TPA.</p>
          </div>
        </div>
      )}

      <div className="pt-2">
        <FieldLabel>Optional supporting file attachments</FieldLabel>
        <label className="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer border-gray-200 hover:border-[#1A5FA8]/40 hover:bg-gray-50 block">
          <UploadCloud className="w-9 h-9 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Choose files to attach to this local demo request</p>
          <p className="text-xs text-gray-400 mt-1">The prototype stores only file metadata in browser state; it does not upload file contents.</p>
          <input type="file" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
        </label>
      </div>

      {claim.attachments.length > 0 && (
        <div className="space-y-2">
          {claim.attachments.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
              <FileText className="w-4 h-4 text-[#1A5FA8] flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
              <button
                onClick={() => update("attachments", claim.attachments.filter((item) => item.id !== file.id))}
                className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewStep({ claim, expectedDocumentCount, onRunReview }: { claim: ClaimDraft; expectedDocumentCount: number; onRunReview: () => void }) {
  const insurer = insurerById(claim.insurerId)?.name ?? claim.insurerId;
  const tpa = tpaById(claim.tpaId)?.name ?? claim.tpaId;
  const service = serviceById(claim.serviceCategory)?.label ?? claim.serviceCategory;
  const procedure = claim.serviceCategory === "diagnostic_imaging"
    ? procedureById(claim.procedureId)?.label ?? claim.procedureId
    : "Not applicable";
  const ruleSet = getRuleSetSummary(claim.tpaId);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Ready to Run ClaimBot</h3>
        <p className="text-xs text-gray-500 mt-1">Review the request context. The next screen combines documentation readiness, policy intelligence, authorization rules, and explicit unknowns.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryCell label="Patient" value={claim.patientName || "Missing"} />
        <SummaryCell label="Member ID" value={claim.memberId || "Missing"} />
        <SummaryCell label="Insurer / TPA" value={`${insurer} / ${tpa}`} />
        <SummaryCell label="NSSF" value={claim.nssfStatus === "yes" ? "Yes" : claim.nssfStatus === "no" ? "No" : "Unknown"} />
        <SummaryCell label="Request" value={claim.requestType === "preauthorization" ? "Pre-Authorization" : "Reimbursement"} />
        <SummaryCell label="Service" value={`${service}${procedure !== "Not applicable" ? ` - ${procedure}` : ""}`} />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">Loaded rule pack: {ruleSet.organizationName}</p>
        <p className="text-xs text-blue-700 mt-1 leading-relaxed">{ruleSet.coverageNote}</p>
        <p className="text-xs text-blue-700 mt-2"><strong>Expected document types currently surfaced:</strong> {expectedDocumentCount}</p>
      </div>

      <Button size="lg" className="w-full justify-center" onClick={onRunReview} icon={<CheckCircle2 className="w-4 h-4" />}>
        Run Complete ClaimBot Assessment
      </Button>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="w-4 h-4 rounded accent-[#1A5FA8]" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
