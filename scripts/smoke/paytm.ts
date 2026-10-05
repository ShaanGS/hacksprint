import { appEnv, paytmEnv } from "@/lib/env";
import { createPaymentLink } from "@/lib/paytm/client";
import { elapsed, pass, type SmokeResult } from "./report";

// Creates one Rs 1 link on Paytm staging. This is also the only real check of our signing code:
// Paytm publishes no checksum test vector, and staging rejects a bad signature (code 5028).
export async function smokePaytm(): Promise<SmokeResult> {
  // Report missing Paytm keys before anything else; they are what this check is about.
  paytmEnv();
  const appUrl = appEnv().APP_URL;
  // Paytm can only call back a public https URL; a local run has none, so none is sent.
  const callbackUrl = appUrl.startsWith("https://") ? `${appUrl}/api/webhooks/paytm` : undefined;

  const start = performance.now();
  const link = await createPaymentLink({
    amountPaise: 100,
    linkName: "SmokeTest",
    description: "Smoke test link",
    callbackUrl,
  });

  return pass(
    `created staging link ${link.linkId} for Rs 1 in ${elapsed(start)}: ${link.shortUrl}`,
    callbackUrl
      ? `status callback: ${callbackUrl}`
      : "no status callback sent (APP_URL is not https)",
  );
}
