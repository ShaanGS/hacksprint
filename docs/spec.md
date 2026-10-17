# Product spec v4: money rotation and loans for kiranas

Single source of truth. Replaces v3 on Oct 17, 2026, after a full recheck of the idea. The product has no name yet.

What changed from v3, in one list (details in each section):

1. The weekly check is now a real 7-day cash forecast. v3 compared bills with Paytm sales only, but much of a kirana's money comes in as cash or through other UPI apps, so it would have warned almost every week.
2. New P0: the owner says the day's cash sales and the money he has at night (one voice line). Labelled "owner said".
3. Stock is an estimate from bills and counts, because kiranas do not scan each sale. v3 never reduced stock between counts.
4. Bills already overdue now count as due this week. v3 only counted bills due in the next 7 days.
5. Late customers are no longer counted as money coming in. They are shown as "if you collect from late payers".
6. New P0: loan-ready. Not a scheme "matcher" (every kirana fits Mudra, so a matcher says one thing). We size the need from his own numbers, say plainly when he does not need a loan, name the official scheme for that amount, build the pack the bank asks for, and send him only to official channels.
7. New P0 metrics: money cycle days (how long his money takes to come back) and late credit recovered. They give "measurable value" a number in rupees.
8. Reminders go from the owner's own WhatsApp (wa.me link with the message and a payment link filled in). No WhatsApp Business API.
9. The statement page is HTML with browser print to PDF, so Tamil renders correctly.
10. New rules for privacy (lenders see totals only, never customer names), lending (we never hold loan money), demo auth, realtime, early deploy, demo reset.
11. The statement splits **verified** from **declared**, and each metric takes the label of its weakest input. A supplier bill paid "on time" is declared unless the payment itself is verified.
12. Stock: only the top 20 items by money are counted; the rest get their speed from how often bills show them bought again.

Positioning: every khata app tells a kirana owner who owes him. Ours tells him on Monday whether he can pay Friday's distributor bill, and who to collect from first.

v4.1 (Oct 17, after a loan positioning check): the loan pack names the loan form by purpose (cash credit limit with a RuPay MUDRA card for stock), loan EMIs become ordinary dues in the forecast (P1, no separate repayment planner), and the statement checks declared sales against supplier bills (P1).

---

## 1. One line

The owner we interviewed told us his problem is money rotation, not Zepto. He pays suppliers before his customers pay him, and he keeps his credit in his head or a notebook, which no bank will read. Every khata app tells a kirana owner who owes him. Ours tells him on Monday whether he can pay Friday's distributor bill, and who to collect from first. When collecting is not enough, it builds the loan pack for a government scheme like Mudra. He only talks and takes photos.

## 2. Evidence and what is still unproven

One shop visit (Chennai, Oct 17) plus published reports. Treat everything from the visit as one owner's words until more shops confirm it.

| Claim we use | Evidence | Status |
| --- | --- | --- |
| Money rotation is the daily struggle | Owner, on video; stock is mostly bought on distributor credit (Citizen Matters, 2018, Bengaluru) | One shop. Confirm with 4 to 5 more |
| Quick commerce is not his main problem | Owner; small ICC survey says owners "do not feel threatened by q-commerce" | True for him. Chennai is a metro, and a distributors' body claims 2 lakh kirana closures in a year, 45% in metros (AICPDF, Oct 2024), so never say "Zepto is not a threat" in general |
| Order booking and automation matter least | Owner; company salesmen already take orders in the shop | Fine as a scoping choice |
| Stock and credit matter most | Owner; 60 Decibels survey (2022) | One shop plus one survey |
| Banks do not respect kirana owners | Owner; MSME credit gap reports | The feeling is real. The reason (no records a bank trusts) is our hypothesis |
| He would use a govt loan scheme | Owner said "absolutely" when asked | Weak: a yes to a hypothetical. Ask what happened when he last tried for a loan |
| Shops will pay Rs 499 a month | One owner | Not proven. Free apps exist; Vyapar costs Rs 699 to 2,099 a year |
| No app shows customer credit and supplier dues together | v3 moat | Wrong. OkCredit records suppliers and sends WhatsApp and SMS reminders; VoiceKhata takes credit by voice; Vyapar tracks receivables, payables and stock, and reads purchase-bill photos |
| Merchant loans already reach these shops | Paytm for Business up to Rs 10 lakh at 15% to 46% a year; PhonePe, BharatPe, Khatabook and OkCredit (as a lending service provider) also lend | Holds. The gap is cost: public sector bank Mudra loans run 9.15% to 12.80% |
| Nobody forecasts the week from bills plus each customer's habit | Checked OkCredit, Khatabook, Vyapar, VoiceKhata, Paytm, PhonePe, BharatPe | Holds as far as we found. This is the lead |

## 3. Context

- Hack Sprint (SDG Club, MIT Bengaluru), Fintech track, PS21: measurable value for small merchants, beyond existing solutions. Build runs Oct 17, 9 am to Oct 18, 3 pm.
- Sponsors Paytm, Sarvam, n8n and Google each do a real job (section 14).
- Judges are experienced engineers and product people. They will ask the team to explain the code and the numbers. Clarity beats cleverness. Demo reliability beats extra features.

