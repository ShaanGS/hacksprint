import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";

/** A titled list on an owner tab, with its total on the right when the rows add up to one. */
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
    <section className="mt-6">
      <h2 className="flex items-baseline justify-between gap-3 text-xl font-bold tracking-tight">
        {title}
        {total !== undefined && <Amount paise={total} size="lg" />}
      </h2>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      <ul className="-mx-3 mt-1">{children}</ul>
    </section>
  );
}
