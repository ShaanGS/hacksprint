import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { LastPlan } from "@/lib/planner/facts";
import type { ShopData } from "@/lib/rotation/load";

// A run and its steps in the database (agent_runs, agent_steps): the record of why the agent
// decided, and the episodic memory the next run reads instead of any chat history.

const MEMORY_HOURS = 24;

export type StepKind = "summary" | "tool_call" | "tool_result" | "plan" | "note";

export async function startRun(
  db: SupabaseClient,
  shopId: string,
  agent: "planner" | "bill_pay",
  goal: string,
): Promise<string> {
  const { data, error } = await db
    .from("agent_runs")
    .insert({ shop_id: shopId, agent, goal })
    .select("id")
    .single();
  if (error) throw new Error(`Could not start the run: ${error.message}`);
  return z.object({ id: z.string() }).parse(data).id;
}

/** Saves steps in order; seq keeps them in the order they happened. */
export function stepRecorder(db: SupabaseClient, runId: string) {
  let seq = 0;
  return async (kind: StepKind, name: string, payload: Record<string, unknown>) => {
    const { error } = await db
      .from("agent_steps")
      .insert({ run_id: runId, seq: seq++, kind, name, payload });
    if (error) throw new Error(`Could not save the run's step: ${error.message}`);
  };
}

export async function finishRun(
  db: SupabaseClient,
  runId: string,
  outcome: { status: "done" | "failed"; plannedBy: "model" | "rules" | null },
) {
  const { error } = await db
    .from("agent_runs")
    .update({
      status: outcome.status,
      planned_by: outcome.plannedBy,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw new Error(`Could not finish the run: ${error.message}`);
}

const savedPlan = z.object({
  steps: z.array(z.object({ action: z.string(), ids: z.array(z.string()) })),
});

/**
 * The last plan from the past day, with how it went: of the customers it asked to collect from,
 * how many have paid since. That one line is all the next run carries forward.
 */
export async function lastPlan(
  db: SupabaseClient,
  shopId: string,
  data: ShopData,
): Promise<LastPlan | null> {
  const since = new Date(data.now.getTime() - MEMORY_HOURS * 3_600_000).toISOString();
  const { data: rows, error } = await db
    .from("agent_runs")
    .select("created_at, agent_steps(kind, payload)")
    .eq("shop_id", shopId)
    .eq("agent", "planner")
    .eq("status", "done")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Could not read the last plan: ${error.message}`);
  const run = rows?.[0];
  const step = run?.agent_steps?.find((s: { kind: string }) => s.kind === "plan");
  const parsed = savedPlan.safeParse(step?.payload);
  if (!run || !parsed.success) return null;

  const asked = parsed.data.steps.find((s) => s.action === "collect")?.ids ?? [];
  const stillOwing = new Set(
    data.customers
      .filter((c) => asked.includes(c.customerId))
      .filter(owesNow)
      .map((c) => c.customerId),
  );
  return {
    at: String(run.created_at),
    actions: parsed.data.steps.map((s) => s.action),
    askedToCollect: asked.length,
    paidSince: asked.filter((id) => !stillOwing.has(id)).length,
  };
}

function owesNow(customer: ShopData["customers"][number]): boolean {
  return customer.entries.reduce((sum, entry) => sum + entry.amountPaise, 0) > 0;
}
