# ClaimBot roadmap completion matrix

Based on the internal roadmap, all work that can be completed in code with public, user-supplied, or synthetic information is implemented. External-account actions, interviews, and payer-private integrations remain explicit handoffs.

## 1. Validate current build

- [x] Deterministic scenario suite expanded from 21 to 51 cases and passing.
- [x] Browser-local request history/dashboard retained.
- [x] JSON export retained and expanded to policy/denial outputs.
- [x] Print / Save PDF retained for assessment and reconsideration outputs.
- [x] Unsupported/unknown TPA fails safely to `REVIEW REQUIRED`.
- [x] Source registry and source links retained; result requirements expose “Why is this required?”.
- [x] Responsive layouts use narrow/mobile grid breakpoints.
- [x] Product-language guard rejects approval-probability/guaranteed-coverage legacy wording.
- [x] Claim-readiness engine remains deterministic and regression-tested.
- [ ] **MANUAL:** run the production browser acceptance checklist on desktop and a narrow/mobile viewport after deployment.

## 2. Deploy publicly

- [x] Vercel configuration added.
- [x] Deployment instructions added.
- [ ] **MANUAL:** import/push repository to the team's Vercel account, set the repository root to `authcare-ai` when needed, and deploy.
- [ ] **MANUAL:** run production URL smoke tests after deployment.

## 3. Policy Intelligence

- [x] Structured policy entry and text/JSON/Markdown upload/paste flow.
- [x] Insurer, plan, benefit category, annual limit, deductible, coinsurance, network restriction, preauthorization, NSSF coordination, exclusions, sublimits/remaining limits, and session limits represented.
- [x] Outputs: `APPEARS COVERED`, `APPEARS EXCLUDED`, `LIMIT MAY APPLY`, `POLICY INFORMATION INSUFFICIENT`, `POLICY CONFLICT DETECTED`.
- [x] Five synthetic policy profiles included.
- [x] Local clause chunking/retrieval provides evidence without requiring an external vector service.

## 4. Connect Policy Intelligence to Claim Readiness

- [x] One assessment combines documentation readiness and apparent policy coverage.
- [x] Result separates Documentation, Policy Coverage, Eligibility, Authorization Rules, and Clinical Criteria.
- [x] Network, preauthorization, NSSF, and overall submission recommendation displayed separately.
- [x] Final payer authorization remains explicitly outside ClaimBot's authority.

## 5. Denial Intelligence

- [x] Dedicated Analyze Denial workflow.
- [x] Inputs include denial reason, service, original request context, policy/Table of Benefits evidence, and supporting-evidence notes.
- [x] Classifications: administrative deficiency, exclusion, exhausted benefit, missing preauthorization, NSSF issue, insufficient clinical evidence, possible inconsistency, insufficient information.
- [x] Denial is compared against policy assessment, benefit evidence, documentation, and known rule signals.

## 6. Contest / Appeal

- [x] Reconsideration basis graded `STRONG`, `POSSIBLE`, `WEAK`, or `INSUFFICIENT`.
- [x] Package includes denial summary, disputed reason, policy/benefit references, evidence, missing evidence, physician justification, reconsideration request, and attachment checklist.
- [x] Generate/print/download reconsideration package flow.

## 7. Medical-justification assistant

- [x] Rough clinical notes can be improved through the optional server-side assistant or safe local fallback.
- [x] Explicit doctor/user review checkbox included.
- [x] Clinical Criteria remains `REVIEW REQUIRED`; AI never independently decides medical necessity.

## 8. Public rule packs

- [x] Nextcare rules retained/expanded from authoritative public material.
- [x] GlobeMed rules retained only where public evidence supports them.
- [x] MedNet rules retained only where public evidence supports them.
- [x] MediVisa rules retained/expanded from authoritative public material.
- [x] Unsupported combinations use Unknown / Verify with payer / Review Required rather than invented rules.
- [ ] **ONGOING MANUAL RESEARCH:** add new authoritative payer rules when insurers/TPAs publish or provide them.

## 9. Source Registry

- [x] Registry records organization, document title, URL/reference, section, access date, version, verification status, and scope.
- [x] Result requirements link back to the authoritative source (“Why is this required?”).

## 10. Final result page

- [x] Separate Documentation, Policy Coverage, Eligibility, Authorization Rules, Clinical Criteria dimensions.
- [x] Clear statuses including `PASS`, `APPEARS COVERED`, `NOT VERIFIED`, `INSUFFICIENT DATA`, `REVIEW REQUIRED`.
- [x] Overall recommendations use `READY FOR PAYER REVIEW` and corrective/review alternatives, never approval probability.

## 11. Synthetic policies

- [x] Comprehensive policy.
- [x] Limited policy.
- [x] Explicit exclusion policy.
- [x] NSSF-coordinated policy.
- [x] Deliberately conflicting policy.

## 12. Denial demo cases

- [x] Legitimate explicit exclusion.
- [x] Missing paperwork / correction-resubmission.
- [x] Potentially contestable “not covered” contradiction.
- [x] Exhausted limit / weak appeal basis.
- [x] Insufficient information / no overstatement.

## 13. Automated testing

- [x] 51 deterministic claim/readiness scenarios.
- [x] 14 policy/denial behavioral fixtures plus implementation-contract assertions.
- [x] Coverage includes missing documents, NSSF states, unknown TPA, unsupported workflows, covered/excluded/limited/conflicting/missing policy, denial patterns, appeal generation contracts, and incomplete information.
- [x] Project integrity guard checks required files, sources, rules, secret handling, status vocabulary, and forbidden approval language.

## 14. Provider-side validation

- [ ] **MANUAL:** interview ≥1 hospital insurance/admissions employee.
- [ ] **MANUAL:** interview ≥1 clinic secretary/insurance coordinator.
- [ ] **MANUAL:** interview ≥1 physician.
- [ ] **MANUAL:** record what ClaimBot gets wrong, missing workflow steps, delay causes, and expected time savings.

## 15. Final presentation/demo

- [x] Demo A–E scripts included in `DEMO_SCRIPT.md` and backed by working synthetic flows.
- [x] Product copy clearly separates current functionality from future payer integration.
- [ ] **MANUAL:** present/record the demos in the team's chosen slide/deck format.

## Requires insurer / TPA cooperation — intentionally not faked

- [ ] Live patient eligibility verification.
- [ ] Real-time utilization / remaining limits.
- [ ] Direct payer submission.
- [ ] Live preauthorization/claim status.
- [ ] Private denial codes.
- [ ] Unpublished medical-necessity criteria.
- [ ] Insurer-side adjudication.
- [ ] Authority to approve/deny on behalf of payer.
- [ ] Automatic payment/settlement.
