import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { KEEP_IN_HAND_PAISE, WEEKLY_LIMITS_PAISE } from "@/lib/bill-pay/limits";
import { loadMandate, mandateJson, setMandate, stopMandate } from "@/lib/bill-pay/mandate";
import { handle, readJson } from "@/lib/http";

// Only the chip amounts are accepted: the owner taps, he never types a limit.
const body = z.object({
  weekly_limit_paise: z.literal(WEEKLY_LIMITS_PAISE),
  keep_in_hand_paise: z.literal(KEEP_IN_HAND_PAISE),
});

/** The bill-pay agent's live mandate, or null when the owner has not set one. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(
      { mandate: mandateJson(await loadMandate(db, shop.id)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

/** The owner tapped "Save the limit": the new mandate replaces the live one. */
export function PUT(request: Request) {
  return handle(async () => {
    const input = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    const mandate = await setMandate(db, shop.id, {
      weeklyLimitPaise: input.weekly_limit_paise,
      keepInHandPaise: input.keep_in_hand_paise,
    });
    return Response.json({ mandate });
  });
}

/** The owner tapped Stop: the agent pays nothing until he sets a limit again. */
export function DELETE(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    await stopMandate(db, shop.id);
    return Response.json({ ok: true });
  });
}
