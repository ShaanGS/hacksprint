# API (spec v4.1, section 13)

Every route under `apps/web/app/api`: first the ones the owner app, the pages and scripts use,
then, at the end, the frozen customer ordering's. JSON in and out unless a route says otherwise,
money in integer paise, dates as `YYYY-MM-DD` in Asia/Kolkata, times as ISO 8601. Examples are
the seeded demo shop at 3 pm on demo day, before any live act (`pnpm demo:reset`).

## Conventions

**Auth.** Most routes need one of:

- the owner's session cookie, set by `POST /api/owner/session` with the shop PIN (the web app);
- `Authorization: Bearer <SHOP_TOKEN>` (scripts, n8n).

Without either: `401 {"error": "Enter the shop PIN."}`. The exceptions:

- `GET /api/margins` and the frozen `/api/orders` routes take the owner's cookie only, not the
  token.
- `POST /api/owner/session` is the sign-in itself.
- `POST /api/webhooks/paytm` is Paytm's: it is trusted only when its checksum verifies with our
  merchant key and the merchant id is ours (rule 4).
- `POST /api/pay/{id}` is the test payment page's: whoever has the link can pay it, as with a
  Paytm link, and only while `DEMO_MODE` is on.
- The frozen customer routes use the customer's session cookie, set by
  `POST /api/customer/session`; without it,
  `401 {"error": "Please start again from the shop's QR code."}`.

Pages under `/statement/{token}` and `/loan-pack/{token}` are public by their share token and
never show customer names.

