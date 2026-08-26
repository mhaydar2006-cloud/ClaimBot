import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const common = readJson("src/rules/common.json");
const ruleSets = {
  nextcare: readJson("src/rules/nextcare.json"),
  globemed: readJson("src/rules/globemed.json"),
  mednet: readJson("src/rules/mednet.json"),
  medivisa: readJson("src/rules/medivisa.json"),
  internal: readJson("src/rules/internal.json"),
  unknown: readJson("src/rules/internal.json"),
};
const sources = readJson("src/data/sources.json");
const sourceIds = new Set(sources.map((source) => source.id));

const documentKeys = [
  "insurance_card", "patient_id", "unified_prescription", "medical_report", "medical_report_mra",
  "nssf_approval", "related_results", "previous_radiology_results", "hospitalization_claim_form",
  "emergency_room_sheet", "operating_room_sheet", "discharge_summary", "itemized_invoice_receipt",
  "itemized_pharmacy_bill", "nssf_documents", "nssf_detailed_bill_receipt", "chronic_medical_report",
  "prescription_key", "preauthorization_form", "receipts_breakdown", "treatment_plan", "diagnostic_results_copies", "referral_letter",
];
const documentKeySet = new Set(documentKeys);
const allowedRequestTypes = new Set(["preauthorization", "reimbursement"]);
const allowedServices = new Set([
  "doctor_visit", "diagnostic_imaging", "physiotherapy", "medication_acute", "medication_chronic",
  "hospitalization_elective", "hospitalization_emergency",
]);
const allowedProcedures = new Set(["mri", "mra", "ct_scan", "xray", "ultrasound", "laboratory", "pet_scan", "other", "not_applicable"]);
const allowedNssfStatuses = new Set(["yes", "no", "unknown"]);
const allowedInsurers = new Set(["sna", "fidelity", "libano-suisse", "medgulf", "lia-assurex", "other"]);
const fieldTargets = new Set([
  "patientName", "dob", "mrn", "mobileNumber", "memberId", "diagnosisMotive", "physicianName", "providerName",
  "requestDate", "serviceDate", "admissionDate", "physicianSignature", "physicianStamp", "numberOfSessions",
  "medicationName", "dosage", "administration", "quantity", "duration", "physicianFees", "clinicalJustification",
]);

function integrityChecks() {
  const failures = [];
  const all = [common, ...Object.entries(ruleSets).filter(([id]) => id !== "unknown").map(([, set]) => set)];
  const ruleIds = new Set();
  for (const set of all) {
    if (!Array.isArray(set.rules)) failures.push(`${set.organizationId}: rules must be an array.`);
    for (const rule of set.rules ?? []) {
      if (ruleIds.has(rule.id)) failures.push(`Duplicate rule ID: ${rule.id}`);
      ruleIds.add(rule.id);
      if (!sourceIds.has(rule.sourceId)) failures.push(`${rule.id}: unknown sourceId ${rule.sourceId}`);
      if (!Array.isArray(rule.requestTypes) || !rule.requestTypes.length) failures.push(`${rule.id}: no requestTypes.`);
      else for (const value of rule.requestTypes) if (!allowedRequestTypes.has(value)) failures.push(`${rule.id}: invalid requestType ${value}.`);
      if (!Array.isArray(rule.services) || !rule.services.length) failures.push(`${rule.id}: no services.`);
      else for (const value of rule.services) if (!allowedServices.has(value)) failures.push(`${rule.id}: invalid service ${value}.`);
      if (rule.procedures) for (const value of rule.procedures) if (!allowedProcedures.has(value)) failures.push(`${rule.id}: invalid procedure ${value}.`);
      if (rule.insurerIds) for (const value of rule.insurerIds) if (!allowedInsurers.has(value)) failures.push(`${rule.id}: invalid insurer ${value}.`);
      if (rule.condition?.procedures) for (const value of rule.condition.procedures) if (!allowedProcedures.has(value)) failures.push(`${rule.id}: invalid conditional procedure ${value}.`);
      if (rule.condition?.insurerIds) for (const value of rule.condition.insurerIds) if (!allowedInsurers.has(value)) failures.push(`${rule.id}: invalid conditional insurer ${value}.`);
      if (rule.condition?.nssfStatuses) for (const value of rule.condition.nssfStatuses) if (!allowedNssfStatuses.has(value)) failures.push(`${rule.id}: invalid NSSF condition ${value}.`);
      if (!["field", "document", "workflow", "deadline"].includes(rule.kind)) failures.push(`${rule.id}: invalid kind.`);
      if (!["required", "conditional", "informational"].includes(rule.requirementLevel)) failures.push(`${rule.id}: invalid requirementLevel.`);
      if (!["verified", "conditional", "internal"].includes(rule.verification)) failures.push(`${rule.id}: invalid verification.`);
      if (rule.kind === "document") {
        const key = rule.target?.replace("documents.", "");
        if (!rule.target?.startsWith("documents.") || !documentKeySet.has(key)) failures.push(`${rule.id}: invalid document target ${rule.target}`);
      }
      if ((rule.kind === "field" || rule.kind === "deadline") && !fieldTargets.has(rule.target)) failures.push(`${rule.id}: invalid field/deadline target ${rule.target}`);
      if (rule.kind === "workflow" && rule.requirementLevel !== "informational") failures.push(`${rule.id}: workflow rules must be informational.`);
      if (rule.kind !== "workflow" && rule.requirementLevel !== "informational" && !rule.target) failures.push(`${rule.id}: scoreable rule has no target.`);
      if (rule.kind === "deadline" && (!Number.isInteger(rule.deadlineDays) || rule.deadlineDays <= 0)) failures.push(`${rule.id}: deadline rule needs a positive integer deadlineDays.`);
      if (/approval probability|denial probability|guaranteed coverage|claim approved/i.test(`${rule.label} ${rule.explanation} ${rule.action ?? ""}`)) {
        failures.push(`${rule.id}: forbidden approval-prediction language.`);
      }
    }
  }
  return failures;
}

