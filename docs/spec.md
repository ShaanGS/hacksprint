# Product spec: AI manager for a kirana shop

This file is the single source of truth for what we are building, why, and how. It consolidates every decision the team made. The product has no name yet.

---

## 1. Context

- **Event:** Hack Sprint, SDG Club, MIT Bengaluru. Fintech track, problem statement **PS21**.
- **PS21 in short:** identify a real problem faced by small merchants in India and build a technology solution that creates measurable value (efficiency, new opportunities, better financial outcomes, ability to compete). It explicitly asks teams to think beyond existing financial and commerce solutions.
- **Format:** idea round (PPT + GitHub repo) first, then a 24-hour in-person build on Oct 17-18, 2026, judged on stage. Pre-built code is allowed.
- **Sponsors:** Paytm, Sarvam AI, n8n, Google. We use each for a real job, never as decoration. Sponsor judges may be in the room.
- **Judging reality:** judges look at the repo and ask the team to explain code and decisions. Every file must be explainable by a teammate. The live demo decides the result.

## 2. Problem

The kirana owner is one person running the counter, the phone, the stock and the credit book at the same time. Orders get missed, credit gets forgotten, and stock runs out unnoticed, while quick commerce apps take customers on convenience.

**Evidence (published, used in the deck):**
- AICPDF reported about 2 lakh kirana closures in a year, blamed on quick commerce (Business Standard, Oct 2024; TechCrunch, Nov 2024).
- 74% of surveyed shop owners said they had difficulty attending to customers (Flourish Ventures / 60 Decibels).
- CPM India Kirana 2025, 4,593 retailers: 86% name customer behaviour shifts as the top challenge; 45% want credit support.
- ICC survey: all respondents said loyal customers rely on store credit, which quick commerce does not offer.
- IAMAI-Kantar: 98% of Indian internet users access content in Indian languages; 57% of urban users prefer them.

**Not yet proven (team is running a field survey of kirana owners):** how many orders arrive by phone, how often calls are missed at peak, how credit and stock are tracked today, and whether owners and customers would accept an AI voice.

**Positioning:** we do not try to beat Zepto at speed or range. We keep the kirana's real advantages (trust, credit, proximity, knowing regulars) and remove the owner as the bottleneck.

## 3. The product

An AI manager for one kirana shop that does the jobs the owner has no time for.

**A normal day:**
1. **Morning, stock arrives.** The owner photographs the distributor's bill. The app reads it and updates stock and prices after the owner confirms. Nobody types a product list.
2. **Daytime, customers call.** A regular customer talks to the shop's voice agent in Tamil, Hindi, Kannada, English or mixed speech. Example: "Two Maggi, one butter, half kilo sugar." Agent: "Sugar is finished. Do you want jaggery instead?" It reads back the order and the total.
3. **Owner approves.** The order appears on the owner's phone as one card. One tap on Approve.
4. **Customer pays.** A Paytm payment link goes to the customer. When paid, stock goes down automatically. If the customer says "put it on my account", the order is recorded as credit instead.
5. **Night, the report.** The owner hears, in their language: "14 orders today, ₹3,200 collected, two people still owe you, oil and sugar are running low. Shall I reorder?" On yes, the reorder goes to the distributor.

**Delivery:** the shop's own helper delivers, as kiranas already do for regulars. Shared riders across nearby shops is roadmap.

**Core rule:** the AI only talks, listens and reads. Plain code decides what is in stock and what things cost. The owner approves anything involving money or outgoing messages.

**Sponsor roles:**
- **Sarvam:** speech to text and text to speech in Indian languages (the voice conversation).
- **Gemini:** the conversational agent via function calling, and reading bill photos.
- **n8n:** runs side effects in order: Paytm link creation, nightly report, distributor reorder.
- **Paytm:** payment links and payment status.

## 4. Decisions and why (read before changing direction)