## 4. Customer

The 1 to 3 person kirana that buys from distributors on credit, gives credit to regular customers, and keeps both in a notebook or in memory. Tamil Nadu first (Tamil), then Hindi and Kannada speaking shops. Timing: Deepavali is three weeks away, the month when shops stock up most and money is tightest.

## 5. Rotation, in plain words

The owner buys stock on supplier credit. He sells for cash, by UPI, and on credit to regulars. He often has to pay the supplier before many regulars pay him. His money sits in three places he cannot see together:

1. **On the shelf:** stock, valued at cost
2. **With customers:** credit owed to him
3. **Owed to suppliers:** bills due

We show all three, forecast the next 7 days, tell him who to collect from first, show which stock is money stuck on the shelf, and when the gap is bigger than collections can close, size the loan from his own numbers, name the official scheme for that amount, and build the pack the bank asks for.

## 6. Why us (honest version)

Ledgers, supplier dues, reminders, voice entry, bill-photo reading and quick app loans already exist (OkCredit, Khatabook, Vyapar, VoiceKhata, Paytm, PhonePe, BharatPe). They are table stakes. What we lead with:

1. **The week ahead.** We join supplier due dates with each customer's own repayment habit and his usual sales, and tell him on Monday whether Friday's bill is covered and who to collect from first. None of the apps we checked does this.
2. **Verified collections.** Paytm sees a payment; only we know it settled a 20-day-old credit. That is repayment behaviour a lender cannot get anywhere else.
3. **Verified vs declared, line by line.** Every metric carries the label of its weakest input. Lenders already discount declared numbers; we make that easy instead of hiding it.
4. **Ends in cheaper money, responsibly.** When collections cannot close the gap, the loan-ready pack for a bank Mudra loan (9.15% to 12.80% a year at public sector banks) instead of an app loan (Paytm for Business lists 15% to 46%). When collections can close it, we tell him he does not need a loan.
5. **The history grows every month** and stays with him. That is the switching cost.
6. **Zero typing** is a design rule, not a moat.
7. **Distribution hypothesis, untested:** Paytm field agents who already sell soundboxes and loans to these shops. Not company salesmen: our skip list cuts their orders.

## 7. Surfaces

| Surface | Who | Built with |
| --- | --- | --- |
| Owner app | Shop owner | Next.js web app in this repo (no Flutter, decided Oct 17) |
| API, calculations, workflows, data | System | Next.js API routes, Supabase, n8n |
| Statement and loan pack pages | Owner, bank | Next.js pages, browser print to PDF |
| Demo screen | Judges | Next.js page |
| Customer voice ordering | Frozen | Keep the code; out of the demo and navigation |

Decision, Oct 17: there is no Flutter app for the hackathon. The owner app is the web app in this repo, built as a finished product, and this repo also builds the API, the calculations and the data.

## 8. Features (locked)

**P0** must work live in the demo. **P1** must exist with seeded data. **P2** roadmap slide only.

### A. Where is my money (the hero)

| ID | Feature | Priority |
| --- | --- | --- |
| A1 | Home: three numbers, on the shelf (estimate), with customers, owed to suppliers | P0 |
| A2 | This week: money needed vs money likely, short by or spare, each part labelled with its source (section 9.7) | P0 |
| A3 | Collect list: late payers first (against their own habit), then by amount, each with a reason in plain words | P0 |
| A4 | Reminder: owner taps once, WhatsApp opens on his phone with the message in the customer's language and a payment link filled in. He presses send | P0 |
| A5 | A paid link clears the credit and updates A1 and A2 live | P0 (demo fallback: mark-paid button) |
| A6 | Morning alert on short weeks (n8n, to the owner only) | P1 |

### B. Talk and snap, never type

