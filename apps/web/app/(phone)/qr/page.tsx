import type { Metadata } from "next";
import { headers } from "next/headers";
import { Art } from "@/components/ui/art";
import { appEnv, isPreview } from "@/lib/env";
import { langs } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import { previewShop } from "@/lib/preview/data";
import { qrPath } from "@/lib/qr";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Scan to order" };

/** The order page's address: the app's public URL, or wherever the preview is being served. */
async function orderUrl(): Promise<string> {
  if (!isPreview()) return `${appEnv().APP_URL}/order`;
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  return `${head.get("x-forwarded-proto") ?? "https"}://${host}/order`;
}

/** The QR for the counter and the projector: scan it and order by voice (spec A1). */
export default async function QrPage() {
  const url = await orderUrl();
  const shopName = isPreview() ? previewShop.name : (await getShop(createServiceClient())).name;
  const qr = qrPath(url);
  const box = qr.size + 4;
  return (
    <main className="flex min-h-full flex-col items-center px-6 pt-10 pb-10 text-center">
      <Art name="shop" size={96} eager />
      <h1 className="mt-3 text-display font-extrabold tracking-tight">{shopName}</h1>
      <div className="mt-6 rounded-3xl bg-surface p-3 shadow-float ring-1 ring-border">
        <svg
          viewBox={`-2 -2 ${box} ${box}`}
          role="img"
          aria-label={textFor("en").scanToOrder}
          className="size-64"
        >
          <rect x={-2} y={-2} width={box} height={box} className="fill-surface" />
          <path d={qr.path} shapeRendering="crispEdges" className="fill-ink" />
        </svg>
      </div>
      <ul className="mt-6 space-y-1">
        {langs.map((lang) => (
          <li
            key={lang}
            lang={lang}
            className={lang === "en" ? "text-lg font-bold" : "text-base font-medium"}
          >
            {textFor(lang).scanToOrder}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm break-all text-ink-muted">{url.replace(/^https?:\/\//, "")}</p>
    </main>
  );
}
