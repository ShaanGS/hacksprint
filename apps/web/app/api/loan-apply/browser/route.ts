import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { demoMode, localBrowserAgent } from "@/lib/env";
import { handle, HttpError, readJson } from "@/lib/http";

// The apply agent in a real browser (decision of Oct 18), on the shop's own computer only: it
// starts `pnpm agent:apply` for his loan check and streams its steps as lines of JSON. The live
// site has no browser to open, so there both answers are 404 and the screen keeps the simulation.

const body = z.object({ loan_request_id: z.uuid() });
// `next dev` runs in apps/web; the runner is a script at the repository's root.
const ROOT = path.resolve(process.cwd(), "..", "..");
const RUNNER = path.join(ROOT, "scripts", "agent", "apply-browser.ts");
const LAST_LINE = /"type":"(done|error)"/;

const available = () => demoMode() && localBrowserAgent() && existsSync(RUNNER);

/** Whether this computer can open the browser agent. */
export function GET(request: Request) {
  return handle(async () => {
    await requireShop(request);
    if (!available()) throw new HttpError(404, "Not found.");
    return Response.json({ available: true });
  });
}

export function POST(request: Request) {
  return handle(async () => {
    await requireShop(request);
    if (!available()) throw new HttpError(404, "Not found.");
    const { loan_request_id } = await readJson(request, body);
    // A fixed command; the only argument is the checked loan request id.
    const child = spawn("pnpm", ["-s", "agent:apply", loan_request_id], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      detached: true,
    });
    child.unref();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let pending = "";
        let open = true;
        const close = () => {
          if (open) controller.close();
          open = false;
        };
        child.stdout.on("data", (chunk: Buffer) => {
          pending += chunk.toString();
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const line of lines.filter((l) => l.trim())) {
            if (open) controller.enqueue(encoder.encode(`${line}\n`));
            // The window stays open for the owner; the stream ends when the agent hands over.
            if (LAST_LINE.test(line)) close();
          }
        });
        child.on("exit", close);
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  });
}