| ID | Feature | Priority |
| --- | --- | --- |
| B1 | Owner speaks in Tamil, Hindi or Kannada. Entry types: credit given, credit repaid in cash, day close (today's cash sales, and money in hand: cash and bank together, roughly), stock count. A confirmation card shows before anything is saved | P0 |
| B2 | Bill photo: stock in, unit costs, and a supplier payable with its due date | P0 |
| B3 | Price-rise alert when a bill is confirmed | P0 |
| B4 | Delivery check against the approved salesman list | P1 |
| B5 | Notebook import: photos of his existing credit notebook pages become customer balances, each row confirmed by the owner | P1 |
| B6 | More entry types: cash purchase without a bill, supplier paid, several entries in one recording | P1 |
| B7 | One-time setup by voice: weekly costs (rent, staff, home, usual cash purchases) | P0 (seeded in the demo) |
| B8 | Works offline: recordings queue on the phone and upload when the network is back | P1 |

### C. Stock is money

| ID | Feature | Priority |
| --- | --- | --- |
| C1 | Shelf: the top 20 items by money are counted by voice; the rest get their speed from how often bills show them bought again. Days left, low and slow tags, "estimate" label with last count date | P0 |
| C2 | Stuck money: value of slow stock and what not to reorder | P0 |
| C3 | Salesman list per supplier, including the Deepavali order: what to order, what to skip. The seeded Deepavali order feeds the loan pack quotation (D4) | P1 |
| C4 | Profit per item | P1 |

### D. Proof and loans

| ID | Feature | Priority |
| --- | --- | --- |
| D1 | Shop statement, last 3 full months, in two blocks: **verified** and **declared**. Each metric carries the label of its weakest input. Totals only, no customer names | P0 |
| D2 | Statement page in English and Tamil, print to PDF from the browser, share link | P0 |
| D3 | Loan-ready check: from the forecast and the Deepavali order, does he need a loan, how much, and which official scheme covers that amount (section 10). Says plainly when collecting is enough | P0 |
| D4 | Loan pack: statement, stock quotation from supplier prices, document checklist with have or missing (including Udyam or Udyam Assist), official links only, and a fee warning | P0 |
| D5 | Next-step card: the Credit Card for Micro Enterprises, once he has about 12 months of records and a bank relationship | P1 |
| D6 | Monthly statement generated automatically (n8n) | P1 |

### E. Daily summary

| ID | Feature | Priority |
| --- | --- | --- |
| E1 | Nightly summary to the owner in his language (n8n). Numbers from code, words from a fixed template | P1 |

### Frozen or cut

Customer voice ordering (frozen), automated reorder sending (salesmen already book orders), WhatsApp Business API (we use the owner's own WhatsApp), lending itself (we never hold or move loan money), credit scores (lenders score), Account Aggregator pull (P2: lenders pull bank data directly with consent), comparing suppliers' prices (P2), collecting caste, religion or similar data for any scheme (never).

**Agents (decided Oct 17):** reorder sending comes back in, as an agent the owner approves. The reorder agent lists only what runs out this week, at the quantity and price of its last bill, and leaves out slow stock, so it never ties up more money on the shelf. Nothing goes until he taps Send; then n8n emails the distributor, the one n8n job that is not owner-facing. The collection agent does A3 to A5 in one go: it writes each late payer's reminder with a payment link and watches the money come in, while the owner still sends each message from his own WhatsApp (rule 3).

## 9. Calculations

Deterministic code in `lib/rotation`, one pure function per item, each unit-tested with edge cases. All money in integer paise. All dates in Asia/Kolkata. The model never runs these. Every result carries its source label: `verified_payment`, `supplier_bill`, `owner_said`, or `estimate`.

1. **Stock estimate** per product = last count + quantity received since that count minus weekly_sales times weeks since that count, never below zero. Products never counted: received in the last 8 weeks minus weekly_sales times 8, never below zero. Label `estimate`, with the last count date or "not counted". Only the top 20 products by stock value are asked for counts.
2. **weekly_sales** per product = (previous count + received between the two counts minus last count) divided by weeks between counts. With fewer than two counts, use the re-buy rate: quantity bought in the last 8 weeks divided by 8, only when the product was bought at least twice; otherwise "not enough data".
3. **on_shelf** = sum of stock estimate times the latest unit cost from bills. Products with no known cost are listed as "cost unknown", never guessed.
4. **with_customers** = sum of positive customer balances (credit given minus repayments).
5. **owed_to_suppliers** = sum of unpaid payables.
6. **usual_repay_days** per customer = median days from a credit sale to the repayment that settles it, matching repayments to the oldest unpaid credit first. Fewer than 2 settled credits means "pattern unknown".
7. **This week (A2)**, for the next 7 days:
   - `due_7d` = unpaid supplier bills with a due date on or before today + 7, **including overdue ones** (`supplier_bill`)
   - `weekly_costs` = rent, staff, home and usual cash purchases from setup, as a weekly amount (`owner_said`)
   - `money_needed` = due_7d + weekly_costs
   - `money_now` = the last "money in hand" the owner said in the last 2 days (`owner_said`), plus verified payments received after it (`verified_payment`). Older than 2 days: left out, and the screen asks for it
   - `usual_week_sales` = average daily sales times 7, where daily sales = verified payments that are not credit repayments + cash sales the owner said for that day. Use only days with a cash entry in the last 28 days; fewer than 7 such days means "not enough data" and the screen asks for tonight's cash sales
   - `likely_from_customers` = balances of customers who are not late and whose usual_repay_days minus the age of their oldest unpaid credit falls within the next 7 days
   - `money_likely` = money_now + usual_week_sales + likely_from_customers
   - `gap` = money_likely minus money_needed. State: **short** if gap is below zero, **close** if gap is under `CLOSE_SHARE` (named constant, 0.10) of money_needed, otherwise **ok**
   - `late_total` = balances of late customers, shown separately as "if you collect from late payers: +Rs X". Never part of money_likely
8. **Collect order:** late customers first (most days past their usual first), then pattern-unknown customers by amount, then everyone else by amount. Each row carries its reason in plain words. Never suggest a reminder to a customer still inside their usual days unless the owner asks.
9. **days_left** = stock estimate divided by daily sales; zero sales means "not moving".
10. **stuck_money** = stock value of products with days_left over 30 or not moving.
11. **Salesman list** for supplier S: S's products with days_left under 7, quantity to reach 14 days, rounded up to the pack size. Skip list: S's products with days_left over 30.
12. **Money cycle days** (the shop's cash conversion cycle), over the last 28 days, label `estimate`:
    - stock_days = on_shelf divided by daily purchases at cost
    - customer_days = with_customers divided by daily sales
    - supplier_days = owed_to_suppliers divided by daily purchases at cost
    - money_cycle_days = stock_days + customer_days minus supplier_days
    - money freed per day cut = daily purchases at cost. Screen line: "Your money takes N days to come back. Every day shorter frees about Rs X."
13. **Statement metrics** for the last 3 full months, totals only. Each metric takes the label of its **weakest input** (order: `verified_payment` strongest, then `supplier_bill`, then `estimate`, then `owner_said`). Two blocks on the page:
    - **Verified:** digital payments received per month; credit recovered through payment links, with the median days those customers took (repayment behaviour no lender can see elsewhere); supplier bills on record (count and total, `supplier_bill`)
    - **Declared:** cash sales per month (`owner_said`); credit given and recovered in cash; supplier bills paid by their due date, as a percentage (`owner_said` unless the payment itself is verified); regular credit customers (count of customers with 2 or more credit entries); average stock value and money cycle days (`estimate`)
    - Never merge verified and declared into one unlabelled total
    - **Fits his bills check (P1):** declared cash sales plus verified payments over the 3 months, divided by purchases on supplier bills over the same months. Above `SALES_TO_PURCHASES_MAX` (named constant, start at 1.4), the statement says "declared sales are higher than his bills can explain". Lenders already cross-check this way; it is what makes a cash-heavy shop's declared numbers worth reading
14. **Loan-ready check (D3)**, all in integer paise:
    - `need` = the approved Deepavali order total (prices from bills, `supplier_bill`), or the amount the owner says (`owner_said`)
    - `gap_without_order` = the 9.7 gap computed without the order's bill (positive means spare money, negative means already short)
    - `can_collect` = late_total
    - `loan_needed` = need minus gap_without_order minus can_collect, never below 0, rounded up to the next Rs 1,000. Example: order Rs 48,500, spare Rs 10,000, late payers Rs 9,600 gives Rs 28,900, shown as Rs 29,000
    - If loan_needed is 0, the screen says "You do not need a loan for this. Collect from these customers" and links the collect list
    - Otherwise the scheme band for loan_needed comes from section 10. Exactly Rs 50,000 is Shishu
15. **Collections recovered** (measurable value): late credit recovered in the last 30 days, split verified and declared, and the change in money cycle days since the shop started.
16. **Loan EMIs (P1).** A term-loan EMI or auto-debit is just another due: payable kind `loan_emi`, label `owner_said`, and it enters due_7d like any bill. No separate repayment planner. When one falls inside the next 7 days, the nightly summary says what to keep aside tonight: the EMI still not set aside, divided by the days left, scaled by today's sales against a usual day, rounded up to Rs 10, never more than what remains. He keeps it in his own bank account; we never hold it.

## 10. Loan-ready: government schemes (D3, D4, D5)

**Why this is not a "matcher".** Almost every kirana fits Mudra, so a matcher would give one answer. The government's JanSamarth portal already checks eligibility and takes applications. Our value is the three things it cannot do: decide from his own numbers whether he needs a loan and how much, build the papers the bank asks for, and send him only to official channels. We never route him to a particular lender and never share his data with one, so we are not a lending service provider. If we ever partner with a lender, RBI's digital lending rules apply first.

The facts live in `lib/schemes/catalog.ts`, each with its official source URL and `checked_on: "2026-10-17"`. Only these facts go in:

| Scheme | Fits a kirana? | What the code uses | Source |
| --- | --- | --- | --- |
| PM Mudra Yojana (PMMY) | Yes: covers "vendors, traders, shopkeepers"; term loan or working capital | Shishu up to Rs 50,000; Kishore above Rs 50,000 up to Rs 5 lakh; Tarun above Rs 5 lakh up to Rs 10 lakh; Tarun Plus Rs 10 to 20 lakh only after repaying a Tarun loan. No collateral. Interest set by the bank. Apply at any bank, regional rural bank, small finance bank, NBFC or MFI, or on JanSamarth | [DFS](https://financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy), [PIB, Apr 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2249942), [Bank of Baroda](https://bankofbaroda.bank.in/loans/pradhan-mantri-mudra-yojana) |
| CGFMU guarantee | Yes, lists retail trade | Why the bank can lend without collateral: Mudra loans up to Rs 20 lakh are guaranteed for the lender | [NCGTC FAQ, Feb 2025](https://www.ncgtc.in/content/products/0/20250218/FAQ_updated_18_Feb_2025_9bf9bacc83.pdf) |
| Udyam Registration | Yes: retail and wholesale traders since July 2021, for priority sector lending | Free, on udyamregistration.gov.in only. Needs Aadhaar and PAN; GSTIN only if he has one | [RBI, Jul 2021](https://rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx?Id=12126), [Udyam portal](https://udyamregistration.gov.in/) |
| Udyam Assist Platform | Yes, for shops without PAN or GST | His bank (a designated agency) creates the certificate online; no PAN or GSTIN needed. Treated like Udyam for priority sector lending | [RBI, May 2023](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12500), [SIDBI](https://www.sidbi.in/en/udyam-assist-platform) |
| CGTMSE | Yes: retail and wholesale trade | For bigger or bank-led loans: guarantees collateral-free loans to micro and small units; needs a Udyam or Udyam Assist certificate. Applied for by the bank, not by him | [SBI CGTMSE features](https://sbi.bank.in/documents/26274/3200842/CGTMSE+CONSOLIDATED+FEATURES.pdf/a2280ee1-15dc-eb9d-2ef8-cb0b4a28200b?t=1754630937332), [cgtmse.in](https://www.cgtmse.in/) |
| Credit Card for Micro Enterprises | Launched May 25, 2026 for Udyam-registered micro enterprises. Whether retail traders qualify is not stated: ask the branch | Revolving limit up to Rs 5 lakh. Banks set the rest (SBI: up to 50 days interest-free; some banks only for existing customers, with the limit tied to 12 months of sales or account credits). P1 next-step card only | [PIB, May 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2265005), [SBI](https://sbi.bank.in/web/business/micro-credit-card), [Indian Bank](https://indianbank.bank.in/en/ind-suvidha-micro-credit-card) |
| JanSamarth portal | Yes | The official place to apply online for Mudra and the micro enterprise card | [PIB, Jun 2026](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2269253) |

Not for an existing kirana, so never shown: PM SVANidhi (street vendors only), PMEGP (new units; trading only in a few regions), Stand-Up India (new units, and it would need caste or gender data we never collect).

**Why the owner wins (pitch number, computed, 12-month loan of Rs 50,000, reducing balance):** at public sector bank Mudra rates of 9.15% to 12.80% a year the interest is about Rs 2,500 to Rs 3,500; at the 15% to 46% a year that Paytm for Business lists for merchant loans it is about Rs 4,200 to Rs 13,300. Rates: [Lok Sabha answer on Mudra rates, Aug 2024](https://eparlib.sansad.in/bitstream/123456789/2978697/1/AS185_qg8tmE.pdf), [Paytm for Business listing](https://play.google.com/store/apps/details?id=com.paytm.business).

**Which loan form to ask for (fixed line in the D3 output, by purpose):**
- Stock and rotation: "Ask for working capital as a cash credit limit with a RuPay MUDRA card." He can withdraw and pay back many times within the limit, so repayment follows his daily takings, and the card is meant to keep the interest burden low ([IDBI](https://www.idbi.bank.in/rupay-mudra-debit-card.aspx), [RuPay](https://rupay.co.in/our-cards/rupay-debit/government-scheme/rupay-mudra-card)).
- Equipment or shop work: a term loan with a fixed EMI, which then enters the forecast as a due (9.16).

Contrast for the pitch: app loans like PhonePe's are repaid by a daily cut from his QR settlements; a short day's shortfall is added to the next day's cut, and long arrears are taken from his linked bank account ([PhonePe help](https://cms.phonepe.com/en/ace/loans/repaying-loan/how-can-merchant-repay-loan)). That follows one app's sales, not his whole shop.

**Inputs:** loan_needed (from 9.14), purpose (stock and working capital, or equipment), udyam_status (yes, no, not sure), has_pan, repaid_tarun_before. Nothing else.

**Output:** the band name and range, "no collateral", where to apply (his bank branch or JanSamarth), the registration step (Udyam if he has PAN, otherwise Udyam Assist through his bank), the official links, the checked date, and two fixed lines: "The bank decides; we do not promise approval." and "Applying for Mudra or Udyam costs nothing. Anyone asking you for a fee is not the government." (The government has warned about fake Mudra approval letters that ask for a fee.)

**Loan pack (D4):** one printable page:
1. The statement (D1), verified and declared blocks
2. Stock quotation: the approved Deepavali order with supplier prices from bills (`supplier_bill`)
3. Document checklist with have or missing: Aadhaar, PAN, Udyam or Udyam Assist certificate, shop licence or other business proof, address proof, photos, the quotation, bank statements
4. Where to apply, with official links only

No customer names or phone numbers anywhere in the pack.

**Apply agent (demo only, decided Oct 17):** after the loan check, an agent fills the loan application from his records on screen, step by step, and stops where his own Aadhaar OTP would be needed. It says plainly that it is a simulation and sends nothing to any portal or lender, so rule 8 holds. Submitting for him for real would make us a lending service provider.

## 11. Demo: three acts, about two and a half minutes

Fewer live parts, each with a fallback. Acts 1 to 3 must run live.

**Act 1. He talks, we keep the books (30 s)**
1. The owner says in Tamil, "Ramesh, 200 on credit." A confirmation card appears; one tap saves it. (B1)
2. He photographs today's supplier bill. A payable appears due in 3 days, and a price rise is flagged. (B2, B3)

**Act 2. Monday: can he pay Friday's bill? (60 s)**
3. Home: on the shelf, with customers, owed to suppliers. Below it, this week: needed vs likely, "short by Rs X", each part labelled. (A1, A2)
4. The collect list names three late payers and why ("usually pays in 12 days; 9 days late"). One tap opens WhatsApp with a Tamil reminder and a Paytm link. A teammate pays; the credit clears and the gap shrinks live. (A3 to A5)
5. Ten seconds on stock: money stuck in slow items, and the Deepavali order. (C1, C2)

**Act 3. From his records to the bank (45 s)**
6. Statement: verified block and declared block, money cycle days. Tap any number to see the bill or payment behind it. (D1, D2)
7. The Deepavali order is more than his spare money plus his late payers. Loan-ready: "You need about Rs Y. Mudra Shishu, no collateral." The pack: statement, stock quotation, checklist, official links, fee warning. Close on the owner's own words about banks. (D3, D4)

All amounts on screen come from seeded demo data and are labelled as such. Paytm staging only accepts its test payment flow, so the teammate pays with Paytm's staging test method, or we use production keys if Paytm's desk gives them. The mark-paid button is the last fallback.

## 11a. Measurable value (PS21)

What we measure for each shop, from day one:

| Metric | How | Source |
| --- | --- | --- |
| Late credit recovered (Rs) | Repayments from customers who were past their usual days, last 30 days | Verified where paid by link, declared otherwise |
| Money cycle days | 9.12, compared with the first week of use | Estimate |
| Short weeks seen in advance | Weeks flagged short at least 3 days before the bill | Calculated |
| Loan pack time | Minutes from "I need Rs X" to a printable pack | Measured |

Baseline questions for the pilot (asked before day one): how much of the money customers owe is over 30 days old, and the last time he could not pay a distributor, where the money came from and at what cost.

## 12. Data model (changes from v3)

New migration only; never edit an applied migration.

- `cash_snapshots` becomes **day_close**: shop_id, business_date, cash_sales_paise (nullable), money_in_hand_paise (nullable), source `owner_said`, recorded_at, voice_entry_id. Unique on (shop_id, business_date); a later entry the same day updates it after confirmation
- **shop_costs:** shop_id, kind (rent, staff, home, cash_purchases, other), amount_paise, period (week, month), source `owner_said`
- **shop_profile:** shop_id, udyam_status (yes, no, unsure), has_pan, has_gst, repaid_tarun_before, bank_name (optional), language
- **loan_requests:** shop_id, need_paise, gap_without_order_paise, can_collect_paise, loan_needed_paise, purpose, source (festival_order, owner_said), purchase_order_id (nullable), created_at
- **loan_packs:** shop_id, loan_request_id, scheme_band, checklist jsonb, statement_id, share_token, generated_at
- `credit_reminders.channel` = `whatsapp_link`; add `message_text`, `payment_link_url`, `opened_at`
- `payments.is_credit_repayment` boolean (true when it settles a credit through a link)
- `payables.kind` (supplier_bill, loan_emi); loan_emi is P1. `loan_requests.purpose` is stock_rotation or equipment
- **notebook_imports** (P1): shop_id, image_path, parsed jsonb, status, confirmed_at
- Keep everything else from v3 (customers.language, credit_ledger.source and payment_id, payables.paid_at and paid_via, purchase_orders as the salesman list, owner_voice_entries, statements)
- Source label values are now `verified_payment`, `supplier_bill`, `owner_said`, `estimate` (rename from v3's `verified_paytm` and `owner_recorded`; the label text on screen says "verified by Paytm" where the payment came through Paytm)

## 13. API contract (the owner app and scripts use this; keep docs/api.md in sync)

| Method and path | Purpose |
| --- | --- |
| GET /api/rotation | A1 and A2: three numbers, the forecast parts with labels, state, late_total |
| GET /api/rotation/collect | A3 ranked list with reasons |
| POST /api/credit/{customerId}/remind | A4: creates the payment link and returns `message_text`, `payment_link_url`, and a ready `whatsapp_url` (wa.me with the text filled in) |
| POST /api/webhooks/paytm | A5: verified, idempotent; writes a verified repayment and broadcasts |
| POST /api/dev/payments/{paymentId}/mark-paid | A5 fallback; only when DEMO_MODE is on |
| POST /api/voice/owner | B1: audio in; transcript, parsed entry and confirmation card out |
| POST /api/voice/owner/{entryId}/confirm and /reject | B1 |
| GET /api/credit, GET /api/credit/{customerId} | Credit book, one customer with source labels |
| POST /api/bills, POST /api/bills/{id}/confirm | B2 to B4 |
| GET /api/payables, POST /api/payables/{id}/paid | Supplier dues |
| GET /api/setup/costs, PUT /api/setup/costs | B7 |
| GET /api/stock, GET /api/stock/stuck | C1, C2 |
| GET /api/stock/salesman-list?distributorId=, POST /api/stock/salesman-list | C3 |
| GET /api/statement?months=3 | D1 |
| GET /statement/{shareToken}?lang=ta | D2 page (print to PDF) |
| POST /api/loan-ready | D3: optional owner-said amount in; need, gap_without_order, can_collect, loan_needed, the scheme band (or "no loan needed"), registration step, links out |
| POST /api/loan-pack, GET /loan-pack/{shareToken}?lang=ta | D4: creates the pack; printable page |
| GET /api/value | 11a: late credit recovered, money cycle days now vs first week, short weeks seen early |
| GET /api/sources/{entity}/{id} | Where any number came from |
| GET /api/summary/today | E1 numbers for n8n |
| POST /api/demo/reset | Reseed with dates relative to now; only when DEMO_MODE is on |

**Auth for the hackathon:** one demo shop. Scripts and n8n send `Authorization: Bearer <SHOP_TOKEN>`; the web owner app sends the owner's PIN session cookie instead, so the browser never holds the token. One helper accepts either and returns the shop id. The service role key stays on the server.

**Realtime:** after any write that changes the numbers, the server sends a broadcast on channel `shop:{shopId}` with event `changed` and the area (`rotation`, `credit`, `stock`). No data in the message. The owner app and the demo screen listen with the publishable key and refetch from the API.

## 14. Sponsor jobs

- **Sarvam:** owner speech to text (Tamil, Hindi, Kannada, mixed); voice for the nightly summary (P1). Reminder texts are fixed templates per language, written by us, so no translation call per message.
- **Gemini:** reading bill photos and notebook pages into structured lines; turning owner speech into one of the entry types through function calling. Set thinking low. It never produces a number that is not in the input.
- **Paytm:** payment links in reminders, verified repayment callbacks (this is what turns a payment into "verified collection"), verified digital sales for the statement. Each link names our webhook as its status callback, and the server also asks Paytm's Fetch Transaction API, because Paytm turns the link webhook on only through support. Long term, the product fits as a module inside Paytm for Business.
- **n8n:** owner-facing jobs only: morning short-week alert, nightly summary, monthly statement. About 2 runs a shop a day. At scale this moves to self-hosted n8n, since cloud pricing is per run.

## 15. Trust, privacy and lending rules (never break)

1. The model never computes or invents a number. Numbers come from the database, a supplier bill, a verified payment, or the owner's own words confirmed by the owner.
2. All money math in integer paise in `lib/rotation`, unit-tested.
3. Nothing is saved from voice, sent to a customer, or marked paid without the owner's confirmation. Reminders are sent by the owner himself from his WhatsApp.
4. Webhooks are verified and idempotent.
5. Every number carries its source label and links to its source rows. Estimates say "estimate".
6. The owner never has to type.
7. Statements and loan packs contain totals only. No customer names or phone numbers leave the shop's own view.
8. We never hold, move or lend money. Loans go from the lender to the shop's bank account. We never charge the shop for a loan, never route him to a particular lender, and never send his data to a lender. He takes his pack himself. One labelled exception, test mode only (decided Oct 17): the reorder agent can open a Paytm test checkout for a sent order, to show how paying a distributor would work. In test mode the money lands in a test account, not the distributor's; the screen says so, and the payment is never counted as sales or cash. Paying distributors for real would need Paytm Payouts and is not built.
9. Scheme facts come only from `lib/schemes/catalog.ts`, each with its official source and checked date. Official links only. Never promise approval. Always show the fee warning.
10. Collect only what a feature needs. Never collect caste, religion or similar. Never read the phone's contact list: a customer's number comes from the owner's voice or the system contact picker, one contact at a time.
11. Privacy roles (DPDP Act): the shop owns its customers' data and we process it for him. Reminders use the number the customer gave the shop for that purpose. Customer data is deleted on the owner's request. Production data stays in India (Supabase Mumbai region).
12. Demo data is labelled as demo data on screen.

## 16. Engineering must-haves

1. Deploy to Vercel in the first hours, so Paytm can reach the callback URL. Keep the mark-paid fallback for the stage.
2. Statement and loan pack are HTML pages with Noto Sans Tamil, printed to PDF by the browser. No server PDF library (Tamil letters break there).
3. `pnpm demo:reset` and `POST /api/demo/reset` restore the demo shop in under 5 seconds, dates relative to now().
4. Fallbacks for stage: a recorded Tamil audio file for B1, a sample bill photo for B2, the mark-paid button for A5.
5. Every agent action and every confirmation goes to `audit_log`.

## 17. Build order (from now)

1. Commit current work. Replace the old spec with this one.
2. A new migration for section 12. Update the seed, dates relative to now():
   - 28 days of day-close entries (cash sales and money in hand)
   - weekly costs, and a shop profile with Udyam "no" and PAN "yes"
   - an approved Deepavali order for one supplier, with its bill due inside the demo week
   - three late payers
   - numbers set so a normal week is "ok", the demo week is "short", collecting from the late payers closes only part of the gap, and loan_needed lands in the Shishu band (under Rs 50,000)
3. `lib/rotation`: change the forecast to section 9.7, the stock estimate (9.1, 9.2), overdue bills in due_7d, and add money cycle days (9.12), the statement blocks (9.13), the loan-ready check (9.14) and collections recovered (9.15). Unit tests for each, including these cases:
   - no day-close entries
   - money in hand older than 2 days
   - a customer exactly at their usual days
   - a bill overdue by 10 days
   - a product with only one count
   - loan_needed exactly Rs 50,000
   - loan_needed 0 when collections cover the need
4. `lib/schemes`: the catalog with the section 10 facts only, and the band function with tests.
5. API changes, with docs/api.md updated at once (A2 changed shape).
6. Voice day-close entry, reminder with wa.me link, Paytm link and callback, broadcast.
7. Statement page, loan pack page, demo reset.
8. Deploy, then 10 full rehearsals. Then P1.

## 18. Sources

Field and market
- Shop visit, Chennai, Oct 17, 2026 (video, one owner)
- [Indian Chamber of Commerce, quick commerce survey](https://indianchamber.org/upload/page/pdf/quick-commerce.pdf) (small sample, size and date not stated)
- [AICPDF claim of 2 lakh kirana closures, via MediaNama, Oct 2024](https://www.medianama.com/2024/10/223-quick-commerce-boom-closure-2-lakh-kirana-stores-products-distributors/) (a distributor body's claim, not independently verified)
- [Citizen Matters, FMCG distribution in Bengaluru, Oct 2018](https://citizenmatters.in/fmcg-distribution-system-bangalore/)
- [60 Decibels survey via Flourish Ventures, Oct 2022](https://flourishventures.com/news/why-kirana-stores-are-central-to-indias-digital-opportunity/)
- [CPM India, Kirana 2025 report, via MediaBrief, Jul 2025](https://mediabrief.com/kirana-2025-report-indias-local-retailers-changing-market/)
- [Business Standard editorial citing EY, Aug 2024](https://www.business-standard.com/opinion/editorial/ease-of-lending-how-unified-lending-interface-will-improve-credit-access-124082701386_1.html)

Existing products
- [OkCredit: suppliers and reminders](https://okcredit.in/blog/how-to-use-okcredit-app-for-hardware-store), [OkCredit business ledger](https://okcredit.in/business-ledger-app)
- [Vyapar payables](https://vyaparapp.in/free/small-business-accounting-software/accounts-payable)
- [VoiceKhata](https://filehippo.com/android/download_voicekhata-ai-bahi-khata-app/)
- [PhonePe merchant lending, Business Today, Mar 2026](https://www.businesstoday.in/amp/personal-finance/news/story/phonepe-sharpens-focus-on-merchant-lending-consumer-loans-ahead-of-ipo-push-519975-2026-03-10)

- [Khatabook](https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook), [OkCredit as a lending service provider for Vivriti Capital](https://www.vivriticapital.com/assets/files/digital-lending/LSP-details/Website%20disclosure%20of%20LSP%20and%20DLA%20-%20OKCREDIT.pdf), [Vyapar](https://play.google.com/store/apps/details?id=in.android.vyapar), [PhonePe Business](https://play.google.com/store/apps/details?id=com.phonepe.app.business), [BharatPe](https://play.google.com/store/apps/details?id=com.bharatpe.app)

Schemes: see the table in section 10, plus
- [PIB Fact Check on fake Mudra letters asking for a Rs 350 fee, May 7, 2026, via Angel One](https://www.angelone.in/news/economy/government-warns-against-fake-pm-mudra-loan-scam-demanding-350-processing-fee)

Rules
- [RBI digital lending directions, May 2025](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12848), [Key Fact Statement](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12663)
- [DPDP Act text](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf), [DPDP Rules notified, PIB, Nov 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)
- [Account Aggregator framework, DFS](https://financialservices.gov.in/account-aggregator-framework)

Payments and costs
- [UPI charges explained, SCC Online, Sep 2026](https://www.scconline.com/blog/post/2026/09/19/upi-mdr-rules-explained-upi-remains-free-for-users-merchant-payments-above-rs-2000/): no charges on UPI payments up to Rs 2,000; 0.4% capped at Rs 300 above that for some merchants, small merchants exempt
- [Paytm payment gateway pricing](https://www.paytmpayments.com/pricing), [Paytm testing](https://paytmpayments.com/docs/testing-integration/)
- [Sarvam pricing](https://docs.sarvam.ai/api-reference-docs/pricing), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [n8n pricing](https://n8n.io/pricing/), [Supabase pricing](https://supabase.com/pricing)
