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

/** Posts a signed request to a Paytm link API and returns the parsed JSON. */
async function postSigned(path: string, body: Record<string, unknown>, what: string) {
  const env = paytmEnv();
  // Sign exactly the JSON that is sent: Paytm recomputes the hash over these characters.
  const json = JSON.stringify(body);
  const head = JSON.stringify({
    tokenType: "AES",
    signature: signPaytm(json, env.PAYTM_MERCHANT_KEY),
  });
  const response = await fetch(`${env.PAYTM_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"body":${json},"head":${head}}`,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Paytm ${what} failed: HTTP ${response.status}`);
  return (await response.json()) as unknown;
}

export async function createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLink> {
  const env = paytmEnv();
  const json = await postSigned(
    "/link/create",
    buildCreateLinkBody(env.PAYTM_MID, request),
    "Create Link",
  );
  const result = createLinkResponseSchema.parse(json).body;
  const info = result.resultInfo;
  // Paytm reports errors as HTTP 200 with resultStatus FAILED and a code (5028 = invalid checksum).
  if (info.resultStatus !== "SUCCESS" || result.linkId === undefined || !result.shortUrl) {
    const message = info.resultMessage ?? info.resultMsg ?? "";
    throw new Error(`Paytm Create Link failed: ${info.resultCode} ${message}`.trim());
  }
  return { linkId: result.linkId, shortUrl: result.shortUrl };
}

const transactionsResponseSchema = z.object({
  body: z.object({
    resultInfo: z.object({
      resultStatus: z.string(),
      resultCode: z.coerce.string(),
      resultMessage: z.string().optional(),
    }),
    orders: z
      .array(
        z.object({
          txnId: z.coerce.string().optional(),
          orderStatus: z.string().optional(),
          txnAmount: z.coerce.number().optional(),
        }),
      )
      .optional(),
  }),
});

export type LinkTransaction = { txnId: string; status: string; amountPaise: number };

/** Paytm's "no payments yet" answer for a link. */
const NO_TRANSACTIONS = "404";

/**
 * The payments made on one of our links, asked of Paytm server to server with a signed request.
 * Paytm's link webhook is switched on only by Paytm support, so this is how a link payment is
 * known for certain without it.
 */
export async function fetchLinkTransactions(linkId: string): Promise<LinkTransaction[]> {
  const env = paytmEnv();
  const json = await postSigned(
    "/link/fetchTransaction",
    { mid: env.PAYTM_MID, linkId: Number(linkId) },
    "Fetch Transaction",
  );
  const { resultInfo, orders } = transactionsResponseSchema.parse(json).body;
  if (resultInfo.resultCode === NO_TRANSACTIONS) return [];
  if (resultInfo.resultStatus !== "SUCCESS") {
    throw new Error(
      `Paytm Fetch Transaction failed: ${resultInfo.resultCode} ${resultInfo.resultMessage ?? ""}`.trim(),
    );
  }
  return (orders ?? []).flatMap((order) =>
    order.txnId && order.orderStatus && order.txnAmount !== undefined
      ? [
          {
            txnId: order.txnId,
            status: order.orderStatus,
            amountPaise: Math.round(order.txnAmount * 100),
          },
        ]
      : [],
  );
}

/** The successful payment of exactly the link's amount, if Paytm shows one. */
export function successfulPayment(
  transactions: LinkTransaction[],
  amountPaise: number,
): LinkTransaction | null {
  return (
    transactions.find(
      (t) =>
        ["SUCCESS", "TXN_SUCCESS"].includes(t.status.toUpperCase()) &&
        t.amountPaise === amountPaise,
    ) ?? null
  );
}
