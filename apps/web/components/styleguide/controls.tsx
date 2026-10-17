"use client";

import { Bot, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

const purposes = ["Stock for the shop", "Equipment or repairs"] as const;

export function Controls() {
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>(purposes[0]);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button wide>
          <MessageCircle aria-hidden className="size-5" />
          Remind Arjun on WhatsApp
        </Button>
        <Button variant="yellow" wide>
          <Bot aria-hidden className="size-5" />
          Let the agent collect
        </Button>
        <Button variant="white" wide>
          Open the statement
        </Button>
        <div className="flex gap-3">
          <Button variant="soft">Not now</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="danger">Remove</Button>
        </div>
        <Button wide disabled>
          Send to Murugan Traders
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {purposes.map((name) => (
          <Chip key={name} on={name === purpose} onClick={() => setPurpose(name)}>
            {name}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="danger">9 days late</Badge>
        <Badge tone="warning">Running low</Badge>
        <Badge tone="success">Verified payment</Badge>
        <Badge>You said</Badge>
        <Badge tone="best">Festival order</Badge>
        <Badge tone="yellow">Agent</Badge>
      </div>
      <p className="flex items-baseline gap-2">
        <Amount paise={27400} />
        <Amount paise={25400} struck />
        <span className="text-sm text-ink-muted">a new price, and the one it replaces</span>
      </p>
    </div>
  );
}
