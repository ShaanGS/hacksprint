# n8n workflows

Workflows are exported from n8n as JSON and committed here, starting in milestone 4.

They run the side effects in order (spec section 3): Paytm link creation, the nightly report and distributor reorders. The app triggers them with signed webhooks (`N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`). Logic that the app also needs stays in the app.
