import type { mandateJson } from "@/lib/bill-pay/mandate";
import type { billPaid } from "@/lib/bill-pay/paid";
import type { runBillPay } from "@/lib/bill-pay/run";
import { call, post } from "@/lib/owner/fetch";

// The owner app's calls to the bill-pay agent's routes (docs/api.md, "Bill-pay agent"), typed
// from the server code that answers them.

export type BillMandate = NonNullable<ReturnType<typeof mandateJson>>;
export type BillPayRun = Awaited<ReturnType<typeof runBillPay>>;
export type BillPayDecision = BillPayRun["decisions"][number];
export type BillPaid = Awaited<ReturnType<typeof billPaid>>;

const MANDATE_URL = "/api/bill-pay/mandate";

export const billPayApi = {
  mandate: () => call<{ mandate: BillMandate | null }>(MANDATE_URL),
  setMandate: (weeklyLimitPaise: number, keepInHandPaise: number) =>
    call<{ mandate: BillMandate }>(MANDATE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekly_limit_paise: weeklyLimitPaise,
        keep_in_hand_paise: keepInHandPaise,
      }),
    }),
  stopMandate: () => call<{ ok: true }>(MANDATE_URL, { method: "DELETE" }),
  run: () => post<BillPayRun>("/api/bill-pay/run", {}),
  paid: (payableId: string, runId: string) =>
    post<BillPaid>(`/api/bill-pay/${payableId}/paid`, { run_id: runId }),
};
