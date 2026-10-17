import { z } from "zod";
import { requireCustomer } from "@/lib/customer/context";
import { handle, HttpError } from "@/lib/http";
import { findDraftId } from "@/lib/orders/cart";
import { requireOwner } from "@/lib/owner/context";
import { homeSource } from "@/lib/sources/home";
import { orderPriceSources, productPriceSources } from "@/lib/sources/prices";
import { startOfShopDay } from "@/lib/time";

const homeKind = z.enum(["orders", "collected", "owed-to-shop", "owed-by-shop"]);

/**
 * Where a number came from (spec E3): home/{orders|collected|owed-to-shop|owed-by-shop},
 * price/{productId} and order/{orderId} for the owner; cart/current for a customer's own order.
 */
export function GET(
  _request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  return handle(async () => {
    const { entity, id } = await context.params;
    if (entity === "cart" && id === "current") {
      const { db, customer } = await requireCustomer();
      const orderId = await findDraftId(db, customer.id);
      return Response.json(orderId ? await orderPriceSources(db, orderId, "customer") : []);
    }
    const { db, shop } = await requireOwner();
    if (entity === "home") {
      const kind = homeKind.safeParse(id);
      if (!kind.success) throw new HttpError(404, "No such number.");
      return Response.json(await homeSource(db, shop.id, kind.data, startOfShopDay()));
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
