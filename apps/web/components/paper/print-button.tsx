"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The browser prints the page, or saves it as a PDF (spec 16.2: no server PDF library). */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="soft" onClick={() => window.print()}>
      <Printer aria-hidden className="size-5" />
      {label}
    </Button>
  );
}
