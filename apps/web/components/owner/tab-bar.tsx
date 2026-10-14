import { BookOpen, ClipboardList, Moon, Package, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type OwnerTab = "orders" | "stock" | "credit" | "today";

const tabs: { id: OwnerTab; label: string; icon: LucideIcon }[] = [
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "stock", label: "Stock", icon: Package },
  { id: "credit", label: "Credit", icon: BookOpen },
  { id: "today", label: "Today", icon: Moon },
];

/** The owner app's four places, always one tap away. */
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
    <nav className="grid grid-cols-4 border-t border-border bg-surface pb-4">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
          className={cn(
            "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
            tab === id ? "font-bold text-ink" : "font-medium text-ink-muted",
          )}
        >
          <Icon aria-hidden className="size-6" />
          {label}
          {id === "orders" && waiting > 0 && (
            <span className="absolute top-2 left-1/2 ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-ink">
              {waiting}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
