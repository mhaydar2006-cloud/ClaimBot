import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const failures = [];
const notes = [];

const requiredFiles = [
  "src/App.tsx",
  "src/pages/NewAuthorization.tsx",
  "src/pages/AIReviewResults.tsx",
  "src/pages/GeneratedDocument.tsx",
  "src/pages/Settings.tsx",
  "src/engine/validator.ts",
  "src/engine/policyIntelligence.ts",
  "src/engine/denialIntelligence.ts",
  "src/data/syntheticPolicies.ts",
  "src/types/denial.ts",
  "src/pages/DenialAnalysis.tsx",
  "src/data/insuranceData.ts",
  "src/data/sources.json",
  "src/rules/common.json",
  "src/rules/nextcare.json",
  "src/rules/medivisa.json",
  "src/rules/globemed.json",
  "src/rules/mednet.json",
  "src/rules/internal.json",
  "src/tests/scenarios.ts",
  "scripts/intelligence-self-test.mjs",
  "ROADMAP_COMPLETION.md",
  "DEMO_SCRIPT.md",
  "DEPLOYMENT.md",
  "vercel.json",
  ".env.example",
  "TESTING_CHECKLIST.md",
  "SOURCE_NOTES.md",
  "TASK_STATUS.md",
];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing required project file: ${relative}`);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(target));
    else output.push(target);
  }
  return output;
}

// Protect against accidental re-introduction of the old US demo product into user-visible source.
const userVisibleFiles = [
  ...walk(path.join(root, "src/pages")),
  ...walk(path.join(root, "src/components")),
  path.join(root, "src/data/mockData.ts"),
].filter((file) => /\.(ts|tsx|css)$/.test(file));

const forbiddenLegacy = [
  /AuthCare\s*AI/i,
  /Blue\s*Cross/i,
  /Aetna/i,
  /UnitedHealthcare/i,
  /Humira/i,
  /Ozempic/i,
  /approval probability/i,
  /denial probability/i,
  /guaranteed coverage/i,
];

for (const file of userVisibleFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of forbiddenLegacy) {
    if (pattern.test(text)) failures.push(`${path.relative(root, file)} contains forbidden legacy/demo language matching ${pattern}.`);
  }
}

// Source registry sanity.
try {
  const sources = JSON.parse(read("src/data/sources.json"));
  const ids = new Set();
  for (const source of sources) {
    if (!source.id || ids.has(source.id)) failures.push(`Duplicate or empty source id: ${String(source.id)}`);
    ids.add(source.id);
    if (!source.organization || !source.title || !source.accessed || !source.scope || !source.section || !source.version || !source.verificationStatus) {
      failures.push(`Incomplete source record: ${source.id ?? "unknown"}`);
    }
    if (!["verified", "partial", "internal"].includes(source.verificationStatus)) {
      failures.push(`${source.id}: unsupported verification status ${String(source.verificationStatus)}.`);
    }
    if (source.url && !/^https:\/\//i.test(source.url)) failures.push(`${source.id}: source URL is not HTTPS.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessed)) failures.push(`${source.id}: accessed date is not YYYY-MM-DD.`);
  }
  notes.push(`${sources.length} source records parsed.`);
} catch (error) {
  failures.push(`sources.json failed to parse: ${error instanceof Error ? error.message : String(error)}`);
}

// Rule JSON must parse even before the deeper rules-self-test runs.
const ruleFiles = ["common", "nextcare", "medivisa", "globemed", "mednet", "internal"];
for (const name of ruleFiles) {
  try {
    const set = JSON.parse(read(`src/rules/${name}.json`));
    if (!Array.isArray(set.rules)) failures.push(`${name}.json has no rules array.`);
    notes.push(`${name}.json: ${(set.rules ?? []).length} rules.`);
  } catch (error) {
    failures.push(`${name}.json failed to parse: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Server-side API key safety: never place the secret in Vite/client environment variables or source literals.
for (const file of [...walk(path.join(root, "src")), ...walk(path.join(root, "api"))]) {
  if (!/\.(ts|tsx|js|json)$/.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/VITE_[A-Z0-9_]*OPENAI[A-Z0-9_]*/i.test(text)) failures.push(`${path.relative(root, file)} exposes OpenAI configuration through a VITE_* client variable.`);
  if (/\bsk-[A-Za-z0-9_-]{16,}\b/.test(text)) failures.push(`${path.relative(root, file)} appears to contain a literal API key.`);
}

const envExample = read(".env.example");
if (!envExample.includes("OPENAI_API_KEY=")) failures.push(".env.example should document OPENAI_API_KEY.");
if (!envExample.includes("OPENAI_MODEL=gpt-5.6")) failures.push(".env.example should document the current default OPENAI_MODEL.");

const pkg = JSON.parse(read("package.json"));
for (const script of ["dev", "build", "lint", "typecheck", "test", "test:rules", "test:intelligence", "test:project", "verify"]) {
  if (!pkg.scripts?.[script]) failures.push(`package.json is missing npm script: ${script}`);
}


// Product-contract checks for the roadmap layers.
const policyEngine = read("src/engine/policyIntelligence.ts");
for (const status of [
  "APPEARS COVERED",
  "APPEARS EXCLUDED",
  "LIMIT MAY APPLY",
  "POLICY INFORMATION INSUFFICIENT",
  "POLICY CONFLICT DETECTED",
]) {
  if (!policyEngine.includes(status)) failures.push(`Policy engine is missing required status: ${status}`);
}

const denialEngine = read("src/engine/denialIntelligence.ts");
for (const classification of [
  "administrative_deficiency",
  "exclusion",
  "exhausted_benefit",
  "missing_preauthorization",
  "nssf_issue",
  "insufficient_clinical_evidence",
  "possible_inconsistency",
  "insufficient_information",
]) {
  if (!denialEngine.includes(classification)) failures.push(`Denial engine is missing required classification: ${classification}`);
}
for (const basis of ["STRONG", "POSSIBLE", "WEAK", "INSUFFICIENT"]) {
  if (!denialEngine.includes(basis)) failures.push(`Denial engine is missing reconsideration basis: ${basis}`);
}

const syntheticPolicies = read("src/data/syntheticPolicies.ts");
const syntheticPolicyCount = (syntheticPolicies.match(/synthetic-/g) ?? []).length;
if (syntheticPolicyCount < 5) failures.push("Fewer than five synthetic policy identifiers were found.");

const deployConfig = JSON.parse(read("vercel.json"));
if (deployConfig.framework !== "vite" || deployConfig.outputDirectory !== "dist") failures.push("vercel.json is not configured for the Vite dist output.");

const index = read("index.html");
if (!/ClaimBot/i.test(index)) failures.push("index.html title/metadata does not contain ClaimBot.");

console.log("\nClaimBot project self-check");
notes.forEach((note) => console.log(`  • ${note}`));
console.log(`\nProject integrity result: ${failures.length === 0 ? "PASS" : `${failures.length} failure(s)`}`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
console.log("  ✓ Required files present");
console.log("  ✓ Legacy US demo content guard passed");
console.log("  ✓ Source registry parsed with provenance metadata");
console.log("  ✓ Policy/denial roadmap contracts present");
console.log("  ✓ Vercel deployment config present");
console.log("  ✓ Rule JSON parsed");
console.log("  ✓ No client-side OpenAI key pattern detected");
