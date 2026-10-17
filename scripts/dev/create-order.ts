// `pnpm dev:order` puts a test order in front of the owner without speaking one: a seeded
// customer orders three products in stock, and the order goes to the owner the way the customer
// page sends it (lib/orders), so the owner app can be tried before voice works.
import { loadCatalog } from "@/lib/catalog";
import { normalizePhone } from "@/lib/customer/phone";
import { saveCustomer } from "@/lib/customers";
import { formatMoney } from "@/lib/money";
import { addToCart, openDraft, readCart } from "@/lib/orders/cart";
import { submitOrder } from "@/lib/orders/submit";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";
import { assertDevEnvironment } from "./guard";

async function main() {
  assertDevEnvironment();
  try {
    process.loadEnvFile("apps/web/.env.local");
  } catch {
    // The variables may already be in the environment.
  }
  const db = createServiceClient();
  const shop = await getShop(db);
  const catalog = await loadCatalog(db, shop.id);
  const picks = catalog.filter((product) => product.stockQty > 0).slice(0, 3);
  if (picks.length < 2) throw new Error("Fewer than 2 products in stock. Run pnpm db:reset.");

  const phone = normalizePhone("9800000001");
  if (!phone) throw new Error("The test phone number is not valid.");
  const customer = await saveCustomer(db, shop.id, { name: "Ravi Kumar", phone, lang: "hi" });
  const orderId = await openDraft(db, shop.id, customer.id, "hi");
  for (const [index, product] of picks.entries()) {
    await addToCart(db, orderId, product, index === 0 ? 2 : 1, catalog);
  }
  const cart = await readCart(db, orderId);
  const sent = await submitOrder(db, orderId, "link");
  if (!sent.ok) throw new Error(`The order was not sent: ${sent.reason}`);

  console.log(`Order #${sent.number} from ${customer.name} is waiting for ${shop.ownerName}:`);
  for (const line of cart.lines) console.log(`  ${line.qty} × ${line.name}`);
  console.log(`  Total ${formatMoney(cart.totalPaise)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
