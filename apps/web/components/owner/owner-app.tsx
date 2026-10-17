"use client";

import { Volume2, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { BillScan } from "@/components/owner/bill-scan";
import { CreditTab } from "@/components/owner/credit-tab";
import { OrdersTab } from "@/components/owner/orders-tab";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { StockTab } from "@/components/owner/stock-tab";
import { TabBar, type OwnerTab } from "@/components/owner/tab-bar";
import { TodayTab } from "@/components/owner/today-tab";
import { useHoldToDecide } from "@/components/owner/use-hold-to-decide";
import { useNotice } from "@/components/owner/use-notice";
import { useOwnerOrders } from "@/components/owner/use-owner-orders";
import { useStock } from "@/components/owner/use-stock";
import type { OwnerVoice } from "@/components/owner/use-owner-voice";
import { useWakeLock } from "@/components/owner/use-wake-lock";
import { Art } from "@/components/ui/art";
import { snappy } from "@/lib/motion";
import type { OwnerBackend, VoiceDecision } from "@/lib/owner/backend";
import { reportSentence } from "@/lib/owner/report";
import { isLow, reorderList } from "@/lib/owner/stock";
import { takings } from "@/lib/owner/summary";
import { previewProducts, previewShop } from "@/lib/preview/data";
import { creditRows, daySummary } from "@/lib/preview/owner";
import { previewRecorder } from "@/lib/preview/owner-backend";

// The live app has Orders and Stock until credit and the home numbers have their API (spec
// section 11, steps 4 and 5); the preview shows every tab on sample data.
const LIVE_TABS: OwnerTab[] = ["orders", "stock"];
const PREVIEW_TABS: OwnerTab[] = ["orders", "stock", "credit", "today"];

/** The owner's app: today's orders first, then stock, credit and the day's numbers. */
export function OwnerApp({
  live,
  backend,
  ownerName,
  voice,
  onSignedOut,
}: {
  live: boolean;
  backend: OwnerBackend;
  ownerName: string;
  voice: OwnerVoice;
  onSignedOut: () => void;
}) {
  const { text } = useOwnerLanguage();
  const [tab, setTab] = useState<OwnerTab>("orders");
  const [notice, notify] = useNotice();
  const shop = useOwnerOrders(backend, {
    onArrived: (order) => voice.announce(backend.announcementUrl(order)),
    onSignedOut,
    onFailed: () => notify(text.failed),
  });
  const hold = useHoldToDecide({
    askMicrophone: live ? voice.askMicrophone : async () => previewRecorder,
    decide: shop.decideByVoice,
    onTooShort: () => notify(text.holdToSay),
    onMicBlocked: () => notify(text.micBlocked),
    onResult: (result) => notify(heardLine(result)),
  });
  const stock = useStock(backend, tab === "stock");
  useWakeLock(live);

  function heardLine({ heard, decision }: VoiceDecision): string {
    if (!heard) return text.notUnderstood;
    return `${text.heard(heard)} · ${decision ? text.decided[decision] : text.notUnderstood}`;
  }

  const tabs = live ? LIVE_TABS : PREVIEW_TABS;
  const orders = shop.orders ?? [];
  const waiting = orders.filter((order) => order.status === "pending_approval").length;
  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center gap-2 px-4 pt-3">
        <AnimatePresence initial={false}>
          {live && !voice.soundOn && (
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
      </div>

      {/* Keyed on the tab, so each tab opens at its top. */}
      <div key={tab} className="h-full overflow-y-auto">
        {tab === "orders" &&
          (shop.orders ? (
            <OrdersTab
              ownerName={ownerName}
              orders={orders}
              takings={takings(orders)}
              mic={hold.mic}
              onHoldStart={hold.holdStarted}
              onHoldEnd={hold.holdEnded}
              onApprove={shop.approve}
              onReject={shop.reject}
              onDeliver={shop.deliver}
              onRetryLink={shop.retryLink}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <Art name="clock" size={120} eager />
            </div>
          ))}
        {tab === "stock" &&
          (stock.products ? (
            <StockTab
              products={stock.products}
              bill={<BillScan backend={backend} products={stock.products} onAdded={stock.reload} />}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <Art name="crate" size={120} eager />
            </div>
          ))}
        {tab === "credit" && <CreditTab rows={creditRows(orders)} />}
        {tab === "today" && (
          <TodayTab
            distributorName={previewShop.distributorName}
            summary={daySummary(orders)}
            report={reportSentence(
              daySummary(orders),
              previewProducts.filter(isLow).map((product) => product.name),
            )}
            reorder={reorderList(previewProducts)}
          />
        )}
      </div>
      {tabs.length > 1 && <TabBar tabs={tabs} tab={tab} onChange={setTab} waiting={waiting} />}
    </div>
  );
}

/** A message floating at the top of the screen; with onClick it is a button. */
function Pill({
  icon,
  onClick,
  children,
}: {
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const style =
    "pointer-events-auto flex min-h-11 max-w-full items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface shadow-float";
  return (
    <motion.div
      layout
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -12, opacity: 0 }}
      transition={snappy}
      role={onClick ? undefined : "status"}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={style}>
          {icon}
          {children}
        </button>
      ) : (
        <p className={style}>
          {icon}
          {children}
        </p>
      )}
    </motion.div>
  );
}
