# ClaimBot v0.3 build summary

## Delivered

ClaimBot has been upgraded from a claim-document readiness MVP into a provider-side decision-support prototype with four working layers:

1. deterministic claim/document readiness;
2. policy/Table of Benefits intelligence;
3. denial analysis;
4. reconsideration/appeal package generation.

The result screen combines these into separate Documentation, Policy Coverage, Eligibility, Authorization Rules, and Clinical Criteria dimensions while preserving payer authority boundaries.

## Core product behavior

- Known public rules are deterministic and source-backed.
- Unknown payer/TPA combinations fail safely to `REVIEW REQUIRED`.
- Policy coverage uses user-supplied/synthetic evidence and outputs `APPEARS COVERED`, `APPEARS EXCLUDED`, `LIMIT MAY APPLY`, `POLICY INFORMATION INSUFFICIENT`, or `POLICY CONFLICT DETECTED`.
- Live eligibility is `NOT VERIFIED` without payer integration.
- Clinical necessity stays `REVIEW REQUIRED`; user/physician review is required.
- Overall output is readiness for payer review, not insurer authorization.

## Data/demo assets

- Five synthetic policies with limits, exclusions, network/NSSF/preauthorization/session variations.
- Five denial cases including valid denial, paperwork correction, policy inconsistency, exhausted limit, and insufficient information.
- Source registry with provenance metadata and result-page source links.

## Verification

- Claim/readiness scenarios: **51/51 passing**.
- Policy/denial fixtures: **14/14 passing**.
- Separate integrity checks guard rule/source structure, required implementation vocabulary, secret handling, and banned legacy approval-prediction wording.
- `npm run verify` is the complete local release gate: tests + TypeScript + production build + ESLint.

## Deployment

`vercel.json` and `DEPLOYMENT.md` are included. The team must perform the account-bound Vercel deployment and run browser/device smoke tests on the resulting production URL.

## External dependencies intentionally left open

Live eligibility/utilization, payer submission/status, private denial codes, unpublished criteria, insurer adjudication/approval authority, and payment cannot be completed truthfully without insurer/TPA cooperation. Provider interviews are also a team/manual validation task.

See `ROADMAP_COMPLETION.md` for the item-by-item checklist.
