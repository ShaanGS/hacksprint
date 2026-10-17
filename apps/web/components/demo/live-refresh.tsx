"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

// The judges' screen renders on the server; this asks for a fresh render when the shop's numbers
// change (spec section 13), and on a timer in case the venue Wi-Fi drops the socket.
const FALLBACK_MS = 15_000;

export function LiveRefresh({ shopId }: { shopId: string }) {
  const router = useRouter();
  useEffect(() => {
    const client = createBrowserClient();
    const channel = client
      ?.channel(`shop:${shopId}`)
      .on("broadcast", { event: "changed" }, () => router.refresh())
      .subscribe();
    const timer = setInterval(() => router.refresh(), FALLBACK_MS);
    return () => {
      clearInterval(timer);
      if (client && channel) client.removeChannel(channel);
    };
  }, [router, shopId]);
  return null;
}
