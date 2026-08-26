# ClaimBot working-demo script

Use synthetic/de-identified information only.

## Demo A — Incomplete request

1. New Request → load the incomplete MRI demo.
2. Run the assessment.
3. Show `NOT READY`, the missing documentation/NSSF items, source references, and “Why is this required?”.

**Point:** ClaimBot catches provider-side submission defects before payer review.

## Demo B — Complete request

1. New Request → load the complete MRI demo.
2. Run the assessment.
3. Show `DOCUMENTATION COMPLETE` and the combined recommendation.

**Point:** documentation completeness is not the same as insurer approval.

## Demo C — Policy supplied

1. In Coverage & Policy Intelligence, select **Synthetic Comprehensive Policy**.
2. Run the assessment.
3. Show the separate Policy Coverage dimension, retrieved clauses, preauthorization, NSSF, network, and limit signals.
4. Repeat with Limited, Exclusion, or Conflict policy to demonstrate safe uncertainty handling.

**Point:** patient-supplied policy evidence upgrades ClaimBot from checklist-only readiness to coverage-aware decision support.

## Demo D — Analyze denial

1. Open **Analyze Denial**.
2. Load **Potentially contestable denial**.
3. Analyze.
4. Show denial classification, policy comparison, inconsistency, supporting/missing evidence, and basis strength.

**Point:** ClaimBot can identify a plausible contradiction without claiming the insurer was definitively wrong.

## Demo E — Reconsideration package

1. From the denial analysis result, generate the reconsideration package.
2. Review the disputed reason, policy/benefit references, evidence, missing evidence, physician justification, requested reconsideration, and attachment checklist.
3. Download JSON or use Print / Save PDF.

**Point:** ClaimBot turns the analysis into an actionable, reviewable provider-side package.

## Scope statement for every demo

ClaimBot evaluates evidence available to the provider/user. It does not perform live payer eligibility checks, see remaining utilization, independently determine medical necessity, or issue an insurer authorization. The target output is **READY FOR PAYER REVIEW**, not “approved.”
