import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, readJson } from "@/lib/http";
import { planWeek } from "@/lib/planner/start";

// The planner agent: one run, streamed as lines of JSON, so the owner watches each tool the
// agent uses as it uses it, then gets the plan. Auth and the body are checked before the
// stream starts, so those failures come back as ordinary JSON errors.

const body = z.object({ goal: z.string().trim().max(300).optional() });

export function POST(request: Request) {
  return handle(async () => {
    const input = await readJson(request, body);
    const { db, shop } = await requireShop(request);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (line: unknown) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        try {
          await planWeek(db, shop, input.goal ?? "", send);
        } catch (error) {
          console.error(error);
          send({ type: "error" });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  });
}
