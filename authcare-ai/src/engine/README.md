# ClaimBot engines

The core decision-support logic is deterministic and split by responsibility.

## `validator.ts`
Evaluates source-backed public/admin rule packs and combines the result with policy intelligence. Outputs documentation status, readiness score for known checks, requirement findings, source coverage, five assessment dimensions, and an overall payer-review recommendation.

## `policyIntelligence.ts`
Uses structured policy fields plus locally retrieved chunks from user-supplied policy/Table of Benefits text. Outputs:
- `APPEARS COVERED`
- `APPEARS EXCLUDED`
- `LIMIT MAY APPLY`
- `POLICY INFORMATION INSUFFICIENT`
- `POLICY CONFLICT DETECTED`

This is evidence-based document assessment, not live payer coverage verification.

## `denialIntelligence.ts`
Classifies denial reasons, compares supplied denial/policy/benefit/request evidence, grades the reasonable basis for reconsideration, and generates a reviewable reconsideration package. It does not decide that a payer is legally/clinically wrong.

## `aiAssistant.ts`
Optional server-side wording/summarization helper. It can improve user/physician-provided text but must not invent clinical facts, change deterministic logic, or independently determine medical necessity.
