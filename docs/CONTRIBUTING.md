# Contributing

How we build this app. What we build is in `docs/spec.md`; the screens, flows and build order are in `docs/PRODUCT-PLAN.md`; the look is in `design/DESIGN.md`.

## Guardrails (never break)

The same list as the README, numbered the same way, because code comments cite them as "guardrail N".

1. The model never produces a price, total or stock number. Tools read them from the database.
2. Totals are computed on the server, in `lib/orders`.
3. Money and outgoing messages need the owner's approval.
4. Order status changes only through `lib/orders/state.ts`.
5. Webhooks verify signatures and are idempotent.
6. Every agent action goes to `audit_log`.

## Code rules

- Clear names, small functions, files under about 200 lines unless there is a reason.
- No speculative abstraction: write the direct version first.
- Comments explain why, never what. No dead or commented-out code, no `any`, no stray `console.log`, no emoji.
- One pattern per problem across the repo. Route handlers stay thin; logic lives in `lib/`.
- Index what we query, no N+1 queries. Product search uses a Postgres trigram index.
- A new dependency gets a one-line reason in its commit.
- Screens use only the tokens and the primitives in `apps/web/components/ui/`.

## Commands

- `pnpm dev` runs the app locally.
- `pnpm lint`, `pnpm typecheck` and `pnpm test` must all pass before a change is done.
- `pnpm test:e2e` runs the two core flows.
- `pnpm db:reset` applies the migrations and loads the demo shop. It wipes the linked project.

## Commits

- Small commits with conventional messages, like `feat(orders): add approval transition`.
- Never commit secrets. Keep `apps/web/.env.example` current.
- Build in the order of the spec's build plan, thinnest end-to-end slice first. Nothing outside the spec.