| Decision | Why | Rejected alternative |
| --- | --- | --- |
| PS21 over other tracks | Only PS where Paytm, Sarvam, n8n and Gemini each do a real job | PS41 or PS22 lock us to one sponsor; PS42 is a heavy, vague GCP build |
| Read distributor bills, not shelf photos | Bills have exact products, quantities and prices | Shelf photos: clutter, loose items, variants, no prices |
| Customer talks to a voice agent | Customers already call kiranas; the pain is the owner can't pick up during rush | Asking customers to install an app or use a bot they don't know |
| Single shop for v1 | Buildable and demoable in time | Neighbourhood network of shops: kept as roadmap |
| Owner approves every order | Keeps the owner in control; catches any misheard item before money moves | Fully autonomous ordering |
| Credit (udhaar) built in | Credit is the kirana's edge quick commerce cannot copy | Pay-first only, which fights how regulars actually pay |
| Push-to-talk voice, one turn at a time | Reliable on venue Wi-Fi, simpler to build and explain | Streaming interruptible voice: v2 |
| QR code opens a browser voice page for the demo | No telephony setup risk | Real phone number in v1 |
| No "10 minute delivery" claim | Not believable for a kirana; invites holes in Q&A | Competing on speed |

## 5. Known weaknesses and how we handle them

1. **Counter sales are not tracked, so stock drifts.** Treat stock as estimated, let the owner correct it by voice ("sugar 5 packets left"), and pitch counter sale logging as roadmap.
2. **The model could mishear an item.** Read-back to the customer plus owner approval catch it before money moves.
3. **Ambiguous items** ("one milk"): the agent asks a short clarifying question using catalogue options (brand and size).
4. **Paytm keys may be delayed.** A mock payment client sits behind the same interface until real staging keys arrive.
5. **Single-shop framing looks narrow.** Roadmap slide: shared riders and pooled stock across nearby kiranas.

## 6. Scope

| Area | v1 (hackathon) | Roadmap | Never |
| --- | --- | --- | --- |
| Ordering | Browser voice page via QR; Tamil, Hindi, Kannada, English, mixed | Real phone number, WhatsApp voice notes | Orders with no owner approval |
| Stock | Bill photo to stock list; owner voice corrections | Counter sale logging, barcode | AI deciding stock or prices |
| Payments | Paytm link; paid status by callback | Reminders, UPI collect | Holding customer money |
| Credit | Record credit per customer, balances | Automated reminders, limits | Lending or interest |
| Reports | Nightly voice report, one-tap reorder | Weekly trends, festival demand | Selling shop data |
| Delivery | Shop helper; owner sets status | Shared riders across shops | Running a fleet |
| Scale | One shop, seeded data | Many shops, neighbourhood network | |

**Definition of done for v1:** a judge scans a QR code, orders by voice in an Indian language, the owner approves on a second phone, the judge receives a Paytm link, paying it drops stock, and the nightly report reflects the order.

## 7. Requirements

**User stories**
1. Customer orders by voice in their language, hears availability and the total.
2. Owner approves or rejects each order with one tap.
3. Owner photographs a distributor bill; stock and prices update after confirmation.
4. Owner records an order as credit and sees who owes what.
5. Owner hears a nightly report and reorders low stock with one tap.

| ID | Requirement | Priority |
| --- | --- | --- |
| F1 | Understand orders in Tamil, Hindi, Kannada, English and mixed speech | P0 |
| F2 | Stock checked from the database only; substitutes offered when out | P0 |
| F3 | Read back items and total before submitting | P0 |
| F4 | Owner order card with Approve and Reject, appears in real time | P0 |
| F5 | On approval, customer gets a Paytm link | P0 |
| F6 | Paid callback marks order paid and decrements stock | P0 |
| F7 | "Put it on my account" records credit instead of a link | P0 |
| F8 | Bill photo parsed into items, quantities, prices for confirmation | P0 |
| F9 | Nightly voice report in the owner's language | P1 |
| F10 | One-tap reorder message to distributor | P1 |
| F11 | Owner corrects stock by voice | P2 |

