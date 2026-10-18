import { z } from "zod";
import { razorpayEnv } from "@/lib/env";

// Razorpay Payment Links (decision of Oct 18), in test mode on stage: a fixed-amount link that
// opens Razorpay's own checkout. Two REST calls, no SDK. Nothing about the customer is sent, only
// the amount and what it is for (rule 10), and Razorpay sends no SMS or email of its own.

const LINKS_URL = "https://api.razorpay.com/v1/payment_links";

const linkSchema = z.object({
  id: z.string(),
  short_url: z.string(),
  status: z.string(),
  amount: z.number().int(),
  amount_paid: z.number().int(),
  payments: z
    .array(z.object({ payment_id: z.string(), amount: z.number().int(), status: z.string() }))
    .nullish(),
});
export type RazorpayLink = z.infer<typeof linkSchema>;

export type RazorpayLinkRequest = {
  amountPaise: number;
  description: string;
  /** Our payment's id: Razorpay refuses a second link with the same reference. */
  referenceId: string;
};

/** Body for Razorpay's Create Payment Link API: the whole amount at once, no messages sent. */
export function razorpayLinkBody(request: RazorpayLinkRequest) {
  return {
    amount: request.amountPaise,
    currency: "INR",
    accept_partial: false,
    description: request.description,
    reference_id: request.referenceId,
    notify: { sms: false, email: false },
    reminder_enable: false,
  };
}

async function call(url: string, init: RequestInit, what: string): Promise<RazorpayLink> {
  const env = razorpayEnv();
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Razorpay ${what} failed: HTTP ${response.status}`);
  return linkSchema.parse(await response.json());
}

export async function createRazorpayLink(
  request: RazorpayLinkRequest,
): Promise<{ id: string; shortUrl: string }> {
  const link = await call(
    LINKS_URL,
    { method: "POST", body: JSON.stringify(razorpayLinkBody(request)) },
    "Create Payment Link",
  );
  return { id: link.id, shortUrl: link.short_url };
}

export function fetchRazorpayLink(id: string): Promise<RazorpayLink> {
  return call(`${LINKS_URL}/${encodeURIComponent(id)}`, { method: "GET" }, "Fetch Payment Link");
}

/** The captured payment's id when the link is paid in full, else null. */
export function razorpayPaid(link: RazorpayLink, amountPaise: number): string | null {
  if (link.status !== "paid" || link.amount_paid < amountPaise) return null;
  return (link.payments ?? []).find((payment) => payment.status === "captured")?.payment_id ?? null;
}
