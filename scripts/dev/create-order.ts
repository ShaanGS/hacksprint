import { createServiceClient } from "@/lib/supabase/server";
import { orderTotalPaise, type PricedLine } from "@/lib/orders/total";
import { transitionOrder } from "@/lib/orders/state";

type DbClient = Parameters<typeof transitionOrder>[0];

type SeedProduct = {
  id: string;
  name: string;
  price_paise: number;
};

export class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentError";
  }
}

/** Refuses execution if running in production mode. */
export function assertDevEnvironment(env: string | undefined = process.env.NODE_ENV): void {
  if (env === "production") {
    throw new EnvironmentError(
      "Refusing to run: create-order is a dev-only script and cannot run in production.",
    );
  }
}

export type CreatedDevOrder = {
  orderId: string;
  shopName: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    unitPricePaise: number;
  }>;
  totalPaise: number;
  status: "pending_approval";
};

/**
 * Creates a seed order in pending_approval for Lakshmi Stores using 2-3 products
 * and a seed customer. Totals are calculated via lib/orders/total.ts and the status
 * transition is performed via lib/orders/state.ts to ensure audit logging.
 */
export async function createDevOrder(db: DbClient): Promise<CreatedDevOrder> {
  assertDevEnvironment();

  // 1. Fetch seed shop
  const { data: shop, error: shopErr } = await db
    .from("shops")
    .select("id, name")
    .eq("name", "Lakshmi Stores")
    .maybeSingle();

  if (shopErr || !shop) {
    throw new Error(
      `Seed shop "Lakshmi Stores" not found: ${shopErr?.message ?? "Run pnpm db:reset first."}`,
    );
  }

  // 2. Fetch or create a seed customer for this shop
  let customerId: string;
  const { data: existingCustomer } = await db
    .from("customers")
    .select("id")
    .eq("shop_id", shop.id)
    .limit(1)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: custErr } = await db
      .from("customers")
      .insert({
        shop_id: shop.id,
        name: "Kavitha",
        phone: "+919876543210",
      })
      .select("id")
      .single();

    if (custErr || !newCustomer) {
      throw new Error(`Failed to create seed customer: ${custErr?.message}`);
    }
    customerId = newCustomer.id;
  }

  // 3. Fetch 3 seed products with available stock
  const { data: products, error: prodErr } = await db
    .from("products")
    .select("id, name, price_paise")
    .eq("shop_id", shop.id)
    .gt("stock_qty", 0)
    .order("name", { ascending: true })
    .limit(3);

  const seedProducts = (products as SeedProduct[] | null) ?? [];

  if (prodErr || seedProducts.length < 2) {
    throw new Error(
      `Could not find at least 2 seed products: ${prodErr?.message ?? "empty products"}`,
    );
  }

  const items = seedProducts.map((p: SeedProduct, index: number) => ({
    productId: p.id,
    name: p.name,
    qty: index === 0 ? 2 : 1,
    unitPricePaise: p.price_paise,
  }));

  const pricedLines: PricedLine[] = items.map((i: { qty: number; unitPricePaise: number }) => ({
    qty: i.qty,
    unitPricePaise: i.unitPricePaise,
  }));

  // Totals computed ONLY in lib/orders/total.ts in integer paise
  const totalPaise = orderTotalPaise(pricedLines);

  // 4. Create initial order in draft
  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      shop_id: shop.id,
      customer_id: customerId,
      status: "draft",
      payment_mode: "link",
      total_paise: totalPaise,
    })
    .select("id, status")
    .single();

  if (orderErr || !order) {
    throw new Error(`Failed to create draft order: ${orderErr?.message}`);
  }

  // 5. Insert line items
  const orderItemsData = items.map(
    (item: { productId: string; qty: number; unitPricePaise: number }) => ({
      order_id: order.id,
      product_id: item.productId,
      qty: item.qty,
      unit_price_paise: item.unitPricePaise,
    }),
  );

  const { error: itemsErr } = await db.from("order_items").insert(orderItemsData);
  if (itemsErr) {
    throw new Error(`Failed to insert order items: ${itemsErr.message}`);
  }

  // 6. Move from draft -> pending_approval via state machine (guardrail 4 & 6)
  const moved = await transitionOrder(db, {
    orderId: order.id,
    from: "draft",
    to: "pending_approval",
    actor: "customer",
    shopId: shop.id,
    payload: {
      items_count: items.length,
      total_paise: totalPaise,
    },
  });

  if (!moved) {
    throw new Error(`Failed to transition order ${order.id} from draft to pending_approval`);
  }

  return {
    orderId: order.id,
    shopName: shop.name,
    items,
    totalPaise,
    status: "pending_approval",
  };
}

async function main() {
  assertDevEnvironment();

  try {
    process.loadEnvFile("apps/web/.env.local");
  } catch {
    // env variables may already be set in the process
  }

  const db = createServiceClient();
  const order = await createDevOrder(db);

  console.log(`Created order ${order.orderId} in pending_approval:`);
  console.log(`  Shop:   ${order.shopName}`);
  console.log(`  Items:`);
  for (const item of order.items) {
    console.log(`    - ${item.name} x${item.qty} (@ ${item.unitPricePaise} paise)`);
  }
  console.log(`  Total:  ${order.totalPaise} paise (₹${(order.totalPaise / 100).toFixed(2)})`);
  console.log(`  Status: ${order.status} (logged to audit_log)`);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("create-order.ts") || process.argv[1].endsWith("create-order"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
