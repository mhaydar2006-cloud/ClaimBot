# ClaimBot deployment handoff

The repository is configured for Vercel with `vercel.json`. Deployment is the only part that requires access to the team's external account.

## Vercel

1. Push this `authcare-ai` folder to the team repository (or import the existing repository).
2. In Vercel, create/import the project and set **Root Directory** to `authcare-ai` if the repository also contains parent folders.
3. Framework preset: **Vite**. The included config uses `npm run build` and outputs `dist`.
4. Optional: add `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6` as server-side environment variables. Do not expose the key as `VITE_*`.
5. Deploy.
6. On the production URL, run the manual release checklist in `TESTING_CHECKLIST.md`.

## What works without an API key

The claim-readiness rules, policy intelligence, denial analysis, appeal-package generator, local retrieval, synthetic policies, JSON downloads, history, and print/PDF flows are deterministic/local. The OpenAI endpoints only improve wording/summarization.

## Required external integrations for a future payer-authorized product

Live eligibility, remaining benefit utilization, payer submission/status, private denial codes, unpublished medical-necessity criteria, insurer-side adjudication, payer approval/denial authority, and settlement require insurer/TPA agreements or APIs. They are intentionally not simulated.
