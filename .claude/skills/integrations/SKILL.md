---
name: integrations
description: Use when writing code that calls Sarvam, Gemini, Paytm or n8n. Current endpoints, models and gotchas as of Oct 2026.
---

# External integrations (checked Oct 2026)

Always confirm against the official docs before writing a client; APIs change. Model names live in env vars, never hard-coded.

## Sarvam (speech) — docs.sarvam.ai
- Install the official agent skills: `npx skills add sarvamai/skills`.
- Speech to text: REST `POST /speech-to-text`, model `saaras:v4` (Saarika is legacy). Use `mode: "codemix"` so Tanglish / Hinglish orders keep product names intact. REST accepts clips under 30 seconds and webm from the browser's MediaRecorder.
- Text to speech: Bulbul v3, REST up to 2500 characters per request. Keep agent replies short.
- Realtime WebSocket streaming (`saaras:v3-realtime`, beta, WAV/PCM only) is v2 work, not v1.
- Auth header: `api-subscription-key`.

## Gemini — ai.google.dev
- Use `@google/genai` only. The old `@google/generative-ai` package is outdated.
- Model from `GEMINI_MODEL` env (current Flash model for the agent; check the models page).
- Agent: function calling with our declared tools; we execute tools ourselves, no automatic calling.
- Bill parsing: image input + structured output with a response schema, then validate with Zod.

## Paytm — paytmpayments.com/docs
- Create Link API: staging `https://securestage.paytmpayments.com/link/create`. Needs staging MID and merchant key from the Paytm dashboard; request uses AES checksum (`tokenType: "AES"`).
- Pass `statusCallbackUrl` for payment status; a link accepts one payment.
- Verify the callback before trusting it, then confirm with a status check. Process idempotently by order id.
- Until keys arrive, use `lib/paytm/mock.ts` behind the same interface.

## n8n
- Workflows exported as JSON into `n8n/`. Triggered by signed webhooks from the app; never hold business logic the app also needs.
