import { z } from "zod";
import { appEnv, isPreview } from "@/lib/env";

const reorderSchema = z.object({
  distributorName: z.string().min(1),
  shopName: z.string().default("Sri Lakshmi Stores"),
  lines: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().positive(),
        unit: z.string().default("pack"),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = reorderSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid reorder payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (isPreview()) {
      return Response.json({ ok: true, sent: false, preview: true });
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    let token = "";
    try {
      token = appEnv().SHOP_TOKEN;
    } catch {
      token = process.env.SHOP_TOKEN || "";
    }

    if (!webhookUrl || !token) {
      // Missing webhook url or token in demo environment; return success so demo keeps working smoothly
      return Response.json({ ok: true, sent: false });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    if (!res || !res.ok) {
      // Fallback gracefully for demo reliability
      return Response.json({ ok: true, sent: false });
    }

    return Response.json({ ok: true, sent: true });
  } catch {
    return Response.json({ ok: true, sent: false });
  }
}
