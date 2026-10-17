import { RequestError, SignedOutError } from "@/lib/owner/fetch";
import type { PlanLine } from "@/lib/planner/start";

// Reads the planner's stream (POST /api/agent/plan) line by line, so each tool the agent uses
// reaches the screen as it happens. A failure mid-stream arrives as an "error" line.

export type PlannerLine = PlanLine | { type: "error" };
export type PlanResult = Extract<PlanLine, { type: "plan" }>;

const URL = "/api/agent/plan";

export async function streamPlan(goal: string, onLine: (line: PlannerLine) => void): Promise<void> {
  const response = await fetch(URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal ? { goal } : {}),
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
    for (const line of lines) if (line.trim()) onLine(JSON.parse(line) as PlannerLine);
  }
  if (pending.trim()) onLine(JSON.parse(pending) as PlannerLine);
}
