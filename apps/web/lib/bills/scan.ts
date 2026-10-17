import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { matchDistributor, toPaise } from "@/lib/bills/match";
import { readBillPhoto } from "@/lib/bills/read";
import type { ScannedBill, ScannedLine } from "@/lib/bills/types";
import { loadCatalog } from "@/lib/catalog";
import { loadDistributors } from "@/lib/distributors";
import { HttpError } from "@/lib/http";
import type { Shop } from "@/lib/shop";

// A photo of today's bill becomes a parsed bill waiting for the owner (spec B1). The photo is kept
// in the private bills bucket, so any price it sets can show where it came from (rule 6).

const addedRow = z.object({ created_at: z.string() });

export async function scanBill(db: SupabaseClient, shop: Shop, photo: Blob): Promise<ScannedBill> {
  const id = randomUUID();
  const imagePath = `${shop.id}/${id}.jpg`;
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const mimeType = photo.type || "image/jpeg";
  const [products, distributors] = await Promise.all([
    loadCatalog(db, shop.id),
    loadDistributors(db, shop.id),
  ]);
  const [stored, reading] = await Promise.all([
    db.storage.from("bills").upload(imagePath, bytes, { contentType: mimeType }),
    readBillPhoto(bytes, mimeType, products).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
  ]);
  if (stored.error) throw new Error(`Could not keep the bill photo: ${stored.error.message}`);

  if (!reading) {
    await db
      .from("bills")
      .insert({ id, shop_id: shop.id, image_path: imagePath, status: "failed" });
    await audit(db, shop.id, [
      { actor: "agent", action: "bill.unreadable", entityType: "bill", entityId: id },
    ]);
    throw new HttpError(502, "The bill could not be read. Try again with the whole bill in view.");
  }

  const lines: ScannedLine[] = reading.lines.map((line) => ({
    printedName: line.printedName,
    productId: products.find((p) => p.code === line.code)?.id ?? null,
    qty: line.qty,
    unitCostPaise: toPaise(line.unitCostRupees),
    mrpPaise: toPaise(line.mrpRupees),
    printedTotalPaise: toPaise(line.lineTotalRupees),
  }));
  const distributorId = matchDistributor(reading.distributor, distributors);
  const { error } = await db.from("bills").insert({
    id,
    shop_id: shop.id,
    image_path: imagePath,
    status: "parsed",
    parsed_items: lines,
    distributor_id: distributorId,
    bill_number: reading.billNumber,
  });
  if (error) throw new Error(`Could not save the bill: ${error.message}`);
  await audit(db, shop.id, [
    {
      actor: "agent",
      action: "bill.read",
      entityType: "bill",
      entityId: id,
      payload: {
        lines: lines.length,
        distributor: reading.distributor,
        number: reading.billNumber,
      },
    },
  ]);

  return {
    id,
    distributorId,
    printedDistributor: reading.distributor,
    billNumber: reading.billNumber,
    printedTotalPaise: toPaise(reading.totalRupees),
    lines,
    distributors,
    alreadyAddedOn: await addedBefore(db, distributorId, reading.billNumber),
  };
}

/** When this distributor's bill with this number was confirmed before, if it was. */
async function addedBefore(
  db: SupabaseClient,
  distributorId: string | null,
  billNumber: string | null,
): Promise<string | null> {
  if (!distributorId || !billNumber) return null;
  const { data, error } = await db
    .from("bills")
    .select("created_at")
    .eq("distributor_id", distributorId)
    .eq("bill_number", billNumber)
    .eq("status", "confirmed")
    .maybeSingle();
  if (error) throw new Error(`Could not check for the same bill: ${error.message}`);
  return data ? addedRow.parse(data).created_at : null;
}
