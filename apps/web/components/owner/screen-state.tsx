"use client";

import { RotateCw } from "lucide-react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Art, type ArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";

/** A tab before its first numbers arrive: its art, so the screen is never blank. */
export function Loading({ art }: { art: ArtName }) {
  return (
    <div className="grid h-full place-items-center">
      <Art name={art} size={120} eager className="animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

/** A tab whose first fetch failed; the timer keeps trying, and the owner can try at once. */
export function Failed({ art, onRetry }: { art: ArtName; onRetry: () => void }) {
  const { text } = useOwnerLanguage();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <Art name={art} size={120} eager />
      <p className="text-lg font-medium">{text.loadFailed}</p>
      <Button variant="soft" onClick={onRetry}>
        <RotateCw aria-hidden className="size-5" />
        {text.tryAgain}
      </Button>
    </div>
  );
}
