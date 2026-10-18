"use client";

import { CircleCheck } from "lucide-react";
import { useMemo } from "react";
import { qrPath } from "@/lib/qr";

/**
 * A payment link as a QR that any phone camera scans: the customer at the counter, or a judge
 * in the room. It stays up while the agent watches, and turns into the paid line the moment the
 * payment lands, with no tap from the owner.
 */
export function PayQr({
  url,
  title,
  note,
  paidLine,
}: {
  url: string;
  title: string;
  note: string;
  paidLine: string | null;
}) {
  const qr = useMemo(() => qrPath(url), [url]);
  const box = qr.size + 4;
  if (paidLine) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2 rounded-3xl bg-night-raised p-6 text-center">
        <CircleCheck aria-hidden className="size-14 text-yellow" />
        <p className="text-xl font-bold">{paidLine}</p>
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-col items-center gap-3 rounded-3xl bg-night-raised p-4 text-center">
      <p className="text-lg font-bold">{title}</p>
      <div className="rounded-3xl bg-surface p-3">
        <svg viewBox={`-2 -2 ${box} ${box}`} role="img" aria-label={title} className="size-56">
          <rect x={-2} y={-2} width={box} height={box} className="fill-surface" />
          <path d={qr.path} shapeRendering="crispEdges" className="fill-ink" />
        </svg>
      </div>
      <p className="text-sm text-night-muted">{note}</p>
    </div>
  );
}
