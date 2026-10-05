import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { elapsed, fail, pass, type SmokeResult } from "./report";

// Romanized Tamil must find Sugar. The other probes show how trigram search handles each
// script, which depends on the database's locale: worth knowing before the voice slice.
const PROBES = [
  { query: "sakkarai", label: "Tamil, romanized" },
  { query: "சர்க்கரை", label: "Tamil script" },
  { query: "चीनी", label: "Hindi script" },
  { query: "cheeni", label: "Hindi, romanized" },
  { query: "ಸಕ್ಕರೆ", label: "Kannada script" },
  { query: "sakkare", label: "Kannada, romanized" },
];

const shopSchema = z.object({ id: z.string(), name: z.string() });
const matchesSchema = z.array(z.object({ product_name: z.string(), score: z.number() }));

export async function smokeSupabase(): Promise<SmokeResult> {
  const db = createServiceClient();

  const start = performance.now();
  const shopQuery = await db.from("shops").select("id, name").limit(1).maybeSingle();
  if (shopQuery.error) return fail(`Could not read shops: ${shopQuery.error.message}`);
  if (!shopQuery.data) return fail("No shop found. Run `pnpm db:reset` to apply the seed.");
  const shop = shopSchema.parse(shopQuery.data);

  const productQuery = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id);
  if (productQuery.error) return fail(`Could not count products: ${productQuery.error.message}`);
  const lines = [`${shop.name}: ${productQuery.count} products (${elapsed(start)})`];

  let romanizedTamilFindsSugar = false;
  for (const probe of PROBES) {
    const probeStart = performance.now();
    const search = await db.rpc("search_products", {
      p_shop_id: shop.id,
      p_query: probe.query,
      p_limit: 1,
    });
    if (search.error) return fail(...lines, `search_products failed: ${search.error.message}`);
    const best = matchesSchema.parse(search.data)[0];
    const found = best ? `${best.product_name} (score ${best.score.toFixed(2)})` : "no match";
    lines.push(`${probe.label.padEnd(18)} "${probe.query}" -> ${found}, ${elapsed(probeStart)}`);
    if (probe.query === "sakkarai") romanizedTamilFindsSugar = best?.product_name === "Sugar";
  }

  return romanizedTamilFindsSugar
    ? pass(...lines)
    : fail(...lines, 'expected "sakkarai" to find Sugar');
}
