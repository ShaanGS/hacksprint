export type ProductUnit = "kg" | "litre" | "pack" | "piece";

/** No single line can go above this, however the model or a tap sends it. */
export const MAX_QTY_PER_LINE = 20;

/** Loose goods are weighed in 50 g (or 50 ml) steps. */
const LOOSE_STEP = 0.05;

export type QuantityCheck = { ok: true; qty: number } | { ok: false; reason: string };

/**
 * Turns a requested quantity into one the shop can sell, or says why not. Packs and pieces
 * are whole numbers; kg and litre round to the nearest 50 g or 50 ml.
 */
export function normalizeQuantity(unit: ProductUnit, requested: number): QuantityCheck {
  if (!Number.isFinite(requested) || requested <= 0) {
    return { ok: false, reason: "quantity must be more than zero" };
  }
  const loose = unit === "kg" || unit === "litre";
  const qty = loose ? Math.round(requested / LOOSE_STEP) * LOOSE_STEP : Math.round(requested);
  // Rounding can take a tiny amount to zero (0.01 kg) or leave float noise (0.15000000000000002).
  const clean = Number(qty.toFixed(3));
  if (clean <= 0) {
    return { ok: false, reason: loose ? "less than 50 g" : "less than one" };
  }
  if (clean > MAX_QTY_PER_LINE) {
    return { ok: false, reason: `more than ${MAX_QTY_PER_LINE} on one line` };
  }
  return { ok: true, qty: clean };
}
