# n8n workflow

[`reorder-to-distributor.json`](reorder-to-distributor.json) is the reorder agent's last step.
When the owner taps Send on a reorder, the app posts the order to this workflow
([`apps/web/lib/reorder/send.ts`](../apps/web/lib/reorder/send.ts)), and the workflow emails it to
the distributor from the shop's Gmail.

| Step                         | What it does                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Reorder from app             | A webhook (`POST`) that receives `{ shopName, distributorName, lines: [{ name, qty, unit }] }`  |
| Check secret + write message | Rejects the call unless the `x-munim-secret` header matches its `SECRET`, then writes the email |
| Send to distributor          | Sends the email with the Gmail node                                                             |

To run it:

1. Import the JSON into n8n.
2. In the code step, set `SECRET` to the same value as `N8N_WEBHOOK_SECRET` in
   `apps/web/.env.local` (and in Vercel).
3. Connect a Gmail credential to the last step, and set its recipient to the distributor's
   address.
4. Activate the workflow, and put its production webhook URL in `N8N_WEBHOOK_URL`.

The app keeps the logic itself. It saves the purchase order as a draft before it calls the
workflow, marks it sent and writes the audit log only when the workflow answers, and tells the
owner "The order was not sent" when n8n cannot be reached.
