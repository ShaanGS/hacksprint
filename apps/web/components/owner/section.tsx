import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";

/** A titled card of rows on an owner tab, with its total on the right when the rows add up to one. */
export function Section({
  title,
  total,
  note,
  children,
}: {
  title: string;
  total?: number;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="flex items-baseline justify-between gap-3 px-1 text-lg leading-snug font-bold">
        {title}
        {total !== undefined && <Amount paise={total} size="lg" />}
      </h2>
      {note && <p className="mt-1 px-1 text-sm text-ink-muted">{note}</p>}
      <ul className="mt-3 divide-y divide-border rounded-3xl bg-surface p-1 shadow-card">
        {children}
      </ul>
    </section>
  );
}
