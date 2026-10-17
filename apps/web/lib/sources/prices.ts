import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PriceSource } from "@/lib/sources/types";

// Every price points at the bill line that printed it (rule 6): the product's price_source, or
// for an order, the line's price_source from when it was added. A customer sees the MRP and the
// bill it came from; only the owner sees what the shop paid, and the photo of the bill.

export type Viewer = "owner" | "customer";

const PHOTO_URL_SECONDS = 600;
const BILL_LINE =
  "source:bill_items!price_source(mrp_paise, unit_cost_paise, bills(bill_number, billed_on, created_at, image_path, distributors(name)))";

const billLine = z
  .object({
    mrp_paise: z.number().int().nullable(),
    unit_cost_paise: z.number().int(),
    bills: z.object({
      bill_number: z.string().nullable(),
      billed_on: z.string().nullable(),
      created_at: z.string(),
      image_path: z.string().nullable(),
      distributors: z.object({ name: z.string() }).nullable(),
    }),
  })
  .nullable();

const productRow = z.object({
  id: z.string(),
  name: z.string(),
  art: z.string(),
  price_paise: z.number().int(),
  source: billLine,
});

const orderLineRow = z.object({
  unit_price_paise: z.number().int(),
  products: z.object({ id: z.string(), name: z.string(), art: z.string() }),
  source: billLine,
});

type Line = {
  id: string;
  name: string;
  art: string;
  pricePaise: number;
  source: z.infer<typeof billLine>;
};

export async function productPriceSources(
  db: SupabaseClient,
  shopId: string,
  productIds: string[],
  viewer: Viewer,
): Promise<PriceSource[]> {
  const { data, error } = await db
    .from("products")
    .select(`id, name, art, price_paise, ${BILL_LINE}`)
    .eq("shop_id", shopId)
    .in("id", productIds);
  if (error) throw new Error(`Could not read where the prices came from: ${error.message}`);
  const lines = z
    .array(productRow)
    .parse(data)
    .map((row) => ({ ...row, pricePaise: row.price_paise }));
  return withBills(db, lines, viewer);
}

/** The price of every line in an order, as it was when the line was added. */
export async function orderPriceSources(
  db: SupabaseClient,
  orderId: string,
  viewer: Viewer,
): Promise<PriceSource[]> {
  const { data, error } = await db
    .from("order_items")
    .select(`unit_price_paise, products(id, name, art), ${BILL_LINE}`)
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw new Error(`Could not read where the prices came from: ${error.message}`);
  const lines = z
    .array(orderLineRow)
    .parse(data)
    .map((row) => ({ ...row.products, pricePaise: row.unit_price_paise, source: row.source }));
  return withBills(db, lines, viewer);
}

async function withBills(db: SupabaseClient, lines: Line[], viewer: Viewer) {
  const photos = viewer === "owner" ? await photoUrls(db, lines) : new Map<string, string>();
  return lines.map((line): PriceSource => {
    const bill = line.source?.bills;
    return {
      productId: line.id,
      name: line.name,
      art: line.art,
      pricePaise: line.pricePaise,
      bill:
        line.source && bill
          ? {
              distributor: bill.distributors?.name ?? "",
              billNumber: bill.bill_number,
              billedOn: bill.billed_on ?? bill.created_at,
              mrpPaise: line.source.mrp_paise,
              unitCostPaise: viewer === "owner" ? line.source.unit_cost_paise : null,
              photoUrl: bill.image_path ? (photos.get(bill.image_path) ?? null) : null,
            }
          : null,
    };
  });
}

/** Short-lived links to the bill photos, one request for all of them. */
async function photoUrls(db: SupabaseClient, lines: Line[]): Promise<Map<string, string>> {
  const paths = [...new Set(lines.flatMap((line) => line.source?.bills.image_path ?? []))];
  if (paths.length === 0) return new Map();
  const { data, error } = await db.storage.from("bills").createSignedUrls(paths, PHOTO_URL_SECONDS);
  if (error) throw new Error(`Could not open the bill photos: ${error.message}`);
  return new Map(
    data.flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])),
  );
}
