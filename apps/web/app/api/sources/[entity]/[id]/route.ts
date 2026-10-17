import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { requireCustomer } from "@/lib/customer/context";
import { handle, HttpError } from "@/lib/http";
import { findDraftId } from "@/lib/orders/cart";
import { loadShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { rotationPart, rotationSource } from "@/lib/rotation/sources";
import { orderPriceSources, productPriceSources } from "@/lib/sources/prices";

/**
 * Where a number came from (spec E3): rotation/{part} for the money screens and price/{productId}
 * for the owner; cart/current and order/{orderId} serve the frozen customer ordering.
 */
export function GET(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  return handle(async () => {
    const { entity, id } = await context.params;
    if (entity === "cart" && id === "current") {
      const { db, customer } = await requireCustomer();
      const orderId = await findDraftId(db, customer.id);
      return Response.json(orderId ? await orderPriceSources(db, orderId, "customer") : []);
    }
    const { db, shop } = await requireShop(request);
    if (entity === "rotation") {
      const part = rotationPart.safeParse(id);
      if (!part.success) throw new HttpError(404, "No such number.");
      const data = await loadShopData(db, shop.id);
      return Response.json(rotationSource(part.data, data, snapshotOf(data)), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "No such number.");
    if (entity === "price") {
      const [source] = await productPriceSources(db, shop.id, [id], "owner");
      if (!source) throw new HttpError(404, "No such product.");
      return Response.json(source);
    }
    if (entity === "order") return Response.json(await orderPriceSources(db, id, "owner"));
    throw new HttpError(404, "No such number.");
  });
}
