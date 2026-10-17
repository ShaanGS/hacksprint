// `pnpm demo:check` reads the demo shop as the app does and checks the story the demo tells
// (spec section 17, step 2): a normal week is ok, this week is short, the late payers close only
// part of the gap, and the loan needed is in Mudra's Shishu band. Run it after every reset.
import { formatMoney } from "@/lib/money";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { loadShopData } from "@/lib/rotation/load";
import { loanNeeded } from "@/lib/rotation/loan";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { mudraBand } from "@/lib/schemes/band";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

async function main() {
  try {
    process.loadEnvFile("apps/web/.env.local");
  } catch {
    // The variables may already be in the environment.
  }
  const db = createServiceClient();
  const shop = await getShop(db);
  const data = await loadShopData(db, shop.id);
  const order = await loadFestivalOrder(db, shop.id, data.receipts);
  if (!order) throw new Error("No approved festival order in the seed.");
  const now = snapshotOf(data);
  const without = snapshotOf(data, new Set(order.payableId ? [order.payableId] : []));
  const loan = loanNeeded(order.totalPaise, without.week.gapPaise, without.week.late.paise);
  const band = mudraBand(loan, false);

  console.log(
    `On the shelf ${formatMoney(now.onShelf.paise)}, with customers ${formatMoney(now.withCustomers.paise)}, owed ${formatMoney(now.owedToSuppliers.paise)}`,
  );
  console.log(
    `This week: needed ${formatMoney(now.week.needed.paise)}, likely ${formatMoney(now.week.likely.paise)}, gap ${formatMoney(now.week.gapPaise)} (${now.week.state})`,
  );
  console.log(
    `Without the ${order.festival} order (${formatMoney(order.totalPaise)}): gap ${formatMoney(without.week.gapPaise)} (${without.week.state})`,
  );
  console.log(
    `Late payers: ${now.week.late.customers}, ${formatMoney(now.week.late.paise)}; stuck stock ${formatMoney(now.stuck.paise)}`,
  );
  console.log(
    `Loan needed ${formatMoney(loan)}: ${band.covered ? `Mudra ${band.band.name}` : band.reason}`,
  );
  console.log(`Money cycle ${now.cycle ? now.cycle.days.toFixed(1) : "unknown"} days`);

  const checks: [string, boolean][] = [
    ["a normal week is ok", without.week.state === "ok"],
    ["this week is short", now.week.state === "short"],
    ["three late payers", now.week.late.customers === 3],
    [
      "late payers close only part of the gap",
      now.week.late.paise > 0 && now.week.late.paise < -now.week.gapPaise,
    ],
    ["the loan is in Shishu", band.covered && band.band.key === "shishu"],
    ["nothing asked of the owner", now.week.asks.length === 0],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
