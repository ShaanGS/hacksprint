"use client";

import { Banknote, House, Landmark, Package, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { cn } from "@/lib/cn";

export type OwnerTab = "home" | "collect" | "stock" | "bank";

const icons: Record<OwnerTab, LucideIcon> = {
  home: House,
  collect: Banknote,
  stock: Package,
  bank: Landmark,
};

/**
 * The owner app's places on a floating white bar; the content scrolls under it and fades out
 * below it. The yellow mic sits raised in the middle, so it can be held from any tab.
 */
export function TabBar({
  tab,
  onChange,
  mic,
}: {
  tab: OwnerTab;
  onChange: (tab: OwnerTab) => void;
  mic: ReactNode;
}) {
  const { text } = useOwnerLanguage();
  const button = (id: OwnerTab) => {
    const Icon = icons[id];
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => onChange(id)}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
          active ? "font-bold text-accent" : "font-medium text-ink-faint",
        )}
      >
        <span
          className={cn(
            "grid size-9 place-items-center rounded-full transition-colors",
            active && "bg-accent text-accent-ink",
          )}
        >
          <Icon aria-hidden className="size-5" strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className="max-w-full truncate px-1">{text.tabs[id]}</span>
      </button>
    );
  };
  return (
    <nav className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-canvas from-50% to-canvas/0 px-3 pt-8">
      <div className="pointer-events-auto grid grid-cols-5 items-center rounded-3xl bg-surface px-1 py-1.5 shadow-float">
        {button("home")}
        {button("collect")}
        <div className="flex -translate-y-6 justify-center">
          <span className="rounded-full ring-4 ring-canvas">{mic}</span>
        </div>
        {button("stock")}
        {button("bank")}
      </div>
    </nav>
  );
}
