# Product spec v2: the kirana manager

Single source of truth for what we build and why. This version replaces v1. The product has no name yet; do not invent one.

---

## 1. One line

Kirana owners told surveys their hardest jobs are buying stock, serving customers and seeing their profit. We do all three from one phone, with no typing and no cost, and the records this creates become the verified history that gets the shop a loan.

## 2. Context

- Hack Sprint (SDG Club, MIT Bengaluru), Fintech track, PS21: measurable value for small merchants; think beyond existing solutions.
- 24-hour in-person build, judged on a live demo. Sponsors Paytm, Sarvam, n8n and Google each do a real job.
- Judges ask the team to explain code. Clarity beats cleverness. Demo reliability beats extra features.

## 3. Customer

The 1 to 3 person neighbourhood kirana in a city or town that takes phone orders, gives credit to regulars, and buys stock from local distributors. Not franchise kiranas, paan shops or wholesalers.

Verified pains we design against:

| Pain | Share | Source |
| --- | --- | --- |
| Want better trade margins | 89% of 4,593 retailers | CPM India, Kirana 2025 |
| Customer shift to modern trade / online / quick commerce | 86% | CPM India, Kirana 2025 |
| Ordering, checking and receiving stock | 74% | 60 Decibels survey (Flourish, 2022) |
| Attending to customers | 74% | 60 Decibels survey |
| Managing inventory | 60% | 60 Decibels survey |
| No visibility into profit and margin | 54% | 60 Decibels survey |
| Want credit support | 45% | CPM India, Kirana 2025 |
| Plan any tech investment this year | only 22% | CPM India, Kirana 2025 |

Consequence: the product must be free, need no typing, run on the owner's existing phone, and pitch outcomes (margin, stock, money), never "automation".

## 4. Moat

The AI is not the moat. The moat is data nobody else captures, gathered with zero data entry:

1. **Records as a by-product.** Orders, credit and stock are recorded because we took the order or read the bill. Credit-ledger apps need the owner to type; past kirana storefronts failed because they added work.
2. **Richer than payments.** Paytm sees amounts. We see baskets, regular customers, credit given and repaid, and supplier costs.
3. **Both sides of the shop's money.** What customers owe the shop and what the shop owes distributors.
4. **Learns each shop.** Usual orders, customer languages, payment habits, supplier prices. Switching loses that memory.
5. **Existing distribution.** Paytm agents and distributor salesmen already visit these shops weekly.

## 5. The three surfaces

| Surface | Who | Built with | Owner of build |
| --- | --- | --- | --- |
| Customer voice page (QR) | Customer | Next.js (this repo) | Shaan |
| Owner app | Shop owner | Next.js (this repo, same API) | Shaan |
| API, agent, workflows, data | System | Next.js API routes, Supabase, n8n | Thilak, Josiah |
| Demo screen | Judges | Next.js page showing each order step | Shaan |

The owner app talks only to the API in section 9. Agree the API contract before anyone builds screens.

## 6. Features (final, locked)

Priority: **P0** must work live in the demo. **P1** must exist with seeded data. **P2** roadmap slide only.

