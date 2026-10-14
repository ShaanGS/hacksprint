# Product plan: screens, flows and logic

What we are building for the Hack Sprint demo, screen by screen. The spec (`docs/spec.md`) says what and why; this file says how each screen behaves and what the code does underneath. The look is in `design/DESIGN.md`, and `/styleguide` shows every building block.

**The demo we must win** (spec section 6): a judge scans a QR code, orders by voice in an Indian language, the owner approves on a second phone, the judge receives a Paytm link, paying it reduces stock, and the nightly report reflects the order.


## What the app is for

An AI manager for one kirana shop. It takes customers' voice orders in their language, waits for the owner's one-tap approval, collects money by Paytm link or records credit, keeps stock from the distributor's bill, and tells the owner how the day went.

| Who | Their moment | What they need |
| --- | --- | --- |
| **Customer**: a regular, at home, Tamil/Hindi/Kannada/English, not tech-savvy | The owner can't pick up during the rush | Speak naturally; hear what's available; see the price; pay, or put it on their account |
| **Owner**: alone at the counter, Tamil-speaking, phone in pocket | Counter queue, phone, stock and credit book all at once | Never miss an order; approve in one tap; know who owes what; restock in time; no typing |
| **Judge**: projector plus their own phone | About 3 minutes to be convinced | It works first time, in their language, and is visibly safe |

**Rules that shape every screen:**
1. The AI only talks, listens and reads. It never sees or says a price, total or stock number: every amount on screen or in audio comes from code.
2. The owner approves anything involving money or outgoing messages.
3. Every voice moment has a tap fallback: choice chips, −/+ on the cart, "Type instead".
4. Every spoken line is also on screen, in the customer's script.

## Screens

Every screen has empty, loading, error and success states.

**Customer** (phone, from the QR code; UI strings in Tamil, Hindi, Kannada and English):

| Screen | What it does | States |
| --- | --- | --- |
| **C0 Welcome** `/order` | Shop art and name. Four big buttons, one per language, each in its own script. Name and phone (phone keypad), then "Start". Remembered on the phone; a rescan resumes the active order. | first visit; returning customer with an active order (resume); invalid phone |
| **C1 Voice order** `/order` | The hero screen. A one-time "Tap to start" asks for the mic and unlocks audio (iPhone). Then:<br>- hold-to-talk MicButton, the only black button<br>- a "Try saying: two Maggi, one butter" hint<br>- transcript bubbles (customer right, shop left; tap to replay)<br>- choice chips when the agent asks or offers a substitute<br>- a cart pill "3 items · ₹121" that opens the cart sheet<br>- "Type instead" | idle; listening (only once recording has really started); hearing; thinking; speaking; "hold while you speak" (tap was too short); didn't catch that (empty or noisy, template reply); mic denied (switches to typing, with how-to-allow); offline (cart kept) |
| **Cart and review sheet** | Rows with art, −/+ and remove (direct to the cart API, no AI), server-computed lines and total. A read-back sentence built from a code template in the customer's language. Payment choice: Paytm link or "Put it on my account". "Send to Lakshmi Stores". | editing; sending; failed (retry); empty |
| **C2 Order status** `/order/[number]` | Order #42 with a checklist: Sent, Shop approved, Paid / On your account, Delivered. Updates every 2 s and on returning to the page. | waiting ("Call the shop" after 5 min); approved with "Pay ₹121 with Paytm" (opens in a new tab); confirming payment; paid; on credit (with new balance); rejected (translated reason, "Order again"); delivered |
| **Test payment** `/pay/[id]` | Only while Paytm keys are missing. Clearly our own page, not Paytm's; drives the same "mark paid" path. | open; paid |

**Owner** (PIN once per phone; tabs Orders, Stock, Credit, Today; screen kept awake; chime on a new order):

