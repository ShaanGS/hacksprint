"use client";

import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

const filters = ["Waiting", "Paid", "On credit"] as const;

export function Controls() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Waiting");
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button wide>Approve ₹121 order</Button>
        <Button variant="soft" wide>
          Reject
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost">Not now</Button>
          <Button variant="danger">Remove item</Button>
        </div>
        <Button wide disabled>
          Approve ₹121 order
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((name) => (
          <Chip key={name} on={name === filter} onClick={() => setFilter(name)}>
            {name}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="best">Instead of sugar</Badge>
        <Badge tone="success">Paid</Badge>
        <Badge tone="danger">Out of stock</Badge>
        <Badge>On credit</Badge>
      </div>
      <p className="flex items-baseline gap-2">
        <Amount paise={16500} />
        <Amount paise={17000} struck />
        <span className="text-sm text-ink-muted">a price, and the price it replaces</span>
      </p>
    </div>
  );
}
