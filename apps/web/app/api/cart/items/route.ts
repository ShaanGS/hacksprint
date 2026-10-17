import { z } from "zod";
import { loadCatalog } from "@/lib/catalog";
import { requireCustomer } from "@/lib/customer/context";
import { handle, HttpError, readJson } from "@/lib/http";
import { findDraftId, readCart, setCartQuantity } from "@/lib/orders/cart";

const body = z.object({ code: z.string().min(1), qty: z.number().min(0) });

/** A −/+ tap on the review sheet: straight to the cart, no AI in between. */
export function POST(request: Request) {
  return handle(async () => {
    const { code, qty } = await readJson(request, body);
    const { db, shop, customer } = await requireCustomer();
    const orderId = await findDraftId(db, customer.id);
    if (!orderId) throw new HttpError(409, "There is no open order.");
    const products = await loadCatalog(db, shop.id);
    const product = products.find((p) => p.code === code);
    if (!product) throw new HttpError(404, "No such product.");
    await setCartQuantity(db, orderId, product, qty, products);
    return Response.json({ cart: await readCart(db, orderId) });
  });
}
