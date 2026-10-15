import { BookOpen, ClipboardList, Moon, Package, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type OwnerTab = "orders" | "stock" | "credit" | "today";

const tabs: { id: OwnerTab; label: string; icon: LucideIcon }[] = [
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "stock", label: "Stock", icon: Package },
  { id: "credit", label: "Credit", icon: BookOpen },
  { id: "today", label: "Today", icon: Moon },
];

/** The owner app's four places, floating over the page so the content scrolls under it. */
export function TabBar({
  tab,
  onChange,
  waiting,
}: {
  tab: OwnerTab;
  onChange: (tab: OwnerTab) => void;
  /** Orders that need the owner, shown on the Orders tab. */
  waiting: number;
}) {
  return (
    <nav className="pb-safe absolute inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface/90 pt-2 backdrop-blur">
      {tabs.map(({ id, label, icon: Icon }) => {
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
            {label}
          </button>
        );
      })}
    </nav>
  );
}
