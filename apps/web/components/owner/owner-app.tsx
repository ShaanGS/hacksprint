"use client";

import { Mic, WifiOff } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { BankTab } from "@/components/owner/bank-tab";
import { CollectTab } from "@/components/owner/collect-tab";
import { DemoTools } from "@/components/owner/demo-tools";
import { HomeTab } from "@/components/owner/home-tab";
import { LiveUpdates } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { OwnerScreenContext } from "@/components/owner/owner-screen";
import { StockTab } from "@/components/owner/stock-tab";
import { TabBar, type OwnerTab } from "@/components/owner/tab-bar";
import { Pill, TopNotices } from "@/components/owner/top-notices";
import { useHoldToTalk } from "@/components/owner/use-hold-to-talk";
import { useNotice } from "@/components/owner/use-notice";
import type { OwnerVoice } from "@/components/owner/use-owner-voice";
import { VoiceSheet } from "@/components/owner/voice-sheet";
import { HoldMic } from "@/components/ui/hold-mic";
import { ownerApi, type VoiceCard } from "@/lib/owner/api";

/**
 * The owner's app (spec section 7): where his money is, who to collect from, his stock and the
 * bank. The mic in the middle of the tab bar takes any of the four spoken entries from any tab.
 */
export function OwnerApp({
  shopId,
  demo,
  voice,
  onSignedOut,
}: {
  shopId: string;
  demo: boolean;
  voice: OwnerVoice;
  onSignedOut: () => void;
}) {
  const { text } = useOwnerLanguage();
  const [tab, setTab] = useState<OwnerTab>("home");
  const [notice, notify] = useNotice();
  const [offline, setOffline] = useState(false);
  const [card, setCard] = useState<VoiceCard | null>(null);
  const [tools, setTools] = useState(false);
  const [hearing, setHearing] = useState(false);
  const hold = useHoldToTalk({
    askMicrophone: voice.askMicrophone,
    onTooShort: () => notify(text.holdLonger),
    onMicBlocked: () => notify(text.micAllow),
  });

  /** A tap that asks for the microphone, so the phone shows its permission prompt. */
  async function turnOnMic() {
    notify((await voice.askMicrophone()) ? text.micReady : text.micAllow);
  }

  async function hear(audio: Blob) {
    setHearing(true);
    try {
      setCard(await ownerApi.hear(audio));
    } catch {
      notify(text.failed);
    } finally {
      setHearing(false);
    }
  }

  const screen = useMemo(
    () => ({ demo, notify, openDemoTools: () => setTools(true) }),
    [demo, notify],
  );
  const status =
    hold.mic === "listening"
      ? text.listening
      : hold.mic === "thinking" || hearing
        ? text.working
        : null;
  return (
    <OwnerScreenContext value={screen}>
      <LiveUpdates shopId={shopId} onOffline={setOffline} onSignedOut={onSignedOut}>
        <div className="relative h-full">
          <TopNotices>
            <AnimatePresence initial={false}>
              {!voice.micOn && (
                <Pill key="mic" icon={<Mic aria-hidden className="size-4" />} onClick={turnOnMic}>
                  {text.micTurnOn}
                </Pill>
              )}
              {offline && (
                <Pill key="offline" icon={<WifiOff aria-hidden className="size-4" />}>
                  {text.offline}
                </Pill>
              )}
              {status && <Pill key="status">{status}</Pill>}
              {notice && <Pill key="notice">{notice}</Pill>}
            </AnimatePresence>
          </TopNotices>

          {/* Keyed on the tab, so each tab opens at its top. */}
          <div key={tab} className="h-full overflow-y-auto">
            {tab === "home" && <HomeTab onCollect={() => setTab("collect")} />}
            {tab === "collect" && <CollectTab />}
            {tab === "stock" && <StockTab onBank={() => setTab("bank")} />}
            {tab === "bank" && <BankTab onCollect={() => setTab("collect")} />}
          </div>

          <TabBar
            tab={tab}
            onChange={setTab}
            mic={
              <HoldMic
                size="md"
                state={hold.mic}
                label={status ?? text.holdAndSpeak}
                onHoldStart={hold.holdStarted}
                onHoldEnd={() => hold.holdEnded(hear)}
              />
            }
          />

          <VoiceSheet
            key={card?.entry_id ?? card?.transcript ?? "none"}
            card={card}
            onDone={() => setCard(null)}
          />
          {demo && <DemoTools open={tools} onClose={() => setTools(false)} onRecording={hear} />}
        </div>
      </LiveUpdates>
    </OwnerScreenContext>
  );
}
