"use client";

import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Badge } from "@/components/ui/badge";
import type { SourceLabel } from "@/lib/rotation/labels";

/** Where a number came from (rule 5); a verified payment is money seen arriving, so it is green. */
export function SourceBadge({ label }: { label: SourceLabel }) {
  const { text } = useOwnerLanguage();
  return (
    <Badge tone={label === "verified_payment" ? "success" : "neutral"}>{text.labels[label]}</Badge>
  );
}
