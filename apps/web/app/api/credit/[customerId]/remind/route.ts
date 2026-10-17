import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { remindCustomer } from "@/lib/reminders/remind";

/**
 * A4: the payment link and the WhatsApp message in the customer's language. The owner opens
 * `whatsapp_url` and presses send himself.
 */
export function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  return handle(async () => {
    const { customerId } = await context.params;
    if (!z.uuid().safeParse(customerId).success) throw new HttpError(404, "No such customer.");
    const { db, shop } = await requireShop(request);
    const reminder = await remindCustomer(db, shop, customerId);
    return Response.json({
      reminder_id: reminder.reminderId,
      amount_paise: reminder.amountPaise,
      message_text: reminder.messageText,
      payment_link_url: reminder.paymentLinkUrl,
      whatsapp_url: reminder.whatsappUrl,
    });
  });
}
