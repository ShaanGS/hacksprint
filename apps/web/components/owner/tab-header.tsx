"use client";

import { LanguageSwitch } from "@/components/owner/language-switch";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Badge } from "@/components/ui/badge";

/**
 * A tab's title, with the switch between the shop's language and English, and the demo label
 * while the shop runs on seeded demo data (spec rule 12).
 */
export function TabHeader({ title, line }: { title: string; line?: string }) {
  const { text } = useOwnerLanguage();
  const { demo, openDemoTools } = useOwnerScreen();
  return (
    <header>
      <div className="flex h-11 items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-ink-muted">{line}</p>
        <div className="flex shrink-0 items-center gap-2">
          {demo && (
            <button type="button" onClick={openDemoTools} className="flex min-h-11 items-center">
              <Badge>{text.demoData}</Badge>
            </button>
          )}
          <LanguageSwitch />
        </div>
      </div>
      <h1 className="text-title font-extrabold tracking-tight">{title}</h1>
    </header>
  );
}
