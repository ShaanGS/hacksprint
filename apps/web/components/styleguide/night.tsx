"use client";

import { Bot, Mic } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { HoldMic, type MicState } from "@/components/ui/hold-mic";
import { Orb } from "@/components/ui/orb";
import { Sheet } from "@/components/ui/sheet";
import { Steps } from "@/components/ui/steps";

const filters = ["This week", "Late payers", "Stock"] as const;

/** The voice and agent layer: indigo, yellow, the orb. */
export function Night() {
  const [mic, setMic] = useState<MicState>("idle");
  const [filter, setFilter] = useState<(typeof filters)[number]>(filters[0]);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6 rounded-3xl bg-night p-5 text-night-ink">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo px-5 text-sm font-semibold">
          <Mic aria-hidden className="size-4" />
          Voice
        </span>
        <p className="mt-2 text-sm text-night-muted">I&apos;m listening…</p>
        <Orb size={200} active={mic !== "idle"} />
        <p lang="ta" className="text-2xl leading-snug font-semibold">
          ரமேஷ் இருநூறு ரூபாய் கடன்
        </p>
        <div className="mt-2">
          <HoldMic
            state={mic}
            label="Hold to talk"
            onHoldStart={() => setMic("listening")}
            onHoldEnd={() => setMic("idle")}
          />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((name) => (
          <Chip key={name} tone="night" on={name === filter} onClick={() => setFilter(name)}>
            {name}
          </Chip>
        ))}
      </div>
      <Steps
        tone="night"
        steps={[
          { title: "Found who is late", meta: "3 late payers owe ₹9,600", state: "done" },
          { title: "Wrote each reminder", meta: "3 of 3, each in their language", state: "done" },
          { title: "Send from your WhatsApp", meta: "Tap Send for each", state: "current" },
          { title: "Watching for payments", state: "todo" },
        ]}
      />
      <Card tone="night">
        <p className="text-base font-semibold">Arjun Reddy</p>
        <p className="text-sm text-night-muted">₹4,200 · Kannada</p>
      </Card>
      <Button variant="yellow" wide onClick={() => setOpen(true)}>
        <Bot aria-hidden className="size-5" />
        Open a night sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        tone="night"
        title="Collecting for you"
        footer={
          <div className="pb-3">
            <Button variant="night" wide onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <Steps
          tone="night"
          steps={[{ title: "Found who is late", meta: "3 late payers owe ₹9,600", state: "done" }]}
        />
      </Sheet>
    </div>
  );
}
