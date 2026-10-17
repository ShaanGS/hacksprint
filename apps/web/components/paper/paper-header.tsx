import { Languages } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "@/components/paper/print-button";
import type { PaperLang } from "@/lib/i18n/paper";
import { paperTextFor } from "@/lib/i18n/paper";

/** The top of a printed page: what it is, whose, when, and on screen the language and print. */
export function PaperHeader({
  kind,
  shop,
  lines,
  demo,
  lang,
}: {
  kind: string;
  shop: string;
  lines: string[];
  demo: boolean;
  lang: PaperLang;
}) {
  const text = paperTextFor(lang);
  const other = lang === "ta" ? "en" : "ta";
  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={{ query: { lang: other } }}
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-muted px-4 text-sm font-semibold"
        >
          <Languages aria-hidden className="size-4" />
          {other === "ta" ? "தமிழ்" : "English"}
        </Link>
        <PrintButton label={text.print} />
      </div>
      <p className="mt-6 text-sm font-semibold text-ink-muted print:mt-0">{kind}</p>
      <h1 className="text-title font-extrabold tracking-tight">{shop}</h1>
      {lines.map((line) => (
        <p key={line} className="text-base text-ink-muted">
          {line}
        </p>
      ))}
      {demo && (
        <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium">
          {text.demoNote}
        </p>
      )}
    </header>
  );
}