function emptyDocuments() {
  return Object.fromEntries(documentKeys.map((key) => [key, false]));
}

function baseClaim() {
  return {
    patientName: "Synthetic Test Patient", dob: "1985-05-12", mrn: "TEST-LB-001", mobileNumber: "+961 70 000 000",
    insurerId: "sna", tpaId: "nextcare", memberId: "TEST-POLICY-001", nssfStatus: "no",
    requestType: "preauthorization", serviceCategory: "diagnostic_imaging", procedureId: "mri", procedureOther: "",
    diagnosisMotive: "Synthetic clinical motive for rules-engine testing", physicianName: "Dr. Test Physician",
    providerName: "Synthetic Test Clinic", requestDate: "2026-08-19", serviceDate: "", admissionDate: "",
    physicianSignature: true, physicianStamp: true, numberOfSessions: "", medicationName: "", dosage: "",
    administration: "", quantity: "", duration: "", physicianFees: "", clinicalJustification: "",
    aiJustification: "", documents: emptyDocuments(), attachments: [],
  };
}

function pathValue(object, pathValueString) {
  if (!pathValueString) return undefined;
  return pathValueString.split(".").reduce((value, key) => value?.[key], object);
}
function hasValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return value !== null && value !== undefined;
}
function baseRuleMatches(rule, claim) {
  if (!rule.requestTypes.includes(claim.requestType)) return false;
  if (!rule.services.includes(claim.serviceCategory)) return false;
  if (rule.procedures && !rule.procedures.includes(claim.procedureId)) return false;
  if (rule.insurerIds && !rule.insurerIds.includes(claim.insurerId)) return false;
  return true;
}
function evaluateCondition(rule, claim) {
  if (!rule.condition) return "applies";
  const condition = rule.condition;
  if (condition.insurerIds && !condition.insurerIds.includes(claim.insurerId)) return "not_applicable";
  if (condition.procedures && !condition.procedures.includes(claim.procedureId)) return "not_applicable";
  if (condition.nssfStatuses) {
    if (claim.nssfStatus === "unknown") return "unresolved";
    if (!condition.nssfStatuses.includes(claim.nssfStatus)) return "not_applicable";
  }
  return "applies";
}
function daysBetween(dateValue, now) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((now.getTime() - parsed.getTime()) / 86_400_000);
}
function evaluateRule(rule, claim, now) {
  if (!baseRuleMatches(rule, claim)) return null;
  const conditionState = evaluateCondition(rule, claim);
  if (conditionState === "not_applicable") return null;
  const base = { ruleId: rule.id, label: rule.label, state: "", requirementLevel: rule.requirementLevel };
  if (rule.requirementLevel === "informational" || rule.kind === "workflow") return { ...base, state: "informational" };
  if (conditionState === "unresolved") return { ...base, state: "unresolved" };
  if (rule.kind === "deadline") {
    const rawDate = pathValue(claim, rule.target);
    if (typeof rawDate !== "string" || !rawDate.trim()) return { ...base, state: "missing" };
    const elapsed = daysBetween(rawDate, now);
    if (elapsed === null || elapsed < 0) return { ...base, state: "unresolved" };
    if (rule.deadlineDays && elapsed > rule.deadlineDays) return { ...base, state: "late" };
    return { ...base, state: "completed" };
  }
  const satisfied = hasValue(pathValue(claim, rule.target));
  if (rule.requirementLevel === "conditional" && !rule.condition && !satisfied) return { ...base, state: "unresolved" };
  return { ...base, state: satisfied ? "completed" : "missing" };
}
function coverage(claim, external) {
  const scored = external.filter((item) => item.state !== "informational");
  if (!scored.length) return "unavailable";
  if (claim.tpaId === "nextcare") {
    if (claim.requestType === "preauthorization" && claim.serviceCategory === "diagnostic_imaging" && claim.nssfStatus === "yes" && !["mri", "ct_scan"].includes(claim.procedureId)) return "partial";
    return "verified";
  }
  if (claim.tpaId === "medivisa") return "verified";
  if (claim.tpaId === "globemed" && claim.insurerId === "libano-suisse" && claim.requestType === "preauthorization" && ["hospitalization_elective", "hospitalization_emergency"].includes(claim.serviceCategory)) return "verified";
  return "partial";
}
function validate(claim, now = new Date("2026-08-19T12:00:00+03:00")) {
  const payer = ruleSets[claim.tpaId] ?? ruleSets.unknown;
  const commonEvaluated = common.rules.map((r) => evaluateRule(r, claim, now)).filter(Boolean);
  const external = payer.rules.map((r) => evaluateRule(r, claim, now)).filter(Boolean);
  const all = [...commonEvaluated, ...external];
  const missing = all.filter((i) => i.state === "missing");
  const unresolved = all.filter((i) => i.state === "unresolved");
  const late = all.filter((i) => i.state === "late");
  const completed = all.filter((i) => i.state === "completed");
  const payerRuleCount = external.filter((i) => i.state !== "informational").length;
  const cov = coverage(claim, external);
  const scoreable = all.filter((i) => ["completed", "missing", "late", "unresolved"].includes(i.state));
  const score = payerRuleCount === 0 || scoreable.length === 0 ? null : Math.round(completed.length / scoreable.length * 100);
  let status;
  if (payerRuleCount === 0) status = "REVIEW REQUIRED";
  else if (missing.length || late.length) status = "NOT READY";
  else if (unresolved.length || cov !== "verified") status = "REVIEW REQUIRED";
  else status = "DOCUMENTATION COMPLETE";
  return { status, score, missing: missing.map((x) => x.label), unresolved: unresolved.map((x) => x.label), late: late.map((x) => x.label) };
}

