import { useCallback, useEffect, useRef, useState } from "react";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import { SignedOutError, type OwnerBackend, type VoiceDecision } from "@/lib/owner/backend";
import type { OwnerOrder } from "@/lib/owner/types";

// The owner's orders, fetched every 2 seconds (spec section 13). A decision shows at once and
// the next fetch confirms it: a fetch that started before the owner acted is thrown away, so the
// screen never flicks back to the old state.
const POLL_MS = 2000;

type Events = {
  /** A new order came in since the last fetch. */
  onArrived: (order: OwnerOrder) => void;
  onSignedOut: () => void;
  onFailed: () => void;
};

export type OwnerOrders = {
  /** Null until the first fetch. */
  orders: OwnerOrder[] | null;
  offline: boolean;
  approve(order: OwnerOrder, mode?: PaymentMode): Promise<void>;
  reject(order: OwnerOrder, reason: RejectReason): Promise<void>;
  deliver(order: OwnerOrder): Promise<void>;
  retryLink(order: OwnerOrder): Promise<void>;
  decideByVoice(order: OwnerOrder, audio: Blob): Promise<VoiceDecision | null>;
};

export function useOwnerOrders(backend: OwnerBackend, events: Events): OwnerOrders {
  const [orders, setOrders] = useState<OwnerOrder[] | null>(null);
  const [offline, setOffline] = useState(false);
  const latest = useRef(events);
  const version = useRef(0);
  // Orders already on screen; null before the first fetch, so the opening list stays quiet.
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    latest.current = events;
  });

  const refresh = useCallback(async () => {
    const started = version.current;
    try {
      const next = await backend.orders();
      if (started !== version.current) return;
      setOffline(false);
      const waiting = next.filter((order) => order.status === "pending_approval");
      for (const order of waiting) {
        if (seen.current && !seen.current.has(order.id)) latest.current.onArrived(order);
      }
      seen.current = new Set([...(seen.current ?? []), ...waiting.map((order) => order.id)]);
      setOrders(next);
    } catch (error) {
      if (error instanceof SignedOutError) latest.current.onSignedOut();
      else setOffline(true);
    }
  }, [backend]);

  useEffect(() => {
    let inFlight = false;
    const tick = () => {
      if (inFlight) return;
      inFlight = true;
      refresh().finally(() => {
        inFlight = false;
      });
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  /** Shows the change at once, does the work, then fetches what the shop now has. */
  async function act<T>(
    order: OwnerOrder,
    change: Partial<OwnerOrder> | null,
    work: () => Promise<T>,
  ): Promise<T | null> {
    version.current += 1;
    if (change) {
      setOrders((current) =>
        current ? current.map((o) => (o.id === order.id ? { ...o, ...change } : o)) : current,
      );
    }
    let result: T | null = null;
    try {
      result = await work();
    } catch (error) {
      if (error instanceof SignedOutError) latest.current.onSignedOut();
      else latest.current.onFailed();
    }
    version.current += 1;
    await refresh();
    return result;
  }

  return {
    orders,
    offline,
    async approve(order, mode) {
      const paymentMode = mode ?? order.paymentMode;
      const status = paymentMode === "credit" ? "on_credit" : "awaiting_payment";
      await act(order, { paymentMode, status }, () => backend.approve(order, mode));
    },
    async reject(order, reason) {
      await act(order, { status: "rejected", rejectReason: reason }, () =>
        backend.reject(order, reason),
      );
    },
    async deliver(order) {
      await act(order, { status: "delivered" }, () => backend.deliver(order));
    },
    async retryLink(order) {
      await act(order, null, () => backend.retryLink(order));
    },
    decideByVoice(order, audio) {
      return act(order, null, () => backend.decideByVoice(order, audio));
    },
  };
}
