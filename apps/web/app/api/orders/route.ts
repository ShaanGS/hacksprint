import { handle } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";
import { ownerOrders } from "@/lib/owner/orders";
import { startOfShopDay } from "@/lib/time";

/** The owner's orders: today's, and any still open. Polled every 2 seconds. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    const status = new URL(request.url).searchParams.get("status");
    const orders = await ownerOrders(db, shop.id, startOfShopDay());
    return Response.json(
      { orders: status ? orders.filter((order) => order.status === status) : orders },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
