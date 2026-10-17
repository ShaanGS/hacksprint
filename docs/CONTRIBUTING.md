# Contributing

How we build this app. What we build is in [`docs/spec.md`](spec.md) (v4.1). The look is in
[`design/DESIGN.md`](../design/DESIGN.md), and every route is in [`docs/api.md`](api.md).

## Product rules (never break)

These are spec section 15. Code comments cite them as "rule N".

1. The model never computes or invents a number. Numbers come from the database, a supplier
   bill, a verified payment, or the owner's own words confirmed by the owner.
2. All money math is in integer paise in `apps/web/lib/rotation`, and unit-tested.
3. Nothing is saved from voice, sent to a customer or marked paid without the owner's
   confirmation. The owner sends reminders himself, from his own WhatsApp.
4. Webhooks are verified and idempotent.
5. Every number carries its source label (`verified_payment`, `supplier_bill`, `owner_said`,
   `estimate`) and links to its source rows. Estimates say "estimate".
6. The owner never has to type.
7. Statements and loan packs contain totals only. No customer names or phone numbers leave the
   shop's own view.
8. We never hold, move or lend money, never route the owner to a lender, and never send his
   data to one. The bill-pay agent only prepares a payment from the owner's own UPI app, for a
   bill he confirmed and inside the weekly limit he set; he authorises it with his UPI PIN. One
   labelled exception, test mode only: the reorder agent can open a Paytm test checkout for a sent
   order. That payment is never counted as sales or cash.
9. Scheme facts come only from `apps/web/lib/schemes/catalog.ts`, each with its official source
   and checked date. Official links only. Never promise approval. Always show the fee warning.
10. Collect only what a feature needs. Never collect caste, religion or similar. Never read the
    phone's contact list.
11. The shop owns its customers' data and we process it for the owner (DPDP Act). Customer data
    is deleted on the owner's request.
12. Demo data is labelled as demo data on screen.

## Guardrails of the customer ordering flow

Customer voice ordering (`/order`, `/qr` and order approval) came first and is now frozen: its
code and tests stay, it is out of the navigation, and it is not extended. Its code and the
first migrations cite these as "guardrail N".

1. The model never produces a price, total or stock number. Tools read them from the database.
2. Order totals are computed on the server, in `apps/web/lib/orders`.
3. Money and outgoing messages need the owner's approval.
4. Order status changes only through `apps/web/lib/orders/state.ts`.
5. Webhooks verify signatures and are idempotent.
6. Every agent action goes to `audit_log`, and every number shown is traceable to its source
   row.
7. No feature may need the owner to type.

## Code rules

- Clear names, small functions, files under about 200 lines unless there is a reason.
- Write the direct version first. No speculative abstraction.
- Comments explain why, never what. No dead or commented-out code, no `any`, no stray
  `console.log`, no emoji.
- One pattern per problem. Route handlers stay thin; logic lives in `apps/web/lib/`.
- Zod at every boundary: request bodies, environment, model output and webhook payloads.
- Index what we query. No N+1 queries.
- A new migration for every schema change. Never edit an applied migration.
- Screens use only the tokens in `design/tokens.ts` and the primitives in
  `apps/web/components/ui/`.
- A new dependency gets a one-line reason in its commit.

## Commands

| Command           | What it does                                                         |
| ----------------- | -------------------------------------------------------------------- |
| `pnpm dev`        | Runs the app on http://localhost:3000                                |
| `pnpm lint`       | ESLint with zero warnings, then Prettier                             |
| `pnpm typecheck`  | Next.js route types, then TypeScript in strict mode                  |
| `pnpm test`       | Vitest unit tests                                                    |
| `pnpm test:e2e`   | Playwright end-to-end tests                                          |
| `pnpm db:reset`   | Applies every migration to the linked Supabase project (wipes it)    |
| `pnpm demo:reset` | Restores the seeded demo shop, with dates relative to now            |
| `pnpm demo:check` | Prints the demo shop's numbers and asserts the demo story            |

`pnpm lint`, `pnpm typecheck` and `pnpm test` must pass before a change is done. CI runs them on
every push and pull request.

## Commits

- Small commits with conventional messages, like `feat(rotation): add the weekly forecast`.
- Never commit secrets. Keep `apps/web/.env.example` current.
- Build in the spec's build order (section 17). Nothing outside the spec.
