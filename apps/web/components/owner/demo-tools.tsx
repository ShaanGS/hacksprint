"use client";

import { AudioLines, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { post } from "@/lib/owner/fetch";

/**
 * Stage fallbacks while the shop runs on demo data (spec 16.3, 16.4): send a recorded entry when
 * the hall is too loud for the mic, and put the demo shop back as it was. Nothing here exists
 * outside DEMO_MODE.
 */
export function DemoTools({
  open,
  onClose,
  onRecording,
}: {
  open: boolean;
  onClose: () => void;
  onRecording: (audio: Blob) => void;
}) {
  const { text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const file = useRef<HTMLInputElement>(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      await post("/api/demo/reset", {});
      notify(text.demoReset);
      onClose();
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
      setSure(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={text.demoData}
      footer={
        <div className="space-y-2 pb-3">
          <Button wide onClick={() => file.current?.click()}>
            <AudioLines aria-hidden className="size-5" />
            {text.sendRecording}
          </Button>
          <Button
            wide
            variant={sure ? "danger" : "soft"}
            disabled={busy}
            onClick={() => (sure ? reset() : setSure(true))}
          >
            <RotateCcw aria-hidden className="size-5" />
            {sure ? text.resetSure : text.resetDemo}
          </Button>
        </div>
      }
    >
      <p className="text-base text-ink-muted">{text.demoToolsText}</p>
      <input
        ref={file}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const audio = event.target.files?.[0];
          event.target.value = "";
          if (!audio) return;
          onClose();
          onRecording(audio);
        }}
      />
    </Sheet>
  );
}
