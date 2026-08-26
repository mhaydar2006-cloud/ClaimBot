# ClaimBot source notes

Last targeted public-source review for this release: **2026-08-26**. Individual records preserve their own `accessed` date in `src/data/sources.json`; sources not re-opened on August 26 retain their prior review date.

## Evidence layers

ClaimBot keeps three concepts separate:

1. **Payer/TPA administrative rules** — publicly documented provider-side requirements/workflows.
2. **Patient-specific policy evidence** — benefits, exclusions, limits, deductible/coinsurance, network conditions, NSSF coordination and preauthorization supplied by the user through a policy/Table of Benefits.
3. **Live payer truth** — eligibility, current utilization, final medical-necessity/adjudication decisions and authorization status, which require payer systems and are not simulated.

## Source registry fields

Each source record supports:
- organization
- source document/title
- HTTPS URL/reference where public
- section
- access date
- version
- verification status (`verified`, `partial`, or `internal`)
- scope

The result page exposes a **Why is this required?** link for sourced rule requirements.

## Public sources represented

### Nextcare Lebanon
- Lebanon Beneficiary Guide for emergency/elective admission, ambulatory services, medicines and doctor visits.
- Lebanon reimbursement guide for reimbursement documentation.
- Healthcare Providers / PULSE page for provider eligibility/preauthorization/claims-workflow context.

### SNA
- Medical Claim page for routing of inpatient pre-approvals/claims through Nextcare/Lumi.

### Fidelity
- Public TPA relationship information. Because more than one TPA can be relevant, ClaimBot does not guess when the administrator is unknown.

### Libano-Suisse / GlobeMed Lebanon
- Libano-Suisse Claims Procedures for supported hospitalization workflow details.
- GlobeMed Claims Management and GlobeMed FIT for publicly described provider/member workflow context.
- Unsupported combinations remain `REVIEW REQUIRED`.

### MEDGULF / MediVisa
- MEDGULF's MediVisa relationship.
- MediVisa Online Procedure, Cold Case, and ER Process for supported workflows.

### MedNet Liban
- Reimbursement Claim documentation.
- FAQ reimbursement timing.
- Provider portal context.
- Detailed preauthorization combinations not supported by authoritative public evidence remain `REVIEW REQUIRED`.

### LIA Assurex
- Public medical-insurance information supports the mapping/context only; a detailed provider-side rule pack is not invented.

## Policy Intelligence evidence

The policy engine can use structured user-entered fields plus text supplied by the user. Text is chunked and locally retrieved using service/category terms. This is retrieval-assisted evidence matching for the prototype; it is not represented as a live insurer database or a guarantee that a policy is current.

## Interpretation policy

A public administrative rule is encoded only when the source registry supports it. A patient-specific coverage conclusion is phrased as **appears** covered/excluded/limited based on supplied evidence. Conflicts and missing information are surfaced explicitly rather than silently reconciled.
