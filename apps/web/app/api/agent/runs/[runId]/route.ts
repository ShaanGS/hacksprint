import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";

// One agent run with every step it took, in order: what it read, what each tool returned, and
// the plan. This is how anyone can see why the agent decided what it did.

const runId = z.uuid();

export function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  return handle(async () => {
    const id = runId.safeParse((await context.params).runId);
    if (!id.success) throw new HttpError(404, "No such run.");
    const { db, shop } = await requireShop(request);
    const { data, error } = await db
      .from("agent_runs")
      .select(
        "id, agent, goal, status, planned_by, created_at, finished_at, agent_steps(seq, kind, name, payload, created_at)",
      )
      .eq("id", id.data)
      .eq("shop_id", shop.id)
      .order("seq", { referencedTable: "agent_steps", ascending: true })
      .maybeSingle();
    if (error) throw new Error(`Could not read the run: ${error.message}`);
    if (!data) throw new HttpError(404, "No such run.");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  });
}
