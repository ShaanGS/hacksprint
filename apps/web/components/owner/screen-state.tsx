"use client";

import { LoaderCircle, RotateCw, WifiOff } from "lucide-react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";

/** A tab before its first numbers arrive: a spinner in a soft circle, never a blank screen. */
export function Loading() {
  return (
    <div className="grid h-full place-items-center">
      <span className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
        <LoaderCircle aria-hidden className="size-7 animate-spin motion-reduce:animate-none" />
      </span>
    </div>
  );
}

/** A tab whose first fetch failed; the timer keeps trying, and the owner can try at once. */
export function Failed({ onRetry }: { onRetry: () => void }) {
  const { text } = useOwnerLanguage();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <IconCircle icon={WifiOff} tone="sand" size="lg" />
      <p className="text-lg font-semibold">{text.loadFailed}</p>
      <Button variant="white" onClick={onRetry}>
        <RotateCw aria-hidden className="size-5" />
        {text.tryAgain}
      </Button>
    </div>
  );
}
