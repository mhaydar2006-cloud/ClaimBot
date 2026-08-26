# ClaimBot public/admin rule packs

ClaimBot uses deterministic JSON rule packs for provider-side administrative requirements. Policy/Table of Benefits assessment is a separate layer in `src/engine/policyIntelligence.ts`; neither layer is allowed to impersonate payer authorization.

## Rule coverage

- **Nextcare:** broad verified Lebanon preauthorization and reimbursement rules from public official guidance for supported workflows.
- **MediVisa:** verified public ambulatory, medication, elective admission, and emergency guidance for supported workflows.
- **GlobeMed:** partial. Encoded checklist detail is limited to publicly supported Libano-Suisse/GlobeMed admission workflows plus general GlobeMed workflow context.
- **MedNet:** partial. Public reimbursement requirements and Lebanon timing are encoded; unsupported preauthorization combinations are not invented.
- **Internal / Unknown:** no payer rule pack; verification with the payer is required.

Each rule carries a `sourceId` that resolves in `src/data/sources.json`. `REVIEW REQUIRED` is an intentional safe outcome when public evidence is insufficient.
