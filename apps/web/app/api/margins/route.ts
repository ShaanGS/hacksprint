import { loadCatalog } from "@/lib/catalog";
import { handle } from "@/lib/http";
import { loadCostLines, margins } from "@/lib/margins";
import { requireOwner } from "@/lib/owner/context";

/** Profit per item and the cheaper distributor for each (spec C2, C3). */
export function GET() {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    const [products, lines] = await Promise.all([
      loadCatalog(db, shop.id),
      loadCostLines(db, shop.id),
    ]);
    return Response.json(margins(products, lines), { headers: { "Cache-Control": "no-store" } });
  });
}