function nextcareMri(nssf = "yes") {
  const c = baseClaim(); c.insurerId = "sna"; c.tpaId = "nextcare"; c.nssfStatus = nssf; c.requestType = "preauthorization"; c.serviceCategory = "diagnostic_imaging"; c.procedureId = "mri";
  Object.assign(c.documents, { unified_prescription: true, insurance_card: true, patient_id: true, nssf_approval: nssf === "yes" });
  return c;
}
function nextcareHospital(related = true) {
  const c = baseClaim(); c.tpaId = "nextcare"; c.insurerId = "sna"; c.nssfStatus = "yes"; c.serviceCategory = "hospitalization_elective"; c.procedureId = "not_applicable"; c.admissionDate = "2026-08-25";
  Object.assign(c.documents, { medical_report_mra: true, insurance_card: true, patient_id: true, related_results: related, nssf_approval: true }); return c;
}
function medivisaMri(nssf = "yes") {
  const c = baseClaim(); c.insurerId = "medgulf"; c.tpaId = "medivisa"; c.nssfStatus = nssf; c.serviceCategory = "diagnostic_imaging"; c.procedureId = "mri";
  Object.assign(c.documents, { medical_report: true, unified_prescription: true, insurance_card: true, patient_id: true, nssf_approval: nssf === "yes" }); return c;
}
function mednet(date) {
  const c = baseClaim(); c.insurerId = "fidelity"; c.tpaId = "mednet"; c.requestType = "reimbursement"; c.serviceCategory = "doctor_visit"; c.procedureId = "not_applicable"; c.serviceDate = date;
  Object.assign(c.documents, { receipts_breakdown: true, medical_report: true, treatment_plan: true, diagnostic_results_copies: true }); return c;
}

