import type { ApplyEvent } from "@/lib/apply-browser/agent";
import { RequestError, SignedOutError } from "@/lib/owner/fetch";

// The apply agent's browser run (POST /api/loan-apply/browser), read line by line as it streams.

export type ApplyLine =
  | { type: "opened"; url: string }
  | ({ type: "step" } & ApplyEvent)
  | { type: "done" }
  | { type: "error"; message?: string };

const URL = "/api/loan-apply/browser";

/** True on the shop's own computer, where the agent can open a browser. */
export async function browserAgentAvailable(): Promise<boolean> {
  const response = await fetch(URL, { cache: "no-store" });
  return response.ok;
}

export async function streamApplyBrowser(
  loanRequestId: string,
  onLine: (line: ApplyLine) => void,
): Promise<void> {
  const response = await fetch(URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loan_request_id: loanRequestId }),
  });
  if (response.status === 401) throw new SignedOutError();
  if (!response.ok || !response.body) throw new RequestError(URL, response.status);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += value;
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onLine(JSON.parse(line) as ApplyLine);
  }
  if (pending.trim()) onLine(JSON.parse(pending) as ApplyLine);
}
