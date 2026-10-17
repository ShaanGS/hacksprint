import { NextResponse } from "next/server";
import { z } from "zod";
import { EnvError, n8nEnv } from "@/lib/env";

// The owner approved a reorder. n8n carries it to the distributor (a Telegram or Gmail
// message in the demo); the app only hands it over. Without n8n keys the app stays in preview
// and the button still works, so the demo never waits on n8n.
const bodySchema = z.object({
  shopName: z.string().min(1).max(80),
  distributorName: z.string().min(1).max(80),
  lines: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        qty: z.number().positive().max(10000),
        unit: z.string().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  let env: ReturnType<typeof n8nEnv>;
  try {
    env = n8nEnv();
  } catch (error) {
    if (error instanceof EnvError) return NextResponse.json({ ok: true, sent: false });
    throw error;
  }

  const response = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-munim-secret": env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify({ type: "reorder", ...parsed.data, sentAt: new Date().toISOString() }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!response?.ok) {
    return NextResponse.json({ ok: false, error: "n8n_unreachable" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent: true });
}
