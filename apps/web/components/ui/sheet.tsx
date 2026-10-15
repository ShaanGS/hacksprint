"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

/**
 * A sheet that slides up from the bottom of the phone screen and can be dragged down to close.
 * It attaches to #screen (see AppFrame), so on a laptop it stays inside the phone frame. The
 * footer stays pinned while the content scrolls, so the sheet's one button is always in reach.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const container = typeof document === "undefined" ? undefined : document.getElementById("screen");
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} container={container}>
      <Drawer.Portal>
        <Drawer.Overlay className="absolute inset-0 z-40 bg-ink/40" />
        <Drawer.Content className="absolute inset-x-0 bottom-0 z-50 flex max-h-11/12 flex-col rounded-t-3xl bg-surface shadow-sheet outline-none">
          <div
            aria-hidden
            className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-surface-pressed"
          />
          <Drawer.Title className="mx-4 shrink-0 border-b border-border pt-3 pb-3 text-center text-xl font-bold tracking-tight">
            {title}
          </Drawer.Title>
          <Drawer.Description
            className={description ? "mx-4 mt-3 text-center text-sm text-ink-muted" : "sr-only"}
          >
            {description ?? title}
          </Drawer.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6">{children}</div>
          {footer && (
            <div className="pb-safe shrink-0 border-t border-border bg-surface px-4 pt-3">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
