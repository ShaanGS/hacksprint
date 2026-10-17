"use client";

import { LanguageSwitch } from "@/components/owner/language-switch";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Badge } from "@/components/ui/badge";

/**
 * A tab's top bar (reference 1): the owner's initial, the shop's name with a small line above
 * it, the demo label while the shop runs on seeded demo data (spec rule 12), and the switch
 * between the shop's language and English. The page's headline sits under it.
 */
export function TabHeader({ title, line }: { title: string; line?: string }) {
  const { text } = useOwnerLanguage();
  const { demo, openDemoTools, shopName, ownerName } = useOwnerScreen();
  return (
    <header className="pt-2">
      <div className="flex min-h-12 items-center gap-3">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-base font-bold text-accent-ink"
        >
          {ownerName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          {line && <p className="truncate text-xs font-medium text-ink-muted">{line}</p>}
          <p className="truncate text-base font-bold">{shopName}</p>
        </div>
        <LanguageSwitch />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <h1 className="text-title leading-tight font-bold tracking-tight">{title}</h1>
        {demo && (
          <button
            type="button"
            onClick={openDemoTools}
            className="flex min-h-11 shrink-0 items-center"
          >
            <Badge>{text.demoData}</Badge>
          </button>
        )}
      </div>
    </header>
  );
}
