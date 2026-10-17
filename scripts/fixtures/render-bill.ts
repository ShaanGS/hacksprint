import path from "node:path";
import { chromium } from "@playwright/test";

// Renders Act 1's delivery bill from its HTML into the photo the stage fallback uses (spec 16.4):
// pnpm exec tsx scripts/fixtures/render-bill.ts

const here = path.dirname(new URL(import.meta.url).pathname);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1050, height: 1005 } });
  await page.goto(`file://${path.join(here, "delivery-bill-sb-2073.html")}`);
  await page.screenshot({
    path: path.join(here, "delivery-bill-sb-2073.jpg"),
    type: "jpeg",
    quality: 88,
  });
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
