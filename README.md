# ClaimBot Lebanon — Decision-Support Prototype v0.3

ClaimBot is a React + Vite + TypeScript prototype for Lebanese medical claim/preauthorization preparation, policy intelligence, denial analysis, and reconsideration support.

The design deliberately separates **provider-side assessment** from **payer authority**. ClaimBot can say a request is documentation-complete, apparently covered by supplied policy evidence, limited/excluded, or ready for payer review. It does not claim that an insurer has approved a request, does not perform live eligibility/utilization checks, and does not independently determine medical necessity.

## Implemented product layers

### 1. Claim Readiness
- Five-step request workflow: Patient → Coverage & Policy → Service → Documentation → Review.
- Lebanese insurer/TPA mapping for SNA, Fidelity, Libano-Suisse, MEDGULF, LIA Assurex + Other; Nextcare, GlobeMed Lebanon, MedNet Liban, MediVisa, Internal/Unknown.
- Deterministic JSON rule packs with NSSF-aware conditions.
- Documentation outcomes: `DOCUMENTATION COMPLETE`, `NOT READY`, `REVIEW REQUIRED`.
- Readiness score only for known, scoreable provider-side checks.
- Missing, unresolved, late/timing, completed, and workflow findings.

### 2. Policy Intelligence
- Structured policy fields: plan, benefit category, annual limit, deductible, coinsurance, network restriction, preauthorization, NSSF coordination, exclusions, sublimits/remaining amount, and session limits.
- Paste policy/Table of Benefits text or load `.txt`, `.md`, or `.json` text files.
- Local retrieval/chunk matching over supplied policy text; no external vector service is required for the demo.
- Policy outcomes: `APPEARS COVERED`, `APPEARS EXCLUDED`, `LIMIT MAY APPLY`, `POLICY INFORMATION INSUFFICIENT`, `POLICY CONFLICT DETECTED`.
- Five synthetic policies: comprehensive, limited, exclusion, NSSF-coordinated, and conflict.

### 3. Combined Assessment
- Separate result dimensions for Documentation, Policy Coverage, Eligibility, Authorization Rules, and Clinical Criteria.
- Overall recommendation uses `READY FOR PAYER REVIEW`, `CORRECT BEFORE SUBMISSION`, `VERIFY WITH PAYER`, or `REVIEW POLICY ISSUE`.
- Policy evidence and authoritative public rule sources are shown separately.
- “Why is this required?” links point back to rule sources.

### 4. Denial Intelligence
- Dedicated **Analyze Denial** screen.
- Classifies: administrative deficiency, exclusion, exhausted benefit, missing preauthorization, NSSF issue, insufficient clinical evidence, possible inconsistency, or insufficient information.
- Compares denial text with the original request, policy assessment, documentation, and known rule signals.
- Five denial demo cases cover legitimate exclusion, missing paperwork, contestable contradiction, exhausted limit, and insufficient information.

### 5. Appeal / Reconsideration
- Grades reconsideration basis as `STRONG`, `POSSIBLE`, `WEAK`, or `INSUFFICIENT`.
- Generates a reviewable package with denial summary, disputed reason, policy/benefit references, supporting evidence, missing evidence, physician justification, requested reconsideration, and attachment checklist.
- JSON download and Print / Save PDF are supported.

### 6. Medical-justification assistant
- User/doctor provides rough clinical notes.
- Optional server-side AI helper improves wording; safe local formatting remains available without an API key.
- Explicit clinician/user review is required in the workflow.
- The assistant never independently decides medical necessity.

### 7. Source registry and safe-failure rules
- Each rule source can record organization, document, URL/reference, section, access date, version, verification status, and scope.
- Public-source packs cover only what is supportable from authoritative material.
- Unknown or insufficiently verified service/TPA combinations return `REVIEW REQUIRED` rather than invented rules.

## Run locally

```bash
cd authcare-ai
npm ci
npm run dev
```

Vite normally prints `http://localhost:5173`.

## Release verification

Dependency-free behavioral tests:

```bash
npm test
```

The current suite contains:
- **51/51** deterministic claim/readiness scenarios.
- **14/14** policy/denial behavioral fixtures.
- rule and implementation-contract integrity checks.
- project integrity checks.

Full release gate after dependencies are installed:

```bash
npm run verify
```

This runs tests, TypeScript, production build, and ESLint.

## Fast demo paths

- **Incomplete request:** New Request → Load Incomplete MRI Demo → run assessment.
- **Complete request:** New Request → Load Complete MRI Demo → run assessment.
- **Policy:** select one of the synthetic policies under Coverage & Policy Intelligence and compare coverage/limit/exclusion/conflict outcomes.
- **Denial:** Analyze Denial → load one of the five demo cases → analyze.
- **Appeal:** generate a reconsideration package from the denial result.

See `DEMO_SCRIPT.md` for the presentation flow.

## Optional OpenAI helper

The core product does **not** require AI or an API key. Optional server-side endpoints:
- `/api/improve-justification`
- `/api/summarize-policy`

Configure only on the server/deployment platform:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
```

Never expose the secret through a `VITE_*` client variable.

## Deployment

A Vercel configuration is included. See `DEPLOYMENT.md`. The external Vercel account action and production-browser acceptance run remain manual team tasks.

## Project safety / scope

- Use synthetic or de-identified data for the prototype.
- ClaimBot does not possess payer credentials or insurer authority.
- Apparent policy coverage is based only on policy evidence supplied to the app.
- Live eligibility, remaining utilization, direct submission, live payer status, private denial codes, unpublished medical-necessity criteria, actual adjudication, insurer approval/denial authority, and settlement require payer/TPA cooperation.
- Optional AI output is assistive text and never overrides deterministic readiness/policy logic.

## Architecture map

- `src/rules/*.json` — deterministic public/internal rule packs.
- `src/data/sources.json` — source registry.
- `src/data/syntheticPolicies.ts` — demo policy profiles.
- `src/engine/validator.ts` — readiness + combined assessment.
- `src/engine/policyIntelligence.ts` — policy retrieval/assessment.
- `src/engine/denialIntelligence.ts` — denial analysis + appeal package.
- `src/pages/DenialAnalysis.tsx` — denial UI.
- `src/tests/scenarios.ts` — in-app synthetic scenarios.
- `scripts/rules-self-test.mjs` — 51 scenario regression suite.
- `scripts/intelligence-self-test.mjs` — policy/denial fixture suite.
- `scripts/project-self-check.mjs` — structural/safety guard.

For implementation status and the exact manual handoff, see `ROADMAP_COMPLETION.md`, `TASK_STATUS.md`, and `TESTING_CHECKLIST.md`.
