# ClaimBot self-tests

`scenarios.ts` contains synthetic regression scenarios that execute the real TypeScript `validateClaim()` path used by the app, including the policy-assessment result.

Open **Settings → QA Self-Test** and run the displayed scenario count (derived from `SELF_TESTS.length`, so the UI cannot become stale when cases are added).

The repository-level release tests also include:
- `scripts/rules-self-test.mjs` — 51 dependency-free claim/readiness scenarios plus rule-integrity checks.
- `scripts/intelligence-self-test.mjs` — 14 policy/denial behavioral fixtures plus implementation-contract checks.
- `scripts/project-self-check.mjs` — structural, provenance, deployment, secret-handling and language guards.

Coverage includes NSSF states, missing documentation, supported/unsupported TPAs, procedure variations, reimbursement timing, all five policy outcomes, all eight denial classifications, and appeal-package contract checks.

All test data is synthetic.