const cases = [];
let c;
c = nextcareMri("yes"); c.physicianStamp = false; c.documents.nssf_approval = false; cases.push(["NC-MRI-001", c, "NOT READY", ["Physician stamp confirmed", "Applicable NSSF prior approval"], [], []]);
cases.push(["NC-MRI-002", nextcareMri("yes"), "DOCUMENTATION COMPLETE", [], [], []]);
c = nextcareMri("unknown"); c.documents.nssf_approval = false; cases.push(["NC-MRI-003", c, "REVIEW REQUIRED", [], ["Applicable NSSF prior approval"], []]);
cases.push(["NC-MRI-004", nextcareMri("no"), "DOCUMENTATION COMPLETE", [], [], []]);
cases.push(["NC-HOSP-001", nextcareHospital(true), "DOCUMENTATION COMPLETE", [], [], []]);
cases.push(["NC-HOSP-002", nextcareHospital(false), "NOT READY", ["Related procedure / test results"], [], []]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="hospitalization_emergency"; c.procedureId="not_applicable"; c.documents.insurance_card=true; c.documents.patient_id=true; cases.push(["NC-ER-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="medication_acute"; c.procedureId="not_applicable"; c.documents.unified_prescription=true; c.documents.insurance_card=true; c.documents.patient_id=true; cases.push(["NC-MED-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="medication_chronic"; c.procedureId="not_applicable"; c.documents.preauthorization_form=true; cases.push(["NC-MED-002",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="fidelity"; c.tpaId="nextcare"; c.requestType="reimbursement"; c.serviceCategory="doctor_visit"; c.procedureId="not_applicable"; c.physicianFees="Synthetic fee"; c.documents.unified_prescription=true; c.documents.insurance_card=true; c.documents.patient_id=true; cases.push(["NC-REIMB-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.requestType="reimbursement"; c.serviceCategory="physiotherapy"; c.procedureId="not_applicable"; c.documents.unified_prescription=true; c.documents.previous_radiology_results=true; c.documents.itemized_invoice_receipt=true; c.documents.insurance_card=true; c.documents.patient_id=true; cases.push(["NC-REIMB-002",c,"NOT READY",["Number of physiotherapy sessions"],[],[]]);
cases.push(["MV-MRI-001", medivisaMri("yes"), "DOCUMENTATION COMPLETE", [], [], []]);
c = medivisaMri("unknown"); c.documents.nssf_approval=false; cases.push(["MV-MRI-002",c,"REVIEW REQUIRED",[],["NSSF prior approval for applicable services"],[]]);
c = baseClaim(); c.insurerId="medgulf"; c.tpaId="medivisa"; c.serviceCategory="hospitalization_elective"; c.procedureId="not_applicable"; c.documents.hospitalization_claim_form=true; c.documents.related_results=true; cases.push(["MV-HOSP-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="libano-suisse"; c.tpaId="globemed"; c.serviceCategory="hospitalization_elective"; c.procedureId="not_applicable"; c.documents.medical_report_mra=true; c.documents.insurance_card=true; c.documents.patient_id=true; cases.push(["GM-HOSP-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="other"; c.tpaId="globemed"; c.serviceCategory="diagnostic_imaging"; c.procedureId="mri"; cases.push(["GM-UNSUPPORTED-001",c,"REVIEW REQUIRED",[],[],[]]);
cases.push(["MN-REIMB-001",mednet("2026-08-01"),"REVIEW REQUIRED",[],[],[]]);
cases.push(["MN-REIMB-002",mednet("2026-05-01"),"NOT READY",[],[],["Lebanon reimbursement submission window"]]);
c = baseClaim(); c.insurerId="lia-assurex"; c.tpaId="internal"; cases.push(["INT-001",c,"REVIEW REQUIRED",[],[],[]]);
c = nextcareMri("no"); c.patientName=""; cases.push(["COMMON-001",c,"NOT READY",["Patient full name"],[],[]]);
cases.push(["MN-DATE-001",mednet("2026-08-25"),"REVIEW REQUIRED",[],["Lebanon reimbursement submission window"],[]]);

// Expanded regression matrix: common intake, unsupported combinations, service variations, timing and NSSF edge cases.
c = nextcareMri("no"); c.dob=""; cases.push(["COMMON-002",c,"NOT READY",["Date of birth"],[],[]]);
c = nextcareMri("no"); c.memberId=""; cases.push(["COMMON-003",c,"NOT READY",["Insurance member / policy identifier"],[],[]]);
c = nextcareMri("no"); c.diagnosisMotive=""; cases.push(["COMMON-004",c,"NOT READY",["Diagnosis / clinical motive"],[],[]]);
c = nextcareMri("no"); c.physicianName=""; cases.push(["COMMON-005",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = nextcareMri("no"); c.providerName=""; cases.push(["COMMON-006",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = nextcareMri("no"); c.requestDate=""; cases.push(["COMMON-007",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = nextcareMri("no"); c.physicianSignature=false; cases.push(["COMMON-008",c,"NOT READY",["Physician signature confirmed"],[],[]]);
c = nextcareMri("no"); c.physicianStamp=false; cases.push(["COMMON-009",c,"NOT READY",["Physician stamp confirmed"],[],[]]);

c = nextcareMri("yes"); c.procedureId="ct_scan"; cases.push(["NC-CT-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = nextcareMri("yes"); c.procedureId="mra"; cases.push(["NC-MRA-001",c,"REVIEW REQUIRED",[],[],[]]);
c = nextcareMri("no"); c.procedureId="xray"; cases.push(["NC-XRAY-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = nextcareMri("no"); c.procedureId="ultrasound"; cases.push(["NC-US-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = nextcareMri("no"); c.procedureId="laboratory"; cases.push(["NC-LAB-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);

c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="physiotherapy"; c.procedureId="not_applicable"; c.nssfStatus="no"; c.numberOfSessions="10"; Object.assign(c.documents,{unified_prescription:true,insurance_card:true,patient_id:true}); cases.push(["NC-PHYS-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="physiotherapy"; c.procedureId="not_applicable"; c.nssfStatus="yes"; c.numberOfSessions="10"; Object.assign(c.documents,{unified_prescription:true,insurance_card:true,patient_id:true,nssf_approval:false}); cases.push(["NC-PHYS-002",c,"NOT READY",[],[],[]]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="medication_acute"; c.procedureId="not_applicable"; c.documents.unified_prescription=true; c.documents.insurance_card=true; c.documents.patient_id=false; cases.push(["NC-MED-003",c,"NOT READY",[],[],[]]);
c = baseClaim(); c.insurerId="sna"; c.tpaId="nextcare"; c.serviceCategory="medication_chronic"; c.procedureId="not_applicable"; c.documents.preauthorization_form=false; cases.push(["NC-MED-004",c,"NOT READY",[],[],[]]);

c = baseClaim(); c.insurerId="medgulf"; c.tpaId="medivisa"; c.serviceCategory="hospitalization_emergency"; c.procedureId="not_applicable"; c.nssfStatus="no"; Object.assign(c.documents,{hospitalization_claim_form:true,insurance_card:true,patient_id:true}); cases.push(["MV-ER-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="medgulf"; c.tpaId="medivisa"; c.serviceCategory="hospitalization_elective"; c.procedureId="not_applicable"; c.documents.hospitalization_claim_form=true; c.documents.related_results=false; cases.push(["MV-HOSP-002",c,"NOT READY",[],[],[]]);
c = medivisaMri("no"); c.documents.medical_report=false; cases.push(["MV-MRI-003",c,"NOT READY",[],[],[]]);

c = baseClaim(); c.insurerId="libano-suisse"; c.tpaId="globemed"; c.serviceCategory="hospitalization_emergency"; c.procedureId="not_applicable"; c.nssfStatus="no"; c.documents.insurance_card=true; c.documents.patient_id=true; c.documents.medical_report_mra=true; cases.push(["GM-ER-001",c,"DOCUMENTATION COMPLETE",[],[],[]]);
c = baseClaim(); c.insurerId="libano-suisse"; c.tpaId="globemed"; c.serviceCategory="hospitalization_elective"; c.procedureId="not_applicable"; c.documents.medical_report_mra=false; c.documents.insurance_card=true; c.documents.patient_id=true; cases.push(["GM-HOSP-002",c,"NOT READY",[],[],[]]);
c = baseClaim(); c.insurerId="other"; c.tpaId="globemed"; c.requestType="reimbursement"; c.serviceCategory="doctor_visit"; c.procedureId="not_applicable"; cases.push(["GM-UNSUPPORTED-002",c,"REVIEW REQUIRED",[],[],[]]);

cases.push(["MN-REIMB-003",mednet("2026-08-18"),"REVIEW REQUIRED",[],[],[]]);
c = mednet(""); cases.push(["MN-REIMB-004",c,"NOT READY",["Lebanon reimbursement submission window"],[],[]]);
c = mednet("2026-09-01"); cases.push(["MN-REIMB-005",c,"REVIEW REQUIRED",[],["Lebanon reimbursement submission window"],[]]);
c = baseClaim(); c.insurerId="fidelity"; c.tpaId="mednet"; c.requestType="preauthorization"; c.serviceCategory="diagnostic_imaging"; c.procedureId="mri"; cases.push(["MN-PREAUTH-001",c,"REVIEW REQUIRED",[],[],[]]);

c = baseClaim(); c.insurerId="fidelity"; c.tpaId="unknown"; cases.push(["UNKNOWN-001",c,"REVIEW REQUIRED",[],[],[]]);
c = baseClaim(); c.insurerId="other"; c.tpaId="unknown"; c.serviceCategory="hospitalization_elective"; c.procedureId="not_applicable"; cases.push(["UNKNOWN-002",c,"REVIEW REQUIRED",[],[],[]]);
c = baseClaim(); c.insurerId="lia-assurex"; c.tpaId="internal"; c.patientName=""; cases.push(["INT-002",c,"REVIEW REQUIRED",["Patient full name"],[],[]]);

const failures = integrityChecks();
if (failures.length) {
  console.error("\nRULE INTEGRITY FAILURES");
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
}

let passed = 0;
console.log(`\nClaimBot deterministic rule self-test (${cases.length} scenarios)`);
for (const [id, claim, expectedStatus, expectedMissing, expectedUnresolved, expectedLate] of cases) {
  const result = validate(claim);
  const localFailures = [];
  if (result.status !== expectedStatus) localFailures.push(`status expected ${expectedStatus}, got ${result.status}`);
  for (const item of expectedMissing) if (!result.missing.includes(item)) localFailures.push(`missing expected item: ${item}`);
  for (const item of expectedUnresolved) if (!result.unresolved.includes(item)) localFailures.push(`unresolved expected item: ${item}`);
  for (const item of expectedLate) if (!result.late.includes(item)) localFailures.push(`timing expected item: ${item}`);
  if (!localFailures.length) {
    passed += 1;
    console.log(`  ✓ ${id} — ${result.status}${result.score == null ? "" : ` (${result.score}%)`}`);
  } else {
    console.error(`  ✗ ${id} — ${localFailures.join("; ")}`);
  }
}

console.log(`\nScenario result: ${passed}/${cases.length} passed`);
console.log(`Integrity result: ${failures.length === 0 ? "PASS" : `${failures.length} failure(s)`}`);

if (passed !== cases.length || failures.length) process.exit(1);
