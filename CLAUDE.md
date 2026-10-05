# Project

AI manager for one kirana shop: customers order by voice in Indian languages, the owner approves with one tap, payment is a Paytm link or recorded credit, and the owner hears a nightly report.

Spec: `docs/spec.md`. Read the relevant section before any milestone. If this file and the spec disagree, stop and ask.

## Stack

Next.js 16 (App Router) + React 19, TypeScript strict, Tailwind, Supabase (Postgres, Realtime, Storage), Gemini via `@google/genai`, Sarvam (speech), n8n (workflows), Paytm (payment links), Zod at every boundary, Vitest, Playwright, pnpm.

## Commands

- `pnpm dev` run locally
- `pnpm lint` / `pnpm typecheck` / `pnpm test` must all pass before a task is done
- `pnpm test:e2e` the two core flows
- `pnpm db:reset` migrations + demo shop seed

## Product rules (never break)

1. The model never produces a price, total or stock number. Tools read them from the database.
2. Totals are computed server-side in `lib/orders`.
3. Money and outgoing messages need owner approval.
4. Order status changes only through `lib/orders/state.ts`.
5. Webhooks verify signatures and are idempotent.
6. Every agent action goes to `audit_log`.

## Code rules

- Clear names, small functions, files under ~200 lines unless there is a reason.
- No speculative abstraction; write the direct version first.
- Comments explain why, never what. No dead or commented-out code, no `any`, no stray `console.log`, no emoji.
- One pattern per problem across the repo. Route handlers stay thin; logic lives in `lib/`.
- Index what we query; no N+1 queries; product search uses a Postgres trigram index.
- New dependency = one-line reason in the commit or PR.

## Workflow

- Use plan mode for anything bigger than a one-line change. Show the plan, wait for approval.
- One milestone per session, in the order of the Build plan in the spec. Thinnest end-to-end slice first.
- UI work: use the `design-system` skill. External APIs: use the `integrations` skill.
- Small commits, conventional messages (`feat(orders): add approval transition`). Never commit secrets; keep `.env.example` current.
- If something is unclear, ask instead of guessing. No features outside the spec.
