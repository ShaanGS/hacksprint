"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

/**
 * A sheet that slides up from the bottom of the phone screen and can be dragged down to close.
 * It attaches to #screen (see AppFrame), so on a laptop it stays inside the phone frame.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const container = typeof document === "undefined" ? undefined : document.getElementById("screen");
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} container={container}>
      <Drawer.Portal>
        <Drawer.Overlay className="absolute inset-0 z-40 bg-ink/40" />
        <Drawer.Content className="absolute inset-x-0 bottom-0 z-50 flex max-h-11/12 flex-col rounded-t-3xl bg-surface outline-none">
          <div
            aria-hidden
            className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-surface-pressed"
          />
          <div className="scroll px-4 pt-3 pb-6">
            <Drawer.Title className="border-b border-border pb-3 text-center text-xl font-bold">
              {title}
            </Drawer.Title>
            <Drawer.Description
              className={description ? "mt-3 text-center text-sm text-ink-muted" : "sr-only"}
            >
              {description ?? title}
            </Drawer.Description>
            <div className="mt-4">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