**Errors.** `{"error": "<sentence>"}` with 400 (bad request), 401, 404, 409 (already done, such as
a second confirm), 413 (a photo or recording too large), 429 (the PIN is locked), 502 (Gemini could
not read the bill, n8n could not be reached, or a frozen order's payment link could not be made)
and 500 (anything else, such as a Sarvam or Paytm failure elsewhere).

**Source labels.** Every number carries one, strongest first: `verified_payment` (a payment a
provider confirmed), `supplier_bill` (a confirmed bill), `estimate` (worked out by code) or
`owner_said` (the owner's own words, confirmed by him). A total takes the label of its weakest
input.

**Demo data.** While `DEMO_MODE` is on, `GET /api/rotation`, `GET /api/statement` and
`POST /api/bill-pay/run` carry `"demo_data": true`, and screens label the data as demo data.

**Realtime.** After any write that changes numbers the server broadcasts on channel
`shop:{shopId}`, event `changed`, payload `{"area": "rotation" | "credit" | "stock"}`. No data is
in the message: listen with the publishable key and refetch.

```js
supabase.channel(`shop:${shopId}`).on("broadcast", { event: "changed" }, refetch).subscribe();
```

## Sign in

### POST /api/owner/session

```json
{ "pin": "4321" }
```

`200 {"ok": true}` and the session cookie; `401 {"error": "wrong"}`; `429 {"error": "locked"}`
after 5 wrong tries (30 seconds).

## Where is my money (A1 to A5)

### GET /api/rotation

The three numbers (A1) and this week (A2). `asks` names what the owner should say for a better
forecast: `money_in_hand` (none in the last 2 days) and `cash_sales` (fewer than 7 days with a
cash entry in the last 28).

```json
{
  "as_of": "2026-10-17T15:10:52+05:30",
  "demo_data": true,
  "now": {
    "on_shelf": {
      "paise": 11455700,
      "label": "estimate",
      "cost_unknown": [
        { "product_id": "…", "name": "Lay's Classic Salted" },
        { "product_id": "…", "name": "Narasu's Filter Coffee" }
      ]
    },
    "with_customers": { "paise": 1450000, "label": "owner_said" },
    "owed_to_suppliers": { "paise": 10550000, "label": "supplier_bill" }
  },
  "week": {
    "from": "2026-10-17",
    "to": "2026-10-24",
    "needed": {
      "paise": 9550000,
      "parts": [
        { "key": "due_7d", "paise": 8400000, "label": "supplier_bill", "bills": 3, "overdue_paise": 2150000 },
        { "key": "weekly_costs", "paise": 1150000, "label": "owner_said" }
      ]
    },
    "likely": {
      "paise": 5900000,
      "parts": [
        { "key": "money_now", "paise": 720000, "label": "owner_said", "said_at": "2026-10-16T21:30:00+05:30", "verified_after_paise": 0, "paid_out_after_paise": 0 },
        { "key": "usual_week_sales", "paise": 4900000, "label": "owner_said", "days_used": 27 },
        { "key": "from_customers", "paise": 280000, "label": "owner_said", "customers": 2 }
      ]
    },
    "gap_paise": -3650000,
    "state": "short",
    "late": { "paise": 960000, "customers": 3, "label": "owner_said" },
    "asks": []
  }
}
```

`state` is `short` (gap below 0), `close` (gap under 10% of `needed`, the named constant
`CLOSE_SHARE`) or `ok`. `late` is never part of `likely`: it is the "if you collect from late
payers" line. `money_now` is the money in hand said in the last 2 days, plus verified payments
since (`verified_after_paise`), minus bills marked paid since (`paid_out_after_paise`): a bill
paid today leaves the bills due, so it leaves the money in hand too.

### GET /api/rotation/collect

Everyone who owes, in collect order (spec 9.8): late payers first (most days past their usual
first), then those with no pattern yet by amount, then the rest by amount. `reason` is a code
with its numbers; screens turn it into words. `suggest_reminder` is true only for late payers.

```json
{
  "customers": [
    {
      "customer_id": "00000000-0000-4000-8000-0000000000c4",
      "name": "Arjun Reddy",
      "lang": "kn",
      "balance_paise": 420000,
      "label": "owner_said",
      "oldest_unpaid": "2026-09-27",
      "reason": { "kind": "late", "usual_days": 12, "days_late": 9 },
      "suggest_reminder": true,
      "open_reminder": null
    },
    {
      "customer_id": "00000000-0000-4000-8000-0000000000c6",
      "name": "Imran Khan",
      "lang": "hi",
      "balance_paise": 70000,
      "label": "owner_said",
      "oldest_unpaid": "2026-10-11",
      "reason": { "kind": "unknown", "settled": 1 },
      "suggest_reminder": false,
      "open_reminder": null
    },
    {
      "customer_id": "00000000-0000-4000-8000-0000000000c5",
      "name": "Priya Natarajan",
      "lang": "ta",
      "balance_paise": 160000,
      "label": "owner_said",
      "oldest_unpaid": "2026-10-14",
      "reason": { "kind": "due", "usual_days": 10, "due_in_days": 6 },
      "suggest_reminder": false,
      "open_reminder": null
    }
  ],
  "late_paise": 960000
}
```

`reason.kind`: `late`, `unknown` (fewer than 2 settled credits), `due` (expected within 7 days)
or `later` (expected after 7 days). `open_reminder` is
`{ "id", "payment_id", "payment_link_url", "created_at" }` while a link is unpaid.

### POST /api/credit/{customerId}/remind

Makes (or reuses) a payment link for what the customer owes and returns the WhatsApp message in
the customer's language, from fixed templates. The owner sends it from his own WhatsApp.

Request: `{}` (amount is the customer's balance). `409` when the customer owes nothing.

```json
{
  "reminder_id": "6f3c…",
  "payment_id": "a1b2…",
  "amount_paise": 420000,
  "message_text": "ನಮಸ್ಕಾರ Arjun Reddy, Lakshmi Stores ಅಂಗಡಿಯಿಂದ. ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ₹4,200 ಬಾಕಿ ಇದೆ. ಇಲ್ಲಿ ಪಾವತಿಸಬಹುದು: https://… ಧನ್ಯವಾದ.",
  "payment_link_url": "https://…",
  "whatsapp_url": "https://wa.me/91XXXXXXXXXX?text=%E0%B2%A8…"
}
```

### POST /api/webhooks/paytm

Paytm's paid callback. Verified by checksum and merchant id; idempotent (a second callback for
the same payment changes nothing). A paid reminder link writes a `verified_payment` repayment,
clears the reminder and broadcasts `credit` and `rotation`. Not for the app. The link is found by
`linkId`, or by `MERC_UNQ_REF`, where Paytm's link webhook puts it (at times as `LI_<id>`). Each
link names this URL as its `statusCallbackUrl`. Every callback is kept in `audit_log`.
`200 {"ok": true, "paid": true, "alreadyPaid": false}`, or `{"ok": true, "paid": false}` when
the status is not a success; `401` for a bad checksum or another merchant id.

### POST /api/payments/{paymentId}/check

Whether a payment link has been paid. A Paytm link still waiting is asked about at Paytm (Fetch
Transaction, signed with our key, server to server); a success for the full amount goes through
the same idempotent path as the webhook. Paytm switches its link webhook on only through support,
so the app checks every 5 to 6 seconds while a reminder or an agent is open.
`200 {"paid": true}`; `404` for another shop's payment.

### POST /api/dev/payments/{paymentId}/mark-paid

Stage fallback for A5, only while `DEMO_MODE` is on (404 otherwise). The same path as the
webhook. `200 {"paid": true, "already_paid": false}`.

### POST /api/pay/{id}

The button on our own test payment page, `/pay/{id}`. Without Paytm keys the shop is in test
mode, and every payment link points at that page instead of Paytm. Only while `DEMO_MODE` is on
(404 otherwise), and only for a test payment: a Paytm link gives `404` and is paid on Paytm. No
sign-in, as with a Paytm link: whoever has the link can pay it. The same idempotent path as the
webhook, so a paid reminder link settles the credit and broadcasts. No body.
`200 {"paid": true, "alreadyPaid": false}`.

## Talk and snap (B1 to B4, B7)

### POST /api/voice/owner

Multipart: `audio` (WebM or MP4 from the phone; a recorded file works too). Speech becomes one
entry: `credit_given`, `credit_repaid_cash`, `day_close` or `stock_count`. Nothing is saved until
the owner confirms. Every number in the card was found in the transcript by code.

```json
{
  "entry_id": "9d2e…",
  "transcript": "ரமேஷ் 200 கணக்கில்",
  "kind": "credit_given",
  "card": {
    "customer": { "id": "00000000-0000-4000-8000-0000000000c9", "name": "Ramesh Kumar" },
    "amount_paise": 20000
  },
  "needs": [],
  "choices": [
    { "id": "00000000-0000-4000-8000-0000000000c4", "name": "Arjun Reddy" },
    { "id": "00000000-0000-4000-8000-0000000000c9", "name": "Ramesh Kumar" }
  ]
}
```

Card fields by kind:
- `credit_given` and `credit_repaid_cash`: `customer`, `amount_paise`.
- `day_close`: `cash_sales_paise`, `money_in_hand_paise` (either may be null).
- `stock_count`: `product` `{id, name}`, `qty`.

`needs` lists what is still missing: `customer` or `product` (name not matched: tap one of
`choices`), `amount` or `qty` (not heard: say it again). `choices` are the shop's customers for a
credit card, its products (`{id, name, art}`) for a stock count, and empty for a day close; the
owner can also tap one to correct a wrong match.

A question about his money, or a spoken list of items, comes back as `kind: "question"` with an
answer written by code from the shop's numbers, in the language sent as the form field `lang`
(`en` or `ta`; otherwise the shop's language). Nothing is saved.

```json
{
  "entry_id": null,
  "transcript": "Can I pay my bills this week?",
  "kind": "question",
  "card": null,
  "needs": [],
  "choices": [],
  "answer": {
    "topic": "week",
    "text": "This week you are short by ₹36,500. Your bills need ₹95,500 and about ₹59,000 is likely to come in. Collecting from 3 late payers would bring ₹9,600."
  }
}
```

`answer.topic` is `week`, `collect`, `customer`, `stock`, `dues`, `loan` or `items` (a list of
items priced at the shop's own selling prices), or a job for an agent: `collect_agent` ("collect
from the late payers") or `reorder` ("order what's running low"). For those two the app offers
"Let the agent do it", which opens the collection or reorder agent. When the words are not
understood:
`200 {"entry_id": null, "transcript": "…", "kind": null, "card": null, "needs": [], "choices": []}`.

### POST /api/voice/owner/{entryId}/confirm

Request: `{ "customer_id"?: uuid, "product_id"?: uuid }` (only what `needs` asked for).
Writes the entry with label `owner_said`, audits it and broadcasts.
`200 {"ok": true, "kind": "credit_given"}`; `400` while something is still missing or the tapped
customer or product is not the shop's; `409` if already decided.

### POST /api/voice/owner/{entryId}/reject

Nothing is written; the no is audited. `200 {"ok": true, "kind": "credit_given"}`; `409` if
already decided.

### GET /api/credit

Everyone who owes, most first, in the same row shape as the collect list.

```json
{
  "total_paise": 1450000,
  "label": "owner_said",
  "customers": [
    {
      "customer_id": "…c4",
      "name": "Arjun Reddy",
      "lang": "kn",
      "balance_paise": 420000,
      "label": "owner_said",
      "oldest_unpaid": "2026-09-27",
      "reason": { "kind": "late", "usual_days": 12, "days_late": 9 },
      "suggest_reminder": true,
      "open_reminder": null
    }
  ]
}
```

### GET /api/credit/{customerId}

One customer's entries, newest first; they add up to the balance.

```json
{
  "customer_id": "…c4",
  "name": "Arjun Reddy",
  "lang": "kn",
  "balance_paise": 420000,
  "reason": { "kind": "late", "usual_days": 12, "days_late": 9 },
  "entries": [
    { "id": "…", "at": "2026-09-27T18:10:00+05:30", "kind": "credit_sale", "amount_paise": 420000, "label": "owner_said", "note": "Said at the counter", "payment_id": null },
    { "id": "…", "at": "2026-09-20T11:00:00+05:30", "kind": "repayment", "amount_paise": -310000, "label": "verified_payment", "note": null, "payment_id": "…" }
  ]
}
```

`reason` is null when nothing is owed.

### POST /api/bills

Multipart `photo` (JPEG, shrunk to 1600 px by the phone). Returns the lines read from the bill
for the owner to check, with the distributor, the bill number and the due date if printed.

```json
{
  "id": "…", "distributorId": "…", "printedDistributor": "SRI BALAJI AGENCIES", "billNumber": "SB-2073",
  "printedTotalPaise": 500000, "dueDate": "2026-10-21",
  "lines": [
    { "printedName": "Aashirvaad Shudh Chakki Atta 5 kg", "productId": "…", "qty": 10, "unitCostPaise": 27400, "mrpPaise": 29500, "printedTotalPaise": 274000 }
  ],
  "distributors": [{ "id": "…", "name": "Sri Balaji Agencies" }],
  "alreadyAddedOn": null
}
```

### POST /api/bills/{id}/confirm

```json
{ "distributor_id": "…", "due_date": "2026-10-21", "lines": [{ "product_id": "…", "qty": 10, "unit_cost_paise": 27400, "mrp_paise": 29500 }] }
```

Adds stock, sets prices from the MRP, records the payable (`supplier_bill`, due on `due_date`,
else the distributor's terms), checks the delivery against the latest order sent to that
distributor (B4) and flags price rises against the same distributor's last bill (B3).

```json
{
  "totalPaise": 500000,
  "dueDate": "2026-10-21",
  "stock": [{ "productId": "…", "name": "Aashirvaad Shudh Chakki Atta", "added": 10 }],
  "issues": [{ "type": "price_up", "productId": "…", "name": "Aashirvaad Shudh Chakki Atta", "oldCostPaise": 25400, "newCostPaise": 27400, "percent": 8 }]
}
```

Each `stock` row also has `art`, `unit` and `nowQty`. `issues` can also hold the delivery check's
`missing` (`ordered`) and `qty_mismatch` (`ordered`, `received`). `409` if the bill was already
confirmed or added.

### GET /api/payables

```json
{
  "total_paise": 10550000,
  "payables": [
    { "id": "…", "distributor": "Sri Balaji Agencies", "bill_number": "SB-2070", "kind": "supplier_bill", "amount_paise": 2150000, "due_date": "2026-10-14", "overdue_days": 3, "label": "supplier_bill", "festival_order": false },
    { "id": "…", "distributor": "Murugan Traders", "bill_number": "MT-140", "kind": "supplier_bill", "amount_paise": 1400000, "due_date": "2026-10-19", "overdue_days": 0, "label": "supplier_bill", "festival_order": false },
    { "id": "…", "distributor": "Sri Balaji Agencies", "bill_number": "DV-1", "kind": "supplier_bill", "amount_paise": 4850000, "due_date": "2026-10-21", "overdue_days": 0, "label": "supplier_bill", "festival_order": true },
    { "id": "…", "distributor": "Sri Balaji Agencies", "bill_number": "SB-2072", "kind": "supplier_bill", "amount_paise": 2150000, "due_date": "2026-10-28", "overdue_days": 0, "label": "supplier_bill", "festival_order": false }
  ]
}
```

### POST /api/payables/{id}/paid

Request: `{ "paid_via": "cash" | "bank" | "upi" }`. The owner says he paid it; the record is
`owner_said`. `200 {"ok": true}`; `409` if already paid.

### GET /api/setup/costs and PUT /api/setup/costs

```json
{
  "weekly_paise": 1150000,
  "label": "owner_said",
  "costs": [
    { "kind": "rent", "amount_paise": 1300000, "period": "month" },
    { "kind": "staff", "amount_paise": 300000, "period": "week" },
    { "kind": "home", "amount_paise": 350000, "period": "week" },
    { "kind": "cash_purchases", "amount_paise": 200000, "period": "week" }
  ]
}
```

PUT takes `{"costs": [...]}` in the same shape and replaces them.

## Stock (C1, C2, C4)

### GET /api/stock

Every product with its estimate (spec 9.1): last count plus what bills brought minus weekly sales
times weeks since the count. `count_asked` marks the top 20 by money, the ones to count by voice.

```json
{
  "on_shelf_paise": 11000000,
  "label": "estimate",
  "cost_unknown": [],
  "products": [
    {
      "product_id": "…", "name": "Gold Winner Sunflower Oil", "art": "oil", "unit": "pack",
      "pack_size": "1 L", "estimate_qty": 61, "label": "estimate",
      "counted_at": "2026-10-11T20:00:00+05:30", "weekly_sales": 14, "sales_from": "counts",
      "days_left": 30.5, "unit_cost_paise": 14200, "value_paise": 866200,
      "tags": [], "count_asked": true
    }
  ],
  "festival_order": {
    "festival": "Deepavali", "distributor": "Sri Balaji Agencies", "bill_number": "DV-1",
    "total_paise": 4850000, "label": "supplier_bill", "lines": 6
  }
}
```

`festival_order` is the approved festival order (C3, D4) with its prices from bills, or null.
`counted_at` is null when never counted. `weekly_sales` and `days_left` are null when there is
not enough data; `days_left` is `"not_moving"` at zero sales. `tags`: `low` (under 7 days),
`slow` (over 30 days or not moving). Products with no bill cost have `unit_cost_paise: null` and
are listed in `cost_unknown`.

### GET /api/stock/stuck

```json
{
  "stuck_paise": 2310000,
  "label": "estimate",
  "products": [{ "product_id": "…", "name": "Idhayam Gingelly Oil", "value_paise": 690000, "days_left": "not_moving" }]
}
```

These are the products not to reorder now.

### GET /api/margins

Profit per item (C4), worked out by code from confirmed bill lines: the selling price minus the
latest bill cost. The owner's cookie only, not the token. A JSON array, in camelCase like the bill
routes, one entry per product that has a confirmed bill line:

`{ "productId", "name", "art", "pricePaise", "costPaise", "distributor", "profitPaise", "percent",
"cheaper" }`

`costPaise` and `distributor` are from the latest bill; `percent` is profit as a whole percent of
the selling price. `cheaper` is `{ "distributor", "costPaise", "savingPaise" }` when another
distributor's own latest cost is lower, else null. Entries a cheaper distributor would improve
come first, the biggest saving first; the rest follow, lowest margin first.

## Agents (decision of Oct 17)

The collection agent uses the routes above: `GET /api/rotation/collect` for the late payers in
collect order, `POST /api/credit/{customerId}/remind` for each, then `POST
/api/payments/{paymentId}/check` while it watches. The owner sends each message himself. The same
link also shows as a QR on the owner's screen, so someone at the counter can scan it and pay; the
agent watches that payment the same way.

### GET /api/reorder

The reorder agent's list: products that run out this week (`low`), at the quantity and price of
their last confirmed bill, grouped by that bill's distributor. Slow stock is never low, so it is
never ordered. Seeded demo, after the owner counted Maggi at 10 packets:

```json
{
  "groups": [
    {
      "distributor_id": "9856…",
      "distributor": "Murugan Traders",
      "total_paise": 73200,
      "label": "supplier_bill",
      "lines": [
        {
          "product_id": "c83c…",
          "name": "Maggi Masala Noodles",
          "art": "noodles",
          "unit": "pack",
          "qty": 61,
          "unit_cost_paise": 1200,
          "line_paise": 73200,
          "billed_on": "2026-10-12"
        }
      ]
    }
  ],
  "skipped": { "slow": 10, "stuck_paise": 4592700, "lasting": 9, "no_bill": [] }
}
```

### POST /api/reorder

The owner approved one distributor's lines. Request:
`{ "distributor_id": "…", "product_ids": ["…"] }`. The server works the list out again, so
quantities never come from the phone; `409` "The list changed. Look again." if it no longer
matches. It saves a purchase order (`festival` empty, so never the festival order) with its items,
which the next bill from that distributor is checked against (B4), then posts
`{ "shopName", "distributorName", "lines": [{ "name", "qty", "unit" }] }` to `N8N_WEBHOOK_URL`
with the header `x-munim-secret: N8N_WEBHOOK_SECRET`; the n8n workflow emails the distributor.
`502` when n8n cannot be reached (the order stays a draft). Audited as `reorder.sent`.

```json
{ "purchase_order_id": "…", "distributor": "Murugan Traders", "total_paise": 73200, "lines": 1 }
```

### POST /api/reorder/{orderId}/pay

Test mode only: a payment link for a sent order at its last bill prices (a Paytm test link with
Paytm keys in, else our `/pay` page, which pays only while `DEMO_MODE` is on). Asking again gives
the same link; `409` if the order was not sent or has no bill prices. In test mode the money
lands in a test account, not the distributor's; the payment is kept apart
(`payments.purchase_order_id`) and never counted as sales or cash, so no number changes.

```json
{ "payment_id": "…", "url": "https://…", "amount_paise": 73200, "paid": false }
```

## Planner agent (decision of Oct 18)

Gemini plans the week over read-only tools (`lib/planner`); the plan holds only actions, ids and
reason codes, and every amount on it comes from code. See `docs/agent-system.md`.

### POST /api/agent/plan

Request: `{ "goal": "…" }` (optional, the owner's spoken question, at most 300 characters). The
answer is a stream of JSON lines (`application/x-ndjson`), one per event, as it happens:

- `{ "type": "step", "name": "list_late_payers", "meta": { "count": 3 } }`: a tool the agent used.
- `{ "type": "plan", … }`: the checked plan, last.
- `{ "type": "error" }`: the run failed.

The plan line:

```json
{
  "type": "plan",
  "run_id": "…",
  "planned_by": "model",
  "rules_because": null,
  "as_of": "2026-10-18T10:00:00+05:30",
  "week": { "state": "short", "gap_paise": -3650000, "label": "owner_said" },
  "mudra_band": "shishu",
  "steps": [
    {
      "action": "collect",
      "reason": "late_payers_first",
      "ids": ["…"],
      "names": ["Arjun Reddy", "Meena Krishnan", "Rahul Sharma"],
      "amount_paise": 960000,
      "label": "owner_said",
      "after_label": "owner_said",
      "gap_after_paise": -2690000,
      "in_hand_after_paise": 1680000,
      "opens": "collect"
    }
  ],
  "guardrails": {
    "rules": [{ "rule": "within_owner_limit", "status": "blocked", "count": 1 }],
    "blocked": 1,
    "fixed": 0,
    "removed": 1
  },
  "dropped": [
    {
      "action": "pay_bills",
      "why": "no_bill_fits_limit",
      "rule": "within_owner_limit",
      "held": [
        {
          "distributor": "Sri Balaji Agencies",
          "amount_paise": 2150000,
          "reason": "not_enough_in_hand",
          "needs_more_paise": 1630000,
          "due_in_days": 0,
          "keep_paise": 200000,
          "festival": "Deepavali"
        }
      ]
    }
  ],
  "fixed": [{ "what": "personal_data_removed", "rule": "no_personal_data", "count": 1 }],
  "usage": { "calls": 2, "input_tokens": 3291, "output_tokens": 215, "thought_tokens": 0 }
}
```

- `guardrails.rules` lists all 8 rules with `passed`, `blocked` or `fixed` (shortened above).
- `dropped` is every step a guardrail stopped, with its rule; a held bill carries the numbers
  that explain it.
- `fixed` is what code changed instead: collecting moved first, personal data removed before it
  reached the model, or a run stopped at its token budget.
- `planned_by` is `rules` when the model could not answer (`rules_because` `no_answer`) or when
  its plan broke the rules (`plan_blocked`).

Audited as `planner.plan` with the actions, the blocked reasons, the fixes and the token use.

### GET /api/agent/runs/{runId}

One saved run, planner or bill-pay, with every step in order:
- the summary;
- each model call's tokens (`note/model_call`);
- each tool call and result;
- the model's raw plan (`note/proposed`);
- each guardrail fix (`note/guardrail`);
- the guardrail report (`note/guardrails`);
- the plan.

`404` for an unknown run.

## Bill-pay agent (decision of Oct 18)

The owner sets a mandate by tapping chips: how much the agent may pay in any 7 days and how much
money must stay in hand. For each unpaid supplier bill the agent decides pay or hold, by fixed
rules (`lib/rotation/mandate.ts`), never the model. A Paytm link collects money for the shop and
cannot pay a distributor, so a bill to pay gets a UPI link
(`upi://pay?pa=<upi id>&pn=<distributor>&am=<rupees.paise>&cu=INR&tn=<bill number>`) that opens
the owner's own UPI app; he pays there with his UPI PIN and then says he paid. We never hold or
move the money.

### GET /api/bill-pay/mandate

```json
{
  "mandate": {
    "weekly_limit_paise": 2500000,
    "keep_in_hand_paise": 200000,
    "set_at": "2026-10-18T15:02:11+05:30",
    "label": "owner_said"
  }
}
```

`mandate` is null until the owner sets one, and after he stops it.

### PUT /api/bill-pay/mandate

Request: `{ "weekly_limit_paise": 1000000 | 2500000 | 5000000, "keep_in_hand_paise": 100000 |
200000 | 500000 }`, the chip amounts only (400 otherwise). The live mandate is revoked first, then
the new one added, so every limit he set stays on record and a failed save leaves no limit rather
than an old one. Audited as `mandate.set`; broadcasts `rotation`. `200 {"mandate": {...}}` as
above; `409` if another save landed at the same moment.

### DELETE /api/bill-pay/mandate

Stop: the agent pays nothing until a new limit is set. Audited as `mandate.stopped`; broadcasts
`rotation`. `200 {"ok": true}`; `409` if there is no live mandate.

### POST /api/bill-pay/run

One run of the agent, saved in `agent_runs` (`agent` `bill_pay`, `planned_by` `rules`) with its
decisions as one `agent_steps` row (`kind` `plan`, `name` `decisions`), audited as
`bill_pay.run`. Nothing is paid by a run. The rules walk the unpaid supplier bills, most overdue
first, then by due date (loan EMIs are left out):

- the festival order's bill: hold, `festival_order` (the loan is for it);
- due more than 2 days ahead: hold, `not_due_yet`;
- no mandate: hold, `no_mandate`;
- more than the limit has left (the weekly limit minus the agent's payments in the last 7 days
  minus the bills this run already chose): hold, `over_limit`;
- more than the money in hand above the floor, after the bills already chosen: hold,
  `not_enough_in_hand`, with `needs_more_paise` (how much more money in hand it would take, the
  floor included);
- the distributor has no UPI id: hold, `no_upi_id`;
- else pay, `within_limit`. A bill is paid whole or not at all.

The money in hand is the week's `money_now` (see `GET /api/rotation`). Seeded demo, with the
limit at ₹25,000 and ₹2,000 kept, after the three late payers paid ₹9,600 by link:

```json
{
  "run_id": "…",
  "mandate": { "weekly_limit_paise": 2500000, "keep_in_hand_paise": 200000, "set_at": "…", "label": "owner_said" },
  "money_in_hand_paise": 1680000,
  "money_in_hand_label": "owner_said",
  "keep_in_hand_paise": 200000,
  "limit_left_paise": 1100000,
  "in_hand_after_paise": 280000,
  "bills_total_paise": 10550000,
  "festival": "Deepavali",
  "decisions": [
    { "payable_id": "…", "distributor": "Sri Balaji Agencies", "distributor_id": "…", "bill_number": "SB-2070", "amount_paise": 2150000, "label": "supplier_bill", "due_date": "2026-10-15", "due_in_days": 0, "overdue_days": 3, "decision": "hold", "reason": "not_enough_in_hand", "needs_more_paise": 670000, "upi_id": null, "upi_url": null },
    { "payable_id": "…", "distributor": "Murugan Traders", "distributor_id": "…", "bill_number": "MT-140", "amount_paise": 1400000, "label": "supplier_bill", "due_date": "2026-10-20", "due_in_days": 2, "overdue_days": 0, "decision": "pay", "reason": "within_limit", "needs_more_paise": 0, "upi_id": "murugantraders.demo@example", "upi_url": "upi://pay?pa=murugantraders.demo@example&pn=Murugan%20Traders&am=14000.00&cu=INR&tn=MT-140" },
    { "payable_id": "…", "distributor": "Sri Balaji Agencies", "distributor_id": "…", "bill_number": "DV-1", "amount_paise": 4850000, "label": "supplier_bill", "due_date": "2026-10-22", "due_in_days": 4, "overdue_days": 0, "decision": "hold", "reason": "festival_order", "needs_more_paise": 0, "upi_id": null, "upi_url": null },
    { "payable_id": "…", "distributor": "Sri Balaji Agencies", "distributor_id": "…", "bill_number": "SB-2072", "amount_paise": 2150000, "label": "supplier_bill", "due_date": "2026-10-29", "due_in_days": 11, "overdue_days": 0, "decision": "hold", "reason": "not_due_yet", "needs_more_paise": 0, "upi_id": null, "upi_url": null }
  ],
  "paid_this_week": [],
  "demo_data": true
}
```

`limit_left_paise` and `in_hand_after_paise` are after the bills this run would pay.
`paid_this_week` lists the bills paid under the agent in the last 7 days
(`payable_id`, `distributor`, `bill_number`, `amount_paise`, `paid_at`, `label` `owner_said`):
what `limit_left_paise` already took off. The demo distributors' UPI ids use a handle no UPI app
has registered, so no real money can move on stage.

### POST /api/bill-pay/{payableId}/paid

Request: `{ "run_id": "…" }`. The owner paid this bill from his UPI app and says so. The rules
decide again first: `409` "This bill can no longer be paid inside your limit. Look again." unless
the bill is still `pay`; `404` for an unknown run. The bill is marked paid by `upi` (his word,
`owner_said`, never `verified_payment`) with the run on it (`payables.agent_run_id`), which counts
it against the limit. Audited as `bill_pay.paid`; broadcasts `rotation`. A refusal is audited too,
as `bill_pay.refused` with the rule's reason.

```json
{ "payable_id": "…", "amount_paise": 1400000, "paid_via": "upi", "label": "owner_said" }
```

## Proof and loans (D1 to D4)

### GET /api/statement?months=3

The last 3 full months, totals only, in two blocks that are never merged. Each metric has the
label of its weakest input. Creates the share link.

```json
{
  "statement_id": "…",
  "share_url": "https://…/statement/k9f2…",
  "shop": "Lakshmi Stores",
  "period": { "from": "2026-07-01", "to": "2026-09-30" },
  "generated_at": "2026-10-18T09:30:00.000Z",
  "demo_data": true,
  "months": ["2026-07", "2026-08", "2026-09"],
  "verified": {
    "digital_payments": { "label": "verified_payment", "by_month": [6200000, 6550000, 6620000] },
    "credit_recovered_by_link": { "label": "verified_payment", "by_month": [0, 350000, 620000], "median_days": 8 },
    "supplier_bills": { "label": "supplier_bill", "count": [8, 9, 9], "by_month": [14200000, 15949600, 16510800] }
  },
  "declared": {
    "cash_sales": { "label": "owner_said", "by_month": [15500000, 15500000, 15000000] },
    "credit_given": { "label": "owner_said", "by_month": [790000, 1250000, 1485000] },
    "credit_recovered_cash": { "label": "owner_said", "by_month": [610000, 965000, 520000] },
    "bills_paid_on_time": { "label": "owner_said", "percent": 78, "bills": 23 },
    "regular_credit_customers": { "label": "owner_said", "count": 7 },
    "average_stock_value": { "label": "estimate", "paise": 6457100 },
    "money_cycle_days": { "label": "estimate", "days": 3.6 }
  }
}
```

### GET /statement/{shareToken}?lang=ta|en

The printable statement page (browser print to PDF). Each number opens the rows behind it: a day
and an amount, never a customer's name.

### POST /api/loan-ready

Request: `{ "purpose": "stock_rotation" | "equipment", "amount_paise"?: number }`. Without an
amount, the need is the approved Deepavali order (`supplier_bill`); with one, it is `owner_said`.
`409` when there is no amount and no approved festival order.

```json
{
  "loan_request_id": "…",
  "need": { "paise": 4850000, "label": "supplier_bill", "source": "festival_order", "order": "Deepavali" },
  "gap_without_order_paise": 1200000,
  "can_collect_paise": 960000,
  "loan_needed_paise": 2700000,
  "no_loan_needed": false,
  "scheme": {
    "name": "PM Mudra Yojana (PMMY)", "band": "shishu", "band_name": "Shishu", "range": "up to ₹50,000",
    "no_collateral": true, "apply_at": "Your bank branch, or online on JanSamarth",
    "links": [{ "label": "Department of Financial Services", "url": "https://financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy" }]
  },
  "loan_form": { "purpose": "stock_rotation", "line": "Ask for working capital as a cash credit limit with a RuPay MUDRA card.", "links": [{ "label": "IDBI Bank", "url": "https://www.idbi.bank.in/rupay-mudra-debit-card.aspx" }] },
  "registration": { "step": "udyam", "line": "Register on Udyam first. It is free and needs your Aadhaar and PAN.", "url": "https://udyamregistration.gov.in/" },
  "checked_on": "2026-10-17",
  "fixed_lines": ["The bank decides; we do not promise approval.", "Applying for Mudra or Udyam costs nothing. Anyone asking you for a fee is not the government."]
}
```

When collecting is enough: `"loan_needed_paise": 0, "no_loan_needed": true, "scheme": null`,
and the screen links the collect list.

### POST /api/loan-apply

The apply agent, only while `DEMO_MODE` is on (404 otherwise). A simulation: it returns the
loan application as it would read, filled from the shop's records, and sends nothing to any
portal or lender (spec rule 8). Request: `{ "loan_request_id": uuid }` from a loan-ready check
that found a loan is needed.

```json
{
  "simulated": true,
  "shop": "Lakshmi Stores",
  "owner": "Murugan",
  "loan_paise": 2700000,
  "purpose": "stock_rotation",
  "band": "shishu",
  "months": 3,
  "monthly_sales": { "verified_paise": 6456700, "declared_paise": 15333300 },
  "bills_paid_on_time": 78,
  "documents": [{ "key": "pan", "status": "have" }, { "key": "udyam", "status": "missing" }]
}
```

### POST /api/loan-pack

Request: `{ "loan_request_id": "…" }`. `409` when no loan is needed.

```json
{ "loan_pack_id": "…", "share_url": "https://…/loan-pack/p3x8…" }
```

### GET /loan-pack/{shareToken}?lang=ta|en

The printable pack: the statement, the stock quotation (the Deepavali order at bill prices), the
document checklist (have or missing), where to apply with official links, and the fee warning.
No customer names.

### GET /api/value

Measurable value (spec 11a).

```json
{
  "late_credit_recovered_30d": { "verified_paise": 620000, "declared_paise": 40000 },
  "money_cycle_days": { "now": 4, "first_weeks": 1, "label": "estimate", "freed_per_day_paise": 603571 },
  "short_weeks_seen_early": null
}
```

## Where a number came from (rule 5)

### GET /api/sources/{entity}/{id}

The rows behind a number; they add up to it. The usual week is 7 times the average day of its
rows, and a monthly cost row shows its weekly share.

- `rotation/{part}`: `part` is `due_7d`, `weekly_costs`, `money_now`, `usual_week_sales`,
  `from_customers`, `late`, `on_shelf`, `with_customers` or `owed_to_suppliers`.
- `price/{productId}`: the bill line behind a price.
- `order/{orderId}` and `cart/current` serve the frozen customer ordering (see the end).

```json
{
  "part": "due_7d",
  "total_paise": 8400000,
  "rows": [
    { "kind": "bill", "distributor": "Sri Balaji Agencies", "bill_number": "SB-2070", "due_date": "2026-10-15", "overdue_days": 3, "paise": 2150000, "label": "supplier_bill" },
    { "kind": "bill", "distributor": "Sri Balaji Agencies", "bill_number": "DV-1", "due_date": "2026-10-22", "overdue_days": 0, "paise": 4850000, "label": "supplier_bill" }
  ]
}
```

Each row is a `kind` with its facts, so a screen writes it in the reader's language:

| `kind` | Facts | Parts |
| --- | --- | --- |
| `bill` | `distributor`, `bill_number`, `due_date`, `overdue_days` | `due_7d`, `owed_to_suppliers` |
| `cost` | `cost` (`rent`, `staff`, `home`, `cash_purchases`, `other`), `period` | `weekly_costs` |
| `money_in_hand` | `at` | `money_now` |
| `payment` | `at` | `money_now` |
| `bill_paid` | `distributor`, `bill_number`, `at` (its `paise` is negative: money that went out) | `money_now` |
| `day_sales` | `date` | `usual_week_sales` |
| `customer` | `name`, `status`, `oldest_unpaid` | `from_customers`, `late`, `with_customers` |
| `product` | `name`, `art`, `counted_at` | `on_shelf` |

## Demo

### POST /api/demo/reset

Only while `DEMO_MODE` is on (404 otherwise). Reseeds the demo shop with dates relative to now
and broadcasts every area. `200 {"ok": true}`. Same as `pnpm demo:reset`.

## Not built yet (P1)

`GET /api/stock/salesman-list`, `POST /api/stock/salesman-list`, `GET /api/summary/today`.

## Frozen: customer ordering

Customer voice ordering (`/order`, `/qr` and order approval) came first and is frozen: its code
and tests stay, it is out of the navigation, and these routes are not extended. The customer
routes use the customer's session cookie; the `/api/orders` routes take the owner's cookie only.

- `POST /api/customer/session`: `{ "name", "phone", "lang" }` signs the customer in on this phone
  and opens the conversation: `{ "turns", "cart", "review": false }`. `400` for a phone that is
  not 10 digits.
- `GET /api/customer/session`: who is signed in on this phone and the order they are waiting on:
  `{ "customer": { "name", "phone", "lang" } | null, "activeOrder" }`. Needs no session.
- `POST /api/voice/turn`: one turn of the conversation. Multipart `audio` and `lang` answer as two
  lines of JSON, `{"type": "heard", "text"}` then `{"type": "result", …}` (or
  `{"type": "error"}`); JSON `{ "lang", "text" }` (typed) or
  `{ "lang", "choice": { "turnId", "index" } }` (a tapped choice) answers with the result.
  `413` for a recording over 2 MB.
- `GET /api/voice/audio/{turnId}`: the shop's reply as speech (`audio/mpeg`, from Sarvam), only
  for the customer whose conversation it is.
- `POST /api/cart/items`: `{ "code", "qty" }`, a −/+ tap on the review sheet, straight to the
  cart: `{ "cart" }`. `409` when there is no open order.
- `POST /api/cart/send`: `{ "paymentMode": "link" | "credit" }` sends the open order to the owner
  for approval: `{ "number" }`. `409` when it is empty or already sent.
- `GET /api/customer/orders/{number}`: where this customer's order is now; the status page polls
  it every 2 seconds.
- `GET /api/sources/cart/current`: the bill behind each price in the customer's open order: MRPs
  and bills, never the shop's costs.
- `GET /api/orders?status=`: the owner's orders, today's and any still open, optionally of one
  status: `{ "orders" }`. Polled every 2 seconds.
- `GET /api/orders/{id}/announce`: the new order, spoken in the owner's language (`audio/mpeg`,
  from Sarvam).
- `POST /api/orders/{id}/approve`: `{ "payment_mode"?: "link" | "credit" }`, the owner's approval
  (guardrail 3): `{ "status": "awaiting_payment" | "on_credit", "payUrl" }`. `payUrl` is null on
  account, or when the link could not be made yet. `409` if already decided.
- `POST /api/orders/{id}/voice-approve`: multipart `audio`, the owner's spoken decision ("seri",
  "venda", "kanakku"): `{ "heard", "decision": "approve" | "reject" | "credit" | null, "payUrl" }`.
  Nothing happens unless one of those words was heard.
- `POST /api/orders/{id}/reject`:
  `{ "reason": "out_of_stock" | "shop_closed" | "cannot_deliver" | "other" }`, then
  `{ "ok": true }`.
- `POST /api/orders/{id}/payment-link`: makes the payment link again when it failed at approval:
  `{ "payUrl" }`; `502` if it still cannot be made.
- `POST /api/orders/{id}/deliver`: marks a paid or on-account order delivered: `{ "ok": true }`;
  `409` otherwise.
- `GET /api/sources/order/{orderId}`: the bill behind each price in an order, for the owner.
