import { loadCatalog } from "@/lib/catalog";
import { handle } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";

/** Every product with its stock, for the owner's Stock tab. */
export function GET() {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    return Response.json(
      { products: await loadCatalog(db, shop.id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
