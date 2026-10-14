"use client";

import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { MicButton, type MicState } from "@/components/ui/mic-button";
import { Sheet } from "@/components/ui/sheet";

function ignore() {}

export function Voice() {
  const [mic, setMic] = useState<MicState>("idle");
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <div className="space-y-8">
      <MicButton
        state={mic}
        onHoldStart={() => setMic("listening")}
        onHoldEnd={() => setMic("idle")}
      />
      <div className="flex justify-around">
        <MicButton state="listening" onHoldStart={ignore} onHoldEnd={ignore} />
        <MicButton state="thinking" onHoldStart={ignore} onHoldEnd={ignore} />
      </div>
      <Card>
        <p lang="ta" className="text-lg font-medium">
          ரெண்டு Maggi, ஒரு butter, அரை கிலோ சர்க்கரை
        </p>
        <p className="mt-1 text-sm text-ink-muted">Two Maggi, one butter, half a kilo of sugar</p>
      </Card>
      <Button variant="soft" wide onClick={() => setSheetOpen(true)}>
        Open a sheet
      </Button>
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Sugar is finished"
        description="Pick something else, or skip it."
      >
        <ListRow
          art={<Art name="jaggery" />}
          title="Jaggery"
          meta="½ kg · ₹70 a kg"
          trailing={<Amount paise={3500} />}
          selected
        />
        <Button wide className="mt-4" onClick={() => setSheetOpen(false)}>
          Use jaggery
        </Button>
      </Sheet>
    </div>
  );
}
