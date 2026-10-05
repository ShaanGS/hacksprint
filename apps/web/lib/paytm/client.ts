import { z } from "zod";
import { paytmEnv } from "@/lib/env";
import { signPaytm } from "@/lib/paytm/checksum";

export type PaymentLinkRequest = {
  amountPaise: number;
  /** Letters and digits only; Paytm puts it in the link's long URL. */
  linkName: string;
  /** 3 to 30 characters, no special characters. */
  description: string;
  /** Public https URL that Paytm posts the payment status to. */
  callbackUrl?: string;
};

export type PaymentLink = {
  linkId: number;
  shortUrl: string;
};

const createLinkResponseSchema = z.object({
  body: z.object({
    resultInfo: z.object({
      resultStatus: z.string(),
      resultCode: z.coerce.string(),
      resultMessage: z.string().optional(),
      resultMsg: z.string().optional(),
    }),
    linkId: z.number().optional(),
    shortUrl: z.string().optional(),
  }),
});

/** Body for Paytm's Create Link API: a fixed-amount link that accepts one payment. */
export function buildCreateLinkBody(mid: string, request: PaymentLinkRequest) {
  return {
    mid,
    linkType: "FIXED",
    linkName: request.linkName,
    linkDescription: request.description,
    // Paytm takes rupees as a number.
    amount: request.amountPaise / 100,
    maxPaymentsAllowed: "1",
    // Paytm's docs mark these two as mandatory, although its own sample request omits them.
    partialPayment: "false",
    bindLinkIdMobile: false,
    // Paytm sends no SMS or email; how the link reaches the customer is decided in milestone 4.
    sendSms: false,
    sendEmail: false,
    ...(request.callbackUrl && { statusCallbackUrl: request.callbackUrl }),
  };
}

export async function createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLink> {
  const env = paytmEnv();
  // Sign exactly the JSON that is sent: Paytm recomputes the hash over these characters.
  const body = JSON.stringify(buildCreateLinkBody(env.PAYTM_MID, request));
  const head = JSON.stringify({
    tokenType: "AES",
    signature: signPaytm(body, env.PAYTM_MERCHANT_KEY),
  });

  const response = await fetch(`${env.PAYTM_BASE_URL}/link/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"body":${body},"head":${head}}`,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Paytm Create Link failed: HTTP ${response.status}`);
  }

  const result = createLinkResponseSchema.parse(await response.json()).body;
  const info = result.resultInfo;
  // Paytm reports errors as HTTP 200 with resultStatus FAILED and a code (5028 = invalid checksum).
  if (info.resultStatus !== "SUCCESS" || result.linkId === undefined || !result.shortUrl) {
    const message = info.resultMessage ?? info.resultMsg ?? "";
    throw new Error(`Paytm Create Link failed: ${info.resultCode} ${message}`.trim());
  }
  return { linkId: result.linkId, shortUrl: result.shortUrl };
}
