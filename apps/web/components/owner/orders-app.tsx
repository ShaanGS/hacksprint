"use client";

import { Volume2, WifiOff } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { OrdersTab } from "@/components/owner/orders-tab";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Pill, TopNotices } from "@/components/owner/top-notices";
import { useHoldToTalk } from "@/components/owner/use-hold-to-talk";
import { useNotice } from "@/components/owner/use-notice";
import { useOwnerOrders } from "@/components/owner/use-owner-orders";
import type { OwnerVoice } from "@/components/owner/use-owner-voice";
import { useWakeLock } from "@/components/owner/use-wake-lock";
import { Art } from "@/components/ui/art";
import type { VoiceDecision } from "@/lib/owner/backend";
import { liveOwner } from "@/lib/owner/live";
import { takings } from "@/lib/owner/summary";

/**
 * Order approval for customer voice ordering. Frozen (spec, "Frozen or cut"): it is kept working
 * at /owner/orders but is not linked from the owner app.
 */
export function OrdersApp({
  ownerName,
  voice,
  onSignedOut,
}: {
  ownerName: string;
  voice: OwnerVoice;
  onSignedOut: () => void;
}) {
  const { text } = useOwnerLanguage();
  const [notice, notify] = useNotice();
  const shop = useOwnerOrders(liveOwner, {
    onArrived: (order) => voice.announce(liveOwner.announcementUrl(order)),
    onSignedOut,
    onFailed: () => notify(text.failed),
  });
  const hold = useHoldToTalk({
    askMicrophone: voice.askMicrophone,
    onTooShort: () => notify(text.holdToSay),
    onMicBlocked: () => notify(text.micBlocked),
  });
  useWakeLock(true);

  function heardLine({ heard, decision }: VoiceDecision): string {
    if (!heard) return text.notUnderstood;
    return `${text.heard(heard)} · ${decision ? text.decided[decision] : text.notUnderstood}`;
  }

  const orders = shop.orders ?? [];
  return (
    <div className="relative h-full">
      <TopNotices>
        <AnimatePresence initial={false}>
          {!voice.soundOn && (
            <Pill
              key="sound"
              icon={<Volume2 aria-hidden className="size-4" />}
              onClick={() => {
                voice.unlockSound();
                voice.askMicrophone();
              }}
            >
              {text.soundOff}
            </Pill>
          )}
          {shop.offline && (
            <Pill key="offline" icon={<WifiOff aria-hidden className="size-4" />}>
              {text.offline}
            </Pill>
          )}
          {notice && <Pill key="notice">{notice}</Pill>}
        </AnimatePresence>
      </TopNotices>
      <div className="h-full overflow-y-auto">
        {shop.orders ? (
          <OrdersTab
            ownerName={ownerName}
            orders={orders}
            takings={takings(orders)}
            mic={hold.mic}
            onHoldStart={hold.holdStarted}
            onHoldEnd={(order) =>
              hold.holdEnded(async (audio) => {
                const result = await shop.decideByVoice(order, audio);
                if (result) notify(heardLine(result));
              })
            }
            onApprove={shop.approve}
            onReject={shop.reject}
            onDeliver={shop.deliver}
            onRetryLink={shop.retryLink}
          />
        ) : (
          <div className="grid h-full place-items-center">
            <Art name="clock" size={120} eager />
          </div>
        )}
      </div>
    </div>
  );
}
