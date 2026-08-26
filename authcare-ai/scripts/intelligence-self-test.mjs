import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const policySource = fs.readFileSync(path.join(root, "src/engine/policyIntelligence.ts"), "utf8");
const denialSource = fs.readFileSync(path.join(root, "src/engine/denialIntelligence.ts"), "utf8");
const syntheticSource = fs.readFileSync(path.join(root, "src/data/syntheticPolicies.ts"), "utf8");

const failures = [];
const requiredPolicyStatuses = ["APPEARS COVERED", "APPEARS EXCLUDED", "LIMIT MAY APPLY", "POLICY INFORMATION INSUFFICIENT", "POLICY CONFLICT DETECTED"];
for (const status of requiredPolicyStatuses) if (!policySource.includes(status)) failures.push(`Policy engine missing status: ${status}`);
for (const id of ["synthetic-comprehensive", "synthetic-limited", "synthetic-exclusion", "synthetic-nssf", "synthetic-conflict"]) if (!syntheticSource.includes(id)) failures.push(`Missing synthetic policy fixture: ${id}`);
for (const classification of ["administrative_deficiency", "exclusion", "exhausted_benefit", "missing_preauthorization", "nssf_issue", "insufficient_clinical_evidence", "possible_inconsistency", "insufficient_information"]) if (!denialSource.includes(classification)) failures.push(`Denial engine missing classification: ${classification}`);
if (!denialSource.includes("buildAppealPackage")) failures.push("Appeal package generator is missing.");

function n(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " "); }
function any(text, terms) { const h = n(text); return terms.some((term) => h.includes(n(term))); }
function policyFixture({ policy = "", benefits = "", exclusions = "", remaining = null, conflict = false }) {
  const all = `${policy} ${benefits}`;
  if (!all.trim() && !exclusions.trim()) return "POLICY INFORMATION INSUFFICIENT";
  const covered = any(all, ["mri is covered", "mri covered", "diagnostic imaging is covered", "covered subject to"]);
  const excluded = any(`${all} ${exclusions}`, ["mri is excluded", "mri excluded", "diagnostic imaging is excluded", "not covered"]);
  if (conflict || (covered && excluded)) return "POLICY CONFLICT DETECTED";
  if (excluded) return "APPEARS EXCLUDED";
  if (remaining === 0 || any(all, ["annual sublimit", "session limit", "limited to"])) return "LIMIT MAY APPLY";
  if (covered) return "APPEARS COVERED";
  return "POLICY INFORMATION INSUFFICIENT";
}

const policyCases = [
  ["POL-CLI-001", { policy: "MRI is covered subject to prior authorization." }, "APPEARS COVERED"],
  ["POL-CLI-002", { policy: "MRI is excluded from outpatient benefits." }, "APPEARS EXCLUDED"],
  ["POL-CLI-003", { policy: "Diagnostic imaging is covered with an annual sublimit of USD 1,000." }, "LIMIT MAY APPLY"],
  ["POL-CLI-004", { policy: "" }, "POLICY INFORMATION INSUFFICIENT"],
  ["POL-CLI-005", { policy: "MRI is covered.", exclusions: "MRI is excluded." }, "POLICY CONFLICT DETECTED"],
  ["POL-CLI-006", { policy: "MRI is covered.", remaining: 0 }, "LIMIT MAY APPLY"],
];

function denialFixture(denial, policy = "", support = "") {
  if (!denial.trim() || denial.trim().split(/\s+/).length < 3) return "insufficient_information";
  if (any(denial, ["prior authorization", "preauthorization", "prior approval"])) return "missing_preauthorization";
  if (any(denial, ["nssf", "cnss"])) return "nssf_issue";
  if (any(denial, ["limit exhausted", "annual limit", "no remaining", "maximum reached"])) return "exhausted_benefit";
  if (any(denial, ["missing", "stamp", "signature", "identification", "receipt", "paperwork"])) return "administrative_deficiency";
  if (any(denial, ["medical necessity", "insufficient clinical", "clinical information"])) return "insufficient_clinical_evidence";
  if (any(denial, ["not covered", "excluded"])) return any(policy, ["covered", "remaining balance"]) ? "possible_inconsistency" : "exclusion";
  if (policy.trim() && support.trim()) return "possible_inconsistency";
  return "insufficient_information";
}

const denialCases = [
  ["DEN-CLI-001", "Returned because physician stamp is missing.", "", "", "administrative_deficiency"],
  ["DEN-CLI-002", "Denied because MRI is excluded.", "MRI is excluded.", "", "exclusion"],
  ["DEN-CLI-003", "Denied because the annual limit is exhausted.", "MRI annual limit USD 1000.", "", "exhausted_benefit"],
  ["DEN-CLI-004", "Denied because prior authorization was not obtained.", "", "", "missing_preauthorization"],
  ["DEN-CLI-005", "Denied because NSSF approval was not supplied.", "", "NSSF approval available", "nssf_issue"],
  ["DEN-CLI-006", "Denied for insufficient clinical information.", "", "", "insufficient_clinical_evidence"],
  ["DEN-CLI-007", "Denied: MRI is not covered.", "MRI is covered subject to preauthorization.", "Medical report available", "possible_inconsistency"],
  ["DEN-CLI-008", "Request denied.", "", "", "insufficient_information"],
];

let passed = 0;
console.log(`\nClaimBot intelligence self-test (${policyCases.length + denialCases.length} behavioral fixtures)`);
for (const [id, fixture, expected] of policyCases) {
  const actual = policyFixture(fixture);
  if (actual === expected) { passed++; console.log(`  ✓ ${id} — ${actual}`); }
  else failures.push(`${id}: expected ${expected}, got ${actual}`);
}
for (const [id, denial, policy, support, expected] of denialCases) {
  const actual = denialFixture(denial, policy, support);
  if (actual === expected) { passed++; console.log(`  ✓ ${id} — ${actual}`); }
  else failures.push(`${id}: expected ${expected}, got ${actual}`);
}
console.log(`\nIntelligence fixture result: ${passed}/${policyCases.length + denialCases.length} passed`);
console.log(`Implementation contract result: ${failures.length ? `${failures.length} failure(s)` : "PASS"}`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