| Screen | What it does | States |
| --- | --- | --- |
| **O0 PIN** | 4-digit keypad, then a signed cookie. | wrong PIN; locked for 30 s after 5 tries |
| **O1 Orders** | **Needs you:** cards with customer, a "New customer" badge or their current balance, time, items with art, a substitution note, total, payment mode, and a stock warning if stock dropped since. Buttons: Reject (sheet of reason codes) and "Approve ₹121". **In progress:** waiting for payment, then Paid, then "Mark delivered"; on credit, then "Mark delivered". **Done today**, collapsed. | empty ("Orders appear here"); new (slides in, chime); approving; link failed (Retry); offline banner |
| **O2 Stock** | Product rows with art, stock and a low tag. "Scan a bill" button. | low-stock filter |
| **O3 Bill scan** | Camera photo, shrunk in the browser, then Gemini reads it with our 40 product codes in the prompt. Editable rows: product, qty, MRP; unmatched rows flagged. "Confirm and update stock" adds stock and sets the selling price from MRP. | reading; rows; unmatched; done; unreadable (retake) |
| **O4 Credit** | Who owes what, sorted by amount, with the last order date. "Record a payment" (cash). | empty |
| **O5 Today** | Orders, collected, on credit, total owed, low stock (all from SQL). The report sentence comes from per-language code templates, played in Tamil with English text beneath. Reorder list (rule: back to twice the threshold), then "Send to Sri Balaji Agencies", then n8n. | zero orders; playing; reorder sent; failed |

**Presenter** (same PIN):
- **`/presenter`:**
  - health checks (the smoke checks)
  - reset demo (re-seeds "today" relative to now: sugar 0, oil 2, history and credit rows; never wipes the database)
  - payment mode switch, Paytm or test, stored in the database because changing Vercel env needs a redeploy
  - "Run nightly report"
- **`/qr`:** a big QR code for the projector and the printed standee.

## Flows

