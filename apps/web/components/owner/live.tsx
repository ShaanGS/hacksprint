"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SignedOutError } from "@/lib/owner/fetch";
import type { ChangedArea } from "@/lib/realtime";
import { createBrowserClient } from "@/lib/supabase/browser";

// Open screens fetch again when the shop's numbers change (spec section 13): the server says
// which area changed on shop:{id}, and a timer covers a venue Wi-Fi that drops the socket.
const FALLBACK_MS = 15_000;

type Listener = { areas: ChangedArea[]; refetch: () => void };

type Live = {
  listen: (listener: Listener) => () => void;
  /** Every refetch reports here, so the app can say when it is offline or signed out. */
  report: (outcome: "ok" | "offline" | "signed_out") => void;
};

const LiveContext = createContext<Live>({ listen: () => () => undefined, report: () => undefined });

export function LiveUpdates({
  shopId,
  onOffline,
  onSignedOut,
  children,
}: {
  shopId: string;
  onOffline: (offline: boolean) => void;
  onSignedOut: () => void;
  children: ReactNode;
}) {
  const listeners = useRef(new Set<Listener>());
  const handlers = useRef({ onOffline, onSignedOut });
  useEffect(() => {
    handlers.current = { onOffline, onSignedOut };
  });

  useEffect(() => {
    const refetch = (area?: ChangedArea) => {
      for (const listener of listeners.current) {
        if (!area || listener.areas.includes(area)) listener.refetch();
      }
    };
    const client = createBrowserClient();
    const channel = client
      ?.channel(`shop:${shopId}`)
      .on("broadcast", { event: "changed" }, ({ payload }) => refetch(payload?.area))
      .subscribe();
    const timer = setInterval(() => refetch(), FALLBACK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (client && channel) client.removeChannel(channel);
    };
  }, [shopId]);

  const [live] = useState<Live>(() => ({
    listen(listener) {
      listeners.current.add(listener);
      return () => listeners.current.delete(listener);
    },
    report(outcome) {
      if (outcome === "signed_out") handlers.current.onSignedOut();
      else handlers.current.onOffline(outcome === "offline");
    },
  }));
  return <LiveContext value={live}>{children}</LiveContext>;
}

/**
 * Data for one screen: fetched when it opens, again when its areas change, and on the timer. A
 * failed refetch keeps what was shown, so the screen never goes blank on a bad connection.
 */
export function useLive<T>(load: () => Promise<T>, areas: ChangedArea[]) {
  const live = useContext(LiveContext);
  const [state, setState] = useState<{ data: T | null; failed: boolean }>({
    data: null,
    failed: false,
  });
  const latest = useRef(load);
  const version = useRef(0);
  useEffect(() => {
    latest.current = load;
  });

  const refetch = useCallback(() => {
    const mine = ++version.current;
    latest.current().then(
      (data) => {
        if (mine === version.current) setState({ data, failed: false });
        live.report("ok");
      },
      (error: unknown) => {
        if (error instanceof SignedOutError) live.report("signed_out");
        else live.report("offline");
        if (mine === version.current) setState((current) => ({ ...current, failed: true }));
      },
    );
  }, [live]);

  const key = areas.join(" ");
  useEffect(() => {
    refetch();
    return live.listen({ areas: key.split(" ") as ChangedArea[], refetch });
  }, [key, live, refetch]);

  return { data: state.data, failed: state.failed, reload: refetch };
}
