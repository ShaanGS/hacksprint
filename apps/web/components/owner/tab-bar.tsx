"use client";

import { BookOpen, ClipboardList, House, Package, type LucideIcon } from "lucide-react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { cn } from "@/lib/cn";

export type OwnerTab = "orders" | "stock" | "credit" | "home";

const icons: Record<OwnerTab, LucideIcon> = {
  orders: ClipboardList,
  stock: Package,
  credit: BookOpen,
  home: House,
};

const columns = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

/** The owner app's places, floating over the page so the content scrolls under it. */
export function TabBar({
  tabs,
  tab,
  onChange,
  waiting,
}: {
  tabs: OwnerTab[];
  tab: OwnerTab;
  onChange: (tab: OwnerTab) => void;
  /** Orders that need the owner, shown on the Orders tab. */
  waiting: number;
}) {
  const { text } = useOwnerLanguage();
  return (
    <nav
      className={cn(
        "pb-safe absolute inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/90 pt-2 backdrop-blur",
        columns[tabs.length],
      )}
    >
      {tabs.map((id) => {
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
              active ? "font-bold text-ink" : "font-medium text-ink-faint",
            )}
          >
            <span
              className={cn(
                "relative grid h-8 w-14 place-items-center rounded-full transition-colors",
                active && "bg-surface-pressed",
              )}
            >
              <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
              {id === "orders" && waiting > 0 && (
                <span className="absolute -top-1 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-ink">
                  {waiting}
                </span>
              )}
            </span>
            {text.tabs[id]}
          </button>
        );
      })}
    </nav>
  );
}
