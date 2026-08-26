# ClaimBot Adjusted Release — 2026-08-26

This release contains the latest local implementation produced from the ClaimBot roadmap, including:

- Claim Readiness deterministic rules and source-backed explanations.
- Policy Intelligence with synthetic policies, structured benefits, local document retrieval, limits/exclusions/NSSF/network/preauthorization handling, insufficient-information handling, and policy conflict detection.
- Denial Intelligence with classification, evidence comparison, contestability guidance, text/JSON/Markdown/CSV upload support, and reconsideration-package generation.
- Medical-justification assistance with explicit missing-information safeguards and mandatory clinician/user review language.
- Expanded public knowledge/source registry for Nextcare, MediVisa, MedNet, GlobeMed plus insurer-scoped material for Fidelity, SNA, and MEDGULF where publicly documented.
- Insurer-aware public-knowledge retrieval to prevent insurer-specific material leaking into unrelated cases.
- FastAPI backend with SQLite default/PostgreSQL-ready persistence, authentication/RBAC, audit events, PHI-disabled-by-default safeguards, source documents/chunks, request/assessment/denial/reconsideration persistence, and optional Qdrant support.
- Docker Compose, environment examples, migration/backup helpers, Vercel configuration, deployment notes, demo script, and roadmap completion documentation.
- Application-level React error boundary and de-identified optional backend sync path.

## Verification performed before packaging

- Readiness/rules suite: 51/51 passed.
- Policy/denial intelligence fixtures: 14/14 passed.
- Project integrity check: PASS.
- Source registry: 26 records parsed.
- Python backend compilation: PASS.

The archive intentionally excludes `node_modules`, Python `__pycache__`, `.pyc` files, local databases, and private `.env` files. Run `npm install` after extraction. Backend dependencies are in `backend/requirements.txt`.

Items that still require external/manual access remain outside this release: GitHub/Vercel account actions, provider interviews, private payer APIs/data, live eligibility/utilization/submission/status/adjudication/payment, and legal/privacy sign-off before real patient data is used.
