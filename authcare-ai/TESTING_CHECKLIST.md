# ClaimBot v0.3 release checklist

Use synthetic/de-identified data only. Items marked **AUTOMATED** are exercised by repository scripts. Items marked **MANUAL** require a browser, deployment account, or human review.

## Automated release gate

- [x] **AUTOMATED:** `npm test` runs claim/readiness, policy/denial, and project-integrity suites.
- [x] **AUTOMATED:** rules suite contains 51 synthetic claim/readiness scenarios.
- [x] **AUTOMATED:** intelligence suite contains 14 behavioral fixtures plus implementation-contract assertions.
- [x] **AUTOMATED:** unknown/unsupported administrator combinations return safe review states instead of fabricated rules.
- [x] **AUTOMATED:** policy statuses include covered, excluded, limit, insufficient, and conflict paths.
- [x] **AUTOMATED:** denial implementation includes all eight roadmap classifications and appeal-package generation.
- [x] **AUTOMATED:** source registry parses and required provenance fields are checked.
- [x] **AUTOMATED:** no OpenAI key is embedded in client code or a `VITE_*` variable.
- [x] **AUTOMATED:** user-visible source is guarded against legacy approval/denial probability and guaranteed-coverage language.
- [x] **AUTOMATED:** `.env.example`, deployment config, policy/denial engines, synthetic policies, denial UI, and roadmap/demo docs are required project files.

Run:

```bash
npm run verify
```

Release expectation: all tests pass, TypeScript passes, Vite production build succeeds, and ESLint reports no errors.

## Claim Readiness browser acceptance

- [ ] **MANUAL:** login with the prefilled synthetic demo credentials.
- [ ] **MANUAL:** Dashboard renders request history and source-boundary cards.
- [ ] **MANUAL:** New Request → Load Incomplete MRI Demo → assessment reports `NOT READY` with the expected missing items.
- [ ] **MANUAL:** New Request → Load Complete MRI Demo → assessment reports `DOCUMENTATION COMPLETE`.
- [ ] **MANUAL:** choose an unsupported/unknown TPA combination → `REVIEW REQUIRED` and no invented checklist.
- [ ] **MANUAL:** requirements with a public source expose a working “Why is this required?” link.
- [ ] **MANUAL:** generated assessment JSON downloads successfully.
- [ ] **MANUAL:** Print / Save PDF opens a print-ready assessment.
- [ ] **MANUAL:** local request history survives a page refresh in the same browser.

## Policy Intelligence browser acceptance

- [ ] **MANUAL:** Comprehensive synthetic policy can produce `APPEARS COVERED` for a matching supported service.
- [ ] **MANUAL:** Exclusion synthetic policy produces `APPEARS EXCLUDED` for the excluded service.
- [ ] **MANUAL:** Limited synthetic policy produces `LIMIT MAY APPLY` for the limited service.
- [ ] **MANUAL:** Conflict synthetic policy produces `POLICY CONFLICT DETECTED` and displays the conflicting evidence.
- [ ] **MANUAL:** no supplied policy produces `POLICY INFORMATION INSUFFICIENT`.
- [ ] **MANUAL:** structured annual/deductible/coinsurance/network/NSSF/preauthorization/session fields are editable.
- [ ] **MANUAL:** pasted policy text is retrievable as evidence.
- [ ] **MANUAL:** `.txt`, `.md`, and `.json` policy-text uploads load in-browser.
- [ ] **MANUAL:** combined result shows Documentation, Policy Coverage, Eligibility, Authorization Rules, and Clinical Criteria separately.
- [ ] **MANUAL:** overall recommendation says payer-review/correction/verification/policy-review—not insurer approval.

## Denial / reconsideration browser acceptance

- [ ] **MANUAL:** Analyze Denial screen is reachable from navigation.
- [ ] **MANUAL:** legitimate exclusion demo classifies as exclusion and does not overstate appeal strength.
- [ ] **MANUAL:** missing-paperwork demo identifies administrative deficiency/correction path.
- [ ] **MANUAL:** contestable-denial demo identifies possible inconsistency when supplied policy evidence contradicts the denial.
- [ ] **MANUAL:** exhausted-limit demo produces a weak basis unless contradictory evidence exists.
- [ ] **MANUAL:** insufficient-information demo refuses to overstate certainty.
- [ ] **MANUAL:** generated reconsideration package contains summary, disputed reason, policy/benefit evidence, supporting/missing evidence, physician justification, requested action, and attachment checklist.
- [ ] **MANUAL:** reconsideration package JSON download works.
- [ ] **MANUAL:** Print / Save PDF works for the reconsideration package.

## Clinical-justification safety acceptance

- [ ] **MANUAL:** rough physician/user notes can be entered.
- [ ] **MANUAL:** optional improvement helper never auto-submits or changes deterministic result logic.
- [ ] **MANUAL:** explicit review checkbox is visible/required for the clinical-justification workflow.
- [ ] **MANUAL:** result never states that ClaimBot independently determined medical necessity.

## Responsive/accessibility smoke test

- [ ] **MANUAL:** desktop layout at approximately 1280px has no clipped primary actions or horizontal page overflow.
- [ ] **MANUAL:** narrow/mobile layout at approximately 390px stacks cards/forms and keeps primary actions usable.
- [ ] **MANUAL:** keyboard tab order reaches form controls and primary buttons.
- [ ] **MANUAL:** labels/status text remain understandable without relying only on color.

## Production deployment acceptance

- [ ] **MANUAL:** Vercel project root is `authcare-ai` when this folder is nested in a larger repository.
- [ ] **MANUAL:** production build completes.
- [ ] **MANUAL:** public URL loads on a clean/incognito browser session.
- [ ] **MANUAL:** run one complete claim assessment and one denial/reconsideration flow on the public URL.
- [ ] **MANUAL:** optional AI endpoints work only if server-side `OPENAI_API_KEY` is configured; core flows still work without it.
- [ ] **MANUAL:** no patient-identifying production data is used for the prototype demo.

## Product-language final check

- [ ] **MANUAL:** no screen says ClaimBot “approved” or “denied” a claim on behalf of an insurer.
- [ ] **MANUAL:** apparent policy coverage is visibly tied to supplied evidence.
- [ ] **MANUAL:** live eligibility, remaining utilization, live authorization status, and payer adjudication are clearly labeled as outside current scope.

## Provider validation — manual research

- [ ] Interview ≥1 hospital insurance/admissions employee.
- [ ] Interview ≥1 clinic secretary/insurance coordinator.
- [ ] Interview ≥1 physician.
- [ ] Record inaccuracies/missing steps, current delay causes, and whether the workflow would save time.
- [ ] Convert validated authoritative feedback into versioned rule/source updates rather than informal assumptions.
