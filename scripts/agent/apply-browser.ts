// `pnpm agent:apply [loanRequestId]` opens a real browser on the sandbox lender portal and lets
// the apply agent fill the loan application from the shop's own records (decision of Oct 18).
// It types slowly and lights up each field so a room can follow it, leaves identity, contact and
// consent for the owner, and stops at "Send OTP" with the window open. One JSON line per step on
// stdout, which POST /api/loan-apply/browser streams to the owner's screen. Runs on the shop's own
// computer only: the live site has no browser to open.
import { chromium, type Page } from "@playwright/test";
import { runApplyAgent, type Browser, type PageView } from "@/lib/apply-browser/agent";
import { applyFacts } from "@/lib/apply-browser/facts";
import { audit } from "@/lib/audit";
import { loadApplication } from "@/lib/loans/application";
import { geminiPlanner } from "@/lib/planner/gemini";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

const PORTAL_PATH = "/sandbox/lender";
// How long the window stays open for the owner after the agent hands over.
const HAND_OVER_MS = 15 * 60_000;

const say = (line: Record<string, unknown>) => console.log(JSON.stringify(line));

// Reads the page's visible fields (with their labels), buttons and title. Plain JavaScript in a
// string, because tsx adds helpers to compiled functions that the browser does not have.
const READ_PAGE = `(() => {
  const shown = (el) => el.offsetParent !== null;
  const labelOf = (el) =>
    (el.id && document.querySelector('label[for="' + el.id + '"]')?.textContent?.trim()) ||
    el.getAttribute("aria-label") || "";
  const fields = [...document.querySelectorAll("input, select, textarea")].filter(shown).map((el) => ({
    id: el.id,
    label: labelOf(el),
    kind: el.tagName === "SELECT" ? "select" : el.type || "text",
    options: el.tagName === "SELECT" ? [...el.options].map((o) => o.text).filter((t) => t !== "Select") : [],
    value: el.type === "checkbox" ? (el.checked ? "yes" : "") : el.value,
  }));
  const buttons = [...document.querySelectorAll("button")].filter(shown).map((b) => (b.textContent || "").trim());
  const title = document.querySelector("h2")?.textContent?.trim() || document.title;
  return { origin: location.origin, title, fields, buttons };
})()`;

function pageBrowser(page: Page): Browser {
  return {
    view: () => page.evaluate<PageView>(READ_PAGE),
    fill: async (id, value) => {
      const field = page.locator(`[id="${id}"]`);
      await field.scrollIntoViewIfNeeded();
      // An anonymous arrow: tsx adds no helpers to it, so it runs in the page as written.
      await field.evaluate((el) => {
        (el as HTMLElement).style.outline = "4px solid gold";
      });
      await field.fill("");
      await field.pressSequentially(value, { delay: 70 });
    },
    choose: async (id, option) => {
      const field = page.locator(`[id="${id}"]`);
      await field.evaluate((el) => {
        (el as HTMLElement).style.outline = "4px solid gold";
      });
      await field.selectOption({ label: option });
      await page.waitForTimeout(400);
    },
    press: async (button) => {
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: button, exact: true }).click();
      await page.waitForTimeout(500);
    },
  };
}

/** The portal on this computer's dev server if it is up, else on the live site. */
async function portalBase(): Promise<string> {
  const local = "http://localhost:3000";
  const up = await fetch(`${local}${PORTAL_PATH}`, { signal: AbortSignal.timeout(3_000) }).then(
    (r) => r.ok,
    () => false,
  );
  return up ? local : (process.env.APP_URL ?? local);
}

async function main() {
  try {
    process.loadEnvFile("apps/web/.env.local");
  } catch {
    // The variables may already be in the environment.
  }
  const db = createServiceClient();
  const shop = await getShop(db);
  const requestId =
    process.argv[2] ??
    (
      await db
        .from("loan_requests")
        .select("id")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data?.id;
  if (!requestId) throw new Error("No loan check yet: open the Bank tab and check the loan first.");
  const facts = applyFacts(await loadApplication(db, shop, requestId));

  const base = await portalBase();
  // The Chrome already on the shop's computer, with a fresh profile of its own: nothing to
  // download, and none of his own browsing is touched.
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const page = await (
    await browser.newContext({ viewport: { width: 900, height: 900 } })
  ).newPage();
  await page.goto(`${base}${PORTAL_PATH}`);
  say({ type: "opened", url: `${base}${PORTAL_PATH}` });

  const filled: string[] = [];
  const left: string[] = [];
  await runApplyAgent(
    {
      browser: pageBrowser(page),
      generate: geminiPlanner(),
      onEvent: async (event) => {
        if (event.kind === "filled") filled.push(event.fact);
        if (event.kind === "left") left.push(event.field);
        say({ type: "step", ...event });
      },
    },
    { facts, origin: new URL(base).origin },
  );
  await audit(db, shop.id, [
    {
      actor: "agent",
      action: "loan.apply_browser",
      entityType: "loan_request",
      entityId: requestId,
      payload: { portal: `${base}${PORTAL_PATH}`, facts: filled, leftForOwner: left },
    },
  ]);
  say({ type: "done" });
  // The window stays open for the owner to take over, until he closes it.
  await Promise.race([
    new Promise((done) => browser.on("disconnected", done)),
    new Promise((done) => setTimeout(done, HAND_OVER_MS)),
  ]);
  await browser.close().catch(() => undefined);
  process.exit(0);
}

main().catch((error: unknown) => {
  say({ type: "error", message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
