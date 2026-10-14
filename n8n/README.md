# n8n workflows

Workflows are exported from n8n as JSON and committed here, starting in milestone 5.

They run the side effects outside the order path (spec section 3): the nightly report and distributor reorders. Payment links are created by the app, so the demo never waits on n8n. The app triggers them with signed webhooks (`N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`). Logic that the app also needs stays in the app.