1. **Order to paid** (the definition of done):
   1. Scan the QR, pick a language, enter name and phone, then "Tap to start".
   2. Hold the mic: "ரெண்டு Maggi, ஒரு butter, அரை கிலோ சர்க்கரை".
   3. Maggi ×2 and butter are added. Sugar is out, so the agent offers jaggery and a chip appears. Tap it or say yes.
   4. "That's all" opens the review: the read-back and total come from templates. Pick Paytm link, then Send. The order (#42) goes to pending approval.
   5. Within 2 s the card appears on the owner's phone with a chime. Approve: the decision is saved first, then the payment link is created. The customer page shows "Pay ₹121".
   6. Pay on Paytm staging (test card). The callback, the status poll and the test page all lead to one idempotent "mark paid".
   7. Stock goes down, stopping at 0 and logging an oversell. Today's numbers update and the nightly report includes it.
2. **Credit:** same as flow 1, but choose "Put it on my account". The owner card shows the balance. Approve sets on credit, adds a ledger entry and reduces stock. The customer sees the new balance.
3. **Rejection:** the owner picks a reason code. The customer sees it translated, with "Order again".
4. **Morning bill:** Stock, then "Scan a bill", then the photo, then the rows, then edit, then "Confirm and update stock".
5. **Night:** at 9 PM n8n calls the report endpoint and sends it to the owner (the channel is chosen when n8n is set up). Or open Today, then play the report, then the reorder list, then send, then n8n messages the distributor.

## Logic

- **Order states** (spec section 8): draft → pending_approval → rejected | awaiting_payment | on_credit; awaiting_payment → paid; paid and on_credit → delivered.
  - The allowed-transition table is in `lib/orders/state.ts`, unit tested. Only that file calls the Postgres function `transition_order`.
  - `transition_order` atomically: updates `where status = from` (so repeats do nothing), reduces stock on paid or on credit (stopping at 0, logging oversells), writes the credit entry, and writes `audit_log`.
  - It runs as the calling role and EXECUTE is revoked from public, anon and authenticated, like `search_products`.
- **Totals:** `lib/orders/totals.ts`, pure functions in integer paise, rounded per line.
- **Quantity rules in code:**
  - Packs and pieces are whole numbers.
  - kg and litre go in 0.05 steps.
  - Each line is capped at 20.
- **Voice turn**, with a deadline on every call:
  1. `POST /api/voice/transcribe`: Sarvam `saaras:v4`, codemix mode, `keyterms` set to the catalogue names. The transcript shows right away. Empty or noise gets a template reply and no AI call.
  2. `POST /api/voice/turn` (text, typed text, or a tapped chip):
     - The prompt holds shop rules, the 40 products as short codes with name, pack and unit (no prices, no stock), and the current cart.
     - At most 3 Gemini calls (thinking LOW); the last one is forced to answer in text.
     - Tools: `add_item(code, qty)`, which returns added, out of stock with substitutes, or needs a choice with options; `remove_item`; `set_quantity`; `find_products(query)` for anything not in the list; `open_review`.
     - Chips come from tool results, never from the AI's text.
     - A reply that mentions money in any form (₹, rupee, ரூபாய், रुपये, ರೂಪಾಯಿ) is replaced by a template.
     - Replies are 120 characters or less. A malformed reply is retried once, then a template is used.
     - Every tool call goes to `audit_log`; every turn and its timings go to `voice_turns`.
  3. `GET /api/voice/audio/[turnId]`: Sarvam `bulbul:v3` mp3, fetched after the text has already shown, and played through one unlocked audio element.
- **Updates:** the owner and customer screens poll every 2 s and refetch on returning to the page. That's one mechanism, which survives venue Wi-Fi and meets the spec's 2 s target.
- **Payments:**
  - `lib/payments` has a Paytm provider and a test provider behind one interface; the mode comes from the database.
  - Approve saves the decision first, then creates the link (`linkName` "Order42"), with Retry on failure.
  - The callback (`/api/webhooks/paytm`) checks the checksum over the sorted fields, the merchant ID, amount and status, then is confirmed with Paytm's Fetch Transaction call. It is safe to receive twice (unique transaction ID).
- **Sign-in:**
  - Owner: `OWNER_PIN` and an HMAC-signed httpOnly cookie, using `SESSION_SECRET`.
  - Customer: a signed cookie with the customer id; every order call checks it owns the order.
- **Nightly report:** numbers from SQL; Tamil, Hindi, Kannada and English sentence templates in code; Sarvam speaks them.
- **n8n:** signed webhooks out (`reorder-confirmed`) and a signed cron call in (`/api/reports/daily`). The app never waits on n8n.
- **Database, second migration:**
  - `voice_turns` (text, language, choices, per-stage timings)
  - `orders.number` (short identity), `orders.submitted_at`, `orders.reject_reason` (an enum)
  - `reorders`
  - `shops.payment_mode`
  - the `transition_order` function
  - a reset function for the presenter
- **Seed:** 4 customers with credit history, plus paid and credit orders from earlier "today" (relative to now).

## Build order

Each slice ends working on a real phone.

| Slice | Delivers | Done when |
| --- | --- | --- |
| **0. Keys** (team accounts) | `.env.local`, Supabase link, `db:reset`, smoke PASS, Vercel project in Mumbai (`bom1`) with env | `pnpm smoke` all pass except Paytm; a deployed URL loads |
| **1. Voice, M3** | C0, C1, cart sheet, typed and tapped paths first, then the mic; the agent; `voice_turns`; `/qr` | A typed Tamil order and a spoken one reach pending approval on an iPhone and an Android phone; turn under 4 s on the logs |
| **2. Owner and money, M4** | O0, O1, C2, `transition_order`, test-payment provider, Paytm provider, callback, credit, O4 | Flow 1 and flow 2 pass as Playwright tests (two browsers); stock drops once even with a double callback |
| **3. Night, M5a** | O5, report templates and audio, reorder, n8n workflows exported to `n8n/` | The Today numbers match the database; the reorder fires the webhook |
| **4. Bill, M5b** | O2, O3 | A sample distributor bill photo updates stock after confirm |
| **5. Hardening, M6** | `/presenter`; 10 scripted calls per language (macOS voice clips through the real endpoints, scored); latency tuning; translations checked by native speakers; README with demo GIF | 9 of 10 correct per language; the presenter reset works |

## How we check it

- **Unit:** transitions, totals, quantity rules, the money-word guard, report templates, cookie signing, callback verification, the bill parse schema.
- **Playwright flows 1 and 2** run locally with keys: two browser contexts, Chromium's fake mic playing the Tamil fixture, the test payment page, and a double callback.
- **Real phones on the deployed URL** after every slice: an iPhone (Safari recording and audio) and an Android.
- **Logs:** `voice_turns` timings, checking each turn is under 4 s.

## Stage checklist

- Printed QR standee, and `/qr` ready on the projector.
- Owner phone: auto-lock off, signed in, volume up for the order chime.
- Team hotspot, a spare judge phone, and a backup screen recording of the full flow.
- `/presenter`: health checks green, demo data reset, payment mode set.
- Paytm staging pays with test instruments only: have the test card ready for the judge.
