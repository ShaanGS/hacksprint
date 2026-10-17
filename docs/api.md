# API (spec v4.1, section 13)

Every route the owner app, the pages and scripts use. JSON in and out, money in integer paise,
dates as `YYYY-MM-DD` in Asia/Kolkata, times as ISO 8601. Examples are the seeded demo shop at
3 pm on demo day, before any live act (`pnpm demo:reset`).

## Conventions

**Auth.** Every `/api` route needs one of:

- the owner's session cookie, set by `POST /api/owner/session` with the shop PIN (the web app);
- `Authorization: Bearer <SHOP_TOKEN>` (scripts, n8n).

Without either: `401 {"error": "Enter the shop PIN."}`. Pages under `/statement/{token}` and
`/loan-pack/{token}` are public by their share token and never show customer names.

**Errors.** `{"error": "<sentence>"}` with 400 (bad request), 401, 404, 409 (already done, such as
a second confirm), 502 (a provider failed: Sarvam, Gemini, Paytm), 500.

**Source labels.** Every number carries one: `verified_payment` (a payment a provider confirmed),
`supplier_bill` (a confirmed bill), `owner_said` (the owner's own words, confirmed by him), or
`estimate` (worked out by code). A total takes the label of its weakest input, in that order.

**Demo data.** While `DEMO_MODE` is on, responses carry `"demo_data": true` and screens label it.

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
  "as_of": "2026-10-18T15:00:00+05:30",
  "demo_data": true,
  "now": {
    "on_shelf": { "paise": 15200000, "label": "estimate", "cost_unknown": [] },
    "with_customers": { "paise": 1450000, "label": "owner_said" },
    "owed_to_suppliers": { "paise": 9300000, "label": "supplier_bill" }
  },
  "week": {
    "from": "2026-10-18",
    "to": "2026-10-25",
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
        { "key": "money_now", "paise": 720000, "label": "owner_said", "said_at": "2026-10-17T21:30:00+05:30", "verified_after_paise": 0 },
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
payers" line.

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

Request: `{}` (amount is the customer's balance).

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
clears the reminder and broadcasts `credit` and `rotation`. Not for the app.

### POST /api/dev/payments/{paymentId}/mark-paid

Stage fallback for A5, only while `DEMO_MODE` is on (404 otherwise). The same path as the
webhook. `200 {"paid": true, "already_paid": false}`.

## Talk and snap (B1 to B3, B7)

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
owner can also tap one to correct a wrong match. When the words are not understood:
`200 {"entry_id": null, "transcript": "…", "kind": null, "card": null, "needs": [], "choices": []}`.

### POST /api/voice/owner/{entryId}/confirm

Request: `{ "customer_id"?: uuid, "product_id"?: uuid }` (only what `needs` asked for).
Writes the entry with label `owner_said`, audits it and broadcasts.
`200 {"ok": true, "kind": "credit_given"}`; `409` if already decided.

### POST /api/voice/owner/{entryId}/reject

`200 {"ok": true}`.

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
else the distributor's terms) and flags price rises against the same distributor's last bill.

```json
{
  "totalPaise": 500000,
  "dueDate": "2026-10-21",
  "stock": [{ "productId": "…", "name": "Aashirvaad Shudh Chakki Atta", "added": 10 }],
  "issues": [{ "type": "price_up", "productId": "…", "name": "Aashirvaad Shudh Chakki Atta", "oldCostPaise": 25400, "newCostPaise": 27400, "percent": 8 }]
}
```

### GET /api/payables

```json
{
  "total_paise": 9300000,
  "payables": [
    { "id": "…", "distributor": "Sri Balaji Agencies", "bill_number": "SB-2069", "amount_paise": 2150000, "due_date": "2026-10-15", "overdue_days": 3, "label": "supplier_bill", "festival": null }
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

## Stock (C1, C2)

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

## Proof and loans (D1 to D4)

### GET /api/statement?months=3

The last 3 full months, totals only, in two blocks that are never merged. Each metric has the
label of its weakest input. Creates the share link.

```json
{
  "statement_id": "…",
  "share_url": "https://…/statement/k9f2…",
  "period": { "from": "2026-07-01", "to": "2026-09-30" },
  "months": ["2026-07", "2026-08", "2026-09"],
  "verified": {
    "digital_payments": { "label": "verified_payment", "by_month": [6200000, 6200000, 6000000] },
    "credit_recovered_by_link": { "label": "verified_payment", "by_month": [310000, 0, 420000], "median_days": 11 },
    "supplier_bills": { "label": "supplier_bill", "count": [8, 9, 8], "by_month": [15200000, 15600000, 15100000] }
  },
  "declared": {
    "cash_sales": { "label": "owner_said", "by_month": [15500000, 15500000, 15000000] },
    "credit_given": { "label": "owner_said", "by_month": [1820000, 1750000, 1900000] },
    "credit_recovered_cash": { "label": "owner_said", "by_month": [1510000, 1700000, 1480000] },
    "bills_paid_on_time": { "label": "owner_said", "percent": 82 },
    "regular_credit_customers": { "label": "owner_said", "count": 9 },
    "average_stock_value": { "label": "estimate", "paise": 14800000 },
    "money_cycle_days": { "label": "estimate", "days": 14 }
  }
}
```

### GET /statement/{shareToken}?lang=ta|en

The printable statement page (browser print to PDF).

### POST /api/loan-ready

Request: `{ "purpose": "stock_rotation" | "equipment", "amount_paise"?: number }`. Without an
amount, the need is the approved Deepavali order (`supplier_bill`); with one, it is `owner_said`.

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
  "late_credit_recovered_30d": { "verified_paise": 310000, "declared_paise": 240000 },
  "money_cycle_days": { "now": 14, "first_week": 21, "label": "estimate", "freed_per_day_paise": 580000 },
  "short_weeks_seen_early": null
}
```

## Where a number came from (E3)

### GET /api/sources/{entity}/{id}

The rows behind a number; they add up to it. The usual week is 7 times the average day of its
rows, and a monthly cost row shows its weekly share.

- `rotation/{part}`: `part` is `due_7d`, `weekly_costs`, `money_now`, `usual_week_sales`,
  `from_customers`, `late`, `on_shelf`, `with_customers` or `owed_to_suppliers`.
- `price/{productId}`: the bill line behind a price.

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
| `day_sales` | `date` | `usual_week_sales` |
| `customer` | `name`, `status`, `oldest_unpaid` | `from_customers`, `late`, `with_customers` |
| `product` | `name`, `art`, `counted_at` | `on_shelf` |

## Demo

### POST /api/demo/reset

Only while `DEMO_MODE` is on. Reseeds the demo shop with dates relative to now and broadcasts
every area. `200 {"ok": true}`. Same as `pnpm demo:reset`.

## Not built yet (P1)

`GET /api/stock/salesman-list`, `POST /api/stock/salesman-list`, `GET /api/summary/today`.
