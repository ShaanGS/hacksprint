import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError, readJson } from "@/lib/http";
import { loanStatuses } from "@/lib/loans/track";
import { moveLoan } from "@/lib/loans/tracker";

const paise = z.number().int().positive().max(2_000_000_000);
const body = z.object({
  status: z.enum(loanStatuses),
  sanctioned_paise: paise.optional(),
  emi_paise: paise.optional(),
  tenure_months: z.number().int().min(1).max(120).optional(),
});

/** The owner taps the step the bank took; his word (owner_said). */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "No such loan.");
    const input = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    const sanction =
      input.sanctioned_paise && input.emi_paise && input.tenure_months
        ? {
            sanctionedPaise: input.sanctioned_paise,
            emiPaise: input.emi_paise,
            tenureMonths: input.tenure_months,
          }
        : null;
    await moveLoan(db, shop, id, input.status, sanction);
    return Response.json({ ok: true });
  });
}
