# AI manager for a kirana shop

Customers order by voice in Tamil, Hindi, Kannada or English; the owner approves each order with one tap; payment arrives as a Paytm link or is recorded as store credit; and every night the owner hears a short report in their own language.

Built for Hack Sprint (SDG Club, MIT Bengaluru), Fintech track, problem statement PS21. Status: milestone 1 of 6 (setup). The full spec is in [docs/spec.md](docs/spec.md).

## The problem

A kirana owner runs the counter, the phone, the stock and the credit book alone. During rush hour, orders are missed, credit is forgotten and stock runs out unnoticed, while quick-commerce apps win customers on convenience.

- AICPDF reported about 2 lakh kirana closures in a year, blamed on quick commerce (Business Standard, Oct 2024; TechCrunch, Nov 2024).
- 74% of surveyed shop owners said they had difficulty attending to customers (Flourish Ventures / 60 Decibels).
- In CPM India's Kirana 2025 survey of 4,593 retailers, 86% name changing customer behaviour as the top challenge and 45% want credit support.
- 98% of Indian internet users access content in Indian languages (IAMAI-Kantar).

We don't try to beat quick commerce on speed. We keep what a kirana already does better (trust, credit, proximity, knowing its regulars) and take the owner out of the bottleneck.

## Architecture

> Diagram: added in milestone 6.

- **One Next.js app** (`apps/web`) serves the customer voice page, the owner app and the API. It is the only part that talks to the model or the database.
- **Voice loop:** the browser records a push-to-talk clip. Sarvam turns speech into text, Gemini decides the reply and which tools to call, our code runs the tools against Supabase, and Sarvam speaks the reply.
- **n8n** runs side effects in order: Paytm link creation, the nightly report and distributor reorders. **Paytm** reports payment status back to the app.
- **Rule:** the model never produces a price, total or stock number. Those come from the database, and anything involving money or outgoing messages needs the owner's approval.

```
apps/web/        Next.js app: app/ (pages, API), lib/ (env, service clients, business logic)
supabase/        migrations and the demo seed
scripts/smoke/   one real call per external service
tests/           unit (Vitest) and end-to-end (Playwright) tests
n8n/             exported n8n workflows (from milestone 4)
docs/            product spec
design/          screen references and design tokens
```

## Setup

You need Node 22.12 or newer (24 is what Vercel runs), pnpm 11 (`corepack enable` picks the pinned version) and a Supabase account.

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the env template and fill it in, using the table below:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
3. Create a Supabase project (Mumbai region is closest), then link it. `link` asks for the database password.
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   ```
4. Create the tables and load the demo shop:
   ```bash
   pnpm db:reset
   ```
   > **`pnpm db:reset` wipes every table in the linked Supabase project** and reloads the demo seed. Run the hackathon demo on a **separate Supabase project**, so a reset during development can never wipe the demo.
5. Check every external service with one real call each:
   ```bash
   pnpm smoke
   ```
6. Start the app at http://localhost:3000:
   ```bash
   pnpm dev
   ```

The app refuses to start until the required variables are set, and names each missing one.

## Environment variables

All of them live in `apps/web/.env.local`.

| Variable                               | Required               | Used for                                                | Where to get it                                                                |
| -------------------------------------- | ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `APP_URL`                              | at startup             | Public base URL: Paytm callbacks, QR codes              | `http://localhost:3000` locally; the Vercel https URL when deployed            |
| `NEXT_PUBLIC_SUPABASE_URL`             | at startup             | Database                                                | Supabase dashboard > Project Settings > Data API                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | at startup             | Browser access (Realtime, milestone 4)                  | Supabase dashboard > Project Settings > API Keys (`sb_publishable_...`)        |
| `SUPABASE_SECRET_KEY`                  | at startup             | Server database access; bypasses RLS, never in browser  | Supabase dashboard > Project Settings > API Keys (`sb_secret_...`)             |
| `GEMINI_API_KEY`                       | at startup             | Conversational agent, bill reading                      | [Google AI Studio](https://aistudio.google.com/apikey)                         |
| `GEMINI_MODEL`                         | at startup             | Model name, e.g. `gemini-3.8-flash`                     | [Gemini models](https://ai.google.dev/gemini-api/docs/models)                  |
| `SARVAM_API_KEY`                       | at startup             | Speech to text, text to speech                          | [Sarvam dashboard](https://dashboard.sarvam.ai)                                |
| `SARVAM_STT_MODEL`                     | at startup             | Speech to text model, e.g. `saaras:v4`                  | [Sarvam docs](https://docs.sarvam.ai)                                          |
| `SARVAM_TTS_MODEL`                     | at startup             | Text to speech model, e.g. `bulbul:v3`                  | [Sarvam docs](https://docs.sarvam.ai)                                          |
| `PAYTM_BASE_URL`                       | on first Paytm call    | `https://securestage.paytmpayments.com` for staging     | Paytm docs                                                                     |
| `PAYTM_MID`                            | on first Paytm call    | Merchant ID                                             | [Paytm dashboard > API Keys](https://dashboard.paytmpayments.com/next/apikeys) |
| `PAYTM_MERCHANT_KEY`                   | on first Paytm call    | Signs requests (16 characters)                          | [Paytm dashboard > API Keys](https://dashboard.paytmpayments.com/next/apikeys) |
| `N8N_WEBHOOK_URL`                      | on first n8n call (M4) | Base URL of the n8n webhooks                            | n8n workflow settings                                                          |
| `N8N_WEBHOOK_SECRET`                   | on first n8n call (M4) | Signs webhooks between the app and n8n (32+ characters) | `openssl rand -hex 32`                                                         |

Paytm keys are checked only when a Paytm call is made, because they may arrive late. Model names live only in env, never in code.

## Scripts

| Command                | What it does                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm dev`             | Run the app locally                                                                                   |
| `pnpm lint`            | ESLint with zero warnings allowed, plus a Prettier check                                              |
| `pnpm typecheck`       | TypeScript for the app, tests and scripts                                                             |
| `pnpm test`            | Unit tests                                                                                            |
| `pnpm test:e2e`        | End-to-end tests (needs `.env.local`; first run `pnpm exec playwright install --only-shell chromium`) |
| `pnpm db:reset`        | Wipe the linked Supabase project, apply migrations and seed it                                        |
| `pnpm smoke [service]` | One real call to Supabase, Sarvam, Gemini and Paytm (or just one)                                     |
| `pnpm format`          | Format everything with Prettier                                                                       |

GitHub Actions runs lint, typecheck and unit tests on every push. It needs no secrets.