**Success metrics:** voice order to payment link under 30 seconds; items and total correct on 9 of 10 scripted calls per language; zero model-produced prices or stock values in logs.

## 8. Technical design

**Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind, Supabase (Postgres, Realtime, Storage), Gemini via `@google/genai`, Sarvam, n8n, Paytm, Zod, Vitest, Playwright, pnpm. Hosting: Vercel for the app, n8n cloud or Railway for n8n.

**Architecture:** one Next.js app serves the customer voice page, the owner app and the API. It is the only component that talks to the model and the database. n8n handles payment links, the nightly report and reorders. Paytm confirms payment back to the app.

**Voice loop (v1):** browser records a push-to-talk clip, server sends it to Sarvam speech to text, Gemini decides the reply and tool calls, server runs the tools, Sarvam speaks the reply.

**Agent tools (the only way the model touches data):**
- `search_products(query, language)`
- `check_stock(product_id, qty)` returns available or substitutes
- `add_item(product_id, qty)`, `remove_item(product_id)`
- `get_order_summary()` with a server-computed total
- `submit_order(payment_mode: link | credit)`

**Data model:** shops, products (with multilingual aliases, stock, low-stock threshold), customers, orders, order_items (unit price copied at order time), payments, credit_ledger, bills (image path, parsed items, status), audit_log.

**Order states:** draft, pending_approval, rejected, awaiting_payment, paid, on_credit, delivered. Stock decrements on paid or on_credit.

**API surface:** `POST /api/voice/turn`, `POST /api/orders/{id}/approve`, `POST /api/orders/{id}/reject`, `POST /api/webhooks/paytm`, `POST /api/bills`, `POST /api/bills/{id}/confirm`, `GET /api/reports/daily`. n8n webhooks: order-approved, reorder-confirmed; n8n cron for the nightly report.

**Guardrails:** prices, totals and stock only from the database; schema validation on all model output (retry once, then ask the customer to repeat); owner approval for money and messages; verified, idempotent payment callbacks; everything logged to audit_log.

**Targets:** voice turn under 4 seconds; owner card within 2 seconds of submission; no secrets in the repo.

## 9. Design

UI quality and consistency are a top priority. The team supplies Dribbble and Pinterest references in `design/references/`; follow `design/DESIGN.md`. Tokens and a `/styleguide` page come before any screen.

**Screens:**
1. Customer voice page (QR): hold to talk, live transcript, cart with substitutes, total read back. The hero screen.
2. Owner order card: customer, items, total, payment mode, Approve and Reject.
3. Bill scan: photo beside parsed rows, editable, Confirm.
4. Credit book: customer, amount owed, last order date.
5. Nightly report: voice playback, orders, collected, owed, low stock, Reorder.

**Principles:** one primary action per screen; voice first with text always shown; light, high contrast, projector-readable; real Indian data (rupees, real product names, local customer names); no number shown that the database did not compute or the owner did not confirm.

## 10. Build plan

1. **Setup:** tooling, env validation, Supabase schema and seed, smoke tests for Sarvam, Gemini, Paytm, README skeleton.
2. **Data:** seed one shop with 40 real products and aliases in English, Tamil, Hindi.
3. **Voice slice:** QR page, push-to-talk, agent tools, order reaches pending_approval.
4. **Money slice:** owner card, n8n creates Paytm link, callback marks paid and drops stock; credit path.
5. **Bill and report:** bill photo to confirmed stock; nightly report and reorder in n8n.
6. **Demo hardening:** 10 scripted calls per language pass, fallbacks, README with demo GIF and architecture image.

**Risks:** Paytm keys delayed (mock client); latency on venue Wi-Fi (hotspot, short replies); misheard items (read-back plus approval); bill parse errors (owner edits rows).

## 11. Open questions

- Demo languages: Tamil and Hindi (matches the Chennai field survey) or Kannada (matches Bengaluru judges)? Default: support all three, demo in Tamil and Hindi.
- Who on the team owns which slice.
- Product name: none for now.