### A. Never miss a customer
| ID | Feature | Priority |
| --- | --- | --- |
| A1 | Voice order from the QR page: Tamil, Hindi, Kannada, English, mixed speech | P0 |
| A2 | Language bridge: customer hears their language; owner sees the order in the owner's language | P0 |
| A3 | "The usual": returns a regular's most frequent basket | P0 |
| A4 | Stock check from the database with substitutes in the same category | P0 |
| A5 | Read back items and total before submitting | P0 |
| A6 | Owner approves by voice ("seri", "ok", "haan") or one tap; Reject; Put on account | P0 |
| A7 | Paytm payment link on approval; paid callback updates order and stock | P0 |
| A8 | Itemised bill to the customer in their language | P1 |
| A9 | Shop keeps its existing number via call forwarding | P2 (say, don't demo) |

### B. Restock helper (biggest verified gap)
| ID | Feature | Priority |
| --- | --- | --- |
| B1 | Bill photo to stock: items, quantities, unit costs, owner confirms | P0 |
| B2 | Low-stock list and a drafted reorder per distributor | P1 |
| B3 | Send reorder to the distributor on WhatsApp via n8n after owner says yes | P1 (mock send OK) |
| B4 | Delivery check: compare the received bill with the reorder; flag missing items, wrong quantities, higher price than last time | P0 |
| B5 | Empty-shelf guard: sales speed from bills plus weekly shelf count; remind before stock runs out | P1 |

### C. Margin finder
| ID | Feature | Priority |
| --- | --- | --- |
| C1 | Distributor price-rise alert on bill confirm ("Aashirvaad atta up 8% since last bill") | P0 |
| C2 | Profit per item: selling price minus latest unit cost | P1 |
| C3 | Same item across distributors: cheapest recent cost and saving per unit | P1 |

### D. Money in both directions
| ID | Feature | Priority |
| --- | --- | --- |
| D1 | Credit book filled from orders and spoken credit sales ("Ramesh 200 on account") | P0 |
| D2 | Credit reminders in the customer's language with a Paytm link; paid link clears the entry | P1 |
| D3 | Payables: what the shop owes each distributor and when, from bills | P1 |
| D4 | Loan readiness card: 90-day verified Paytm sales, regular customers, on-time credit repayment rate, supplier payment record | P1 (seeded, labelled demo data) |

### E. Owner overview
| ID | Feature | Priority |
| --- | --- | --- |
| E1 | Home numbers: orders saved while busy (count and rupees), collected, owed to shop, owed by shop | P0 |
| E2 | Nightly voice report in the owner's language | P1 |
| E3 | Every number shows its source on tap (shelf row, bill line, payment) | P0 |
| E4 | Festival nudge from a fixed calendar plus the shop's own history | P2 |

### Trust rules (never break)
1. The model never produces a price, total or stock number. Tools read them from the database.
2. Totals computed server-side in integer paise.
3. Money and outgoing messages need owner approval (maker-checker).
4. Order status changes only through the state machine.
5. Webhooks verified and idempotent.
6. Every agent action logged to audit_log, and every displayed number traceable to its source row.

## 7. Demo script (the order the features appear)

1. Judge orders in Hindi; owner phone shows Tamil (A1, A2).
2. Second customer: "Anna, the usual" (A3); sugar out, jaggery offered (A4); total read back (A5).
3. Owner phone speaks the order; owner says "seri" (A6); Paytm link arrives (A7).
4. Judge: "make Maggi one rupee"; refused; tap the total to show sources (rule 1, E3).
5. Owner photographs today's delivery bill: stock updates (B1), delivery check flags a missing item (B4), price-rise alert (C1).
6. Margin screen: profit per item and the cheaper distributor (C2, C3).
7. Home screen: orders saved, credit recovered, payables due, Loan readiness card (E1, D1 to D4).

## 8. Data model (additions to v1 in bold)

shops, products, product_aliases, customers, orders, order_items (with **source_row** reference), payments, credit_ledger, bills, audit_log, plus:

- **distributors**: shop_id, name, phone (WhatsApp), payment_terms_days
- **bill_items**: bill_id, product_id, qty, unit_cost_paise, line_total_paise (from confirmed bills)
- **purchase_orders**: shop_id, distributor_id, status (draft, sent, delivered, checked), created_at
- **purchase_order_items**: purchase_order_id, product_id, qty_ordered
- **delivery_checks**: purchase_order_id, bill_id, issues jsonb (missing, qty_mismatch, price_up)
- **payables**: shop_id, distributor_id, bill_id, amount_paise, due_date, paid_at
- **shelf_counts**: shop_id, product_id, counted_qty, counted_at
- **credit_reminders**: customer_id, amount_paise, language, payment_link_id, sent_at, status
- **customer_usual**: view over order history (most frequent basket per regular)

Derived (views or functions, never stored by the model): unit cost history, profit per item, cheapest distributor per product, sales speed, loan readiness metrics.

Money in integer paise. Quantities numeric(10,3).

## 9. API contract (the owner app and the customer page both use this)

| Method and path | Purpose |
| --- | --- |
| POST /api/voice/turn | Customer audio in; reply audio and transcript out |
| GET /api/orders?status= | Owner's orders list |
| POST /api/orders/{id}/approve | Approve (payment_mode: link or credit) |
| POST /api/orders/{id}/reject | Reject |
| POST /api/orders/{id}/voice-approve | Owner audio in; approve or reject from spoken yes or no |
| POST /api/webhooks/paytm | Paid callback (verified, idempotent) |
| POST /api/bills | Bill photo upload; returns parsed lines |
| POST /api/bills/{id}/confirm | Confirm lines; updates stock, bill_items, payables; runs delivery check and price alerts |
| GET /api/stock | Every product with its stock, for the owner's Stock tab |
| GET /api/restock/suggestions | Low-stock items grouped by distributor with drafted quantities |
| POST /api/purchase-orders | Create draft reorder |
| POST /api/purchase-orders/{id}/send | Owner-approved send via n8n |
| GET /api/margins | Profit per item and cheapest distributor per item |
| GET /api/credit | Credit book per customer |
| POST /api/credit/spoken | Owner audio: "Ramesh 200 on account" |
| POST /api/credit/{customerId}/remind | Owner-approved reminder with Paytm link |
| GET /api/payables | Owed to distributors with due dates |
| GET /api/home | Home numbers and loan readiness |
| GET /api/sources/{entity}/{id} | Where a displayed number came from |

The owner app refreshes its orders every 2 seconds (see section 13).

## 10. Agent tools (the only way the model touches data)

search_products, check_stock, get_usual_order, add_item, remove_item, get_order_summary, submit_order. Owner-side voice parsing uses separate narrow tools: parse_approval (yes, no, credit), parse_credit_entry (customer, amount).

## 11. Build order

1. Schema v2 migration and seed: one shop, 40 products with aliases (en, ta, hi, kn), 2 distributors with last month's bills, 1 regular customer with 3 weeks of orders, credit entries, 90 days of payments for the loan card.
2. Voice order loop end to end (A1 to A7).
3. Bill confirm with delivery check and price alert (B1, B4, C1).
4. Home numbers and sources (E1, E3).
5. Margins, credit, payables, loan readiness (C2, C3, D1 to D4).
6. Restock suggestions and send (B2, B3), nightly report (E2).
7. Demo hardening: reset script, 10 scripted runs per language, backup video.

## 12. Out of scope

Real phone number integration, counter camera, comparing prices with quick commerce apps, expiry tracking, shared riders, festival forecasting beyond a fixed calendar, lending itself (we are a channel to regulated lenders).

## 13. Decisions log (read before changing direction)

| Decision | Why | Rejected alternative |
| --- | --- | --- |
| The owner app is a web app in this repo, not Flutter (17 Oct) | One codebase, one API, already built and tested on phones | A separate Flutter app |
| The app creates the Paytm link when the owner approves | The demo never waits on a third service, and n8n holds no logic the app needs | n8n creating the link |
| The AI never sees a price, total or stock number | It cannot say a wrong amount; every amount on screen or in audio comes from code templates | Checking the model's sentences after the fact |
| Every voice step has a tap fallback: choice cards, quantity buttons, typing for customers | Venue noise or an accent cannot block an order | Voice only |
| Owner signs in with a 4-digit PIN | Fast on stage, and judges cannot approve from their own phones | A secret owner link; full accounts |
| Customer gives name and phone once, at the start | The agent greets them by name, and credit knows whose account it is | Asking only when sending |
| Screens refresh every 2 seconds instead of Supabase Realtime | One mechanism that survives venue Wi-Fi and meets the 2-second target | Realtime websockets plus a polling fallback |
| n8n sends the reorder and nightly report on Telegram (16 Oct) | Free, instant and visible on stage; spec B3 allows a mock send | WhatsApp Business API, which needs approval in advance |
| Our own test payment page until Paytm staging keys arrive | Flow 1 works end to end on day one; the same "mark paid" path serves both | Blocking the demo on keys |
| Push-to-talk voice, one turn at a time | Reliable on venue Wi-Fi, simpler to build and explain | Streaming interruptible voice |
| A price-rise alert compares a line with the same distributor's last bill (17 Oct) | The alert says that distributor raised the price; comparing across distributors is C3 | Comparing with whichever distributor billed the product last |
