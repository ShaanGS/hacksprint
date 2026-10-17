import type { OwnerBackend, VoiceDecision } from "@/lib/owner/backend";
import { call, post, upload } from "@/lib/owner/fetch";
import type { OwnerOrder } from "@/lib/owner/types";

// The frozen order approval screen on the real API.

export const liveOwner: OwnerBackend = {
  async orders() {
    return (await call<{ orders: OwnerOrder[] }>("/api/orders")).orders;
  },
  async approve(order, mode) {
    await post(`/api/orders/${order.id}/approve`, mode ? { payment_mode: mode } : {});
  },
  async reject(order, reason) {
    await post(`/api/orders/${order.id}/reject`, { reason });
  },
  async deliver(order) {
    await post(`/api/orders/${order.id}/deliver`, {});
  },
  async retryLink(order) {
    await post(`/api/orders/${order.id}/payment-link`, {});
  },
  decideByVoice(order, audio) {
    const name = audio.type.includes("mp4") ? "owner.mp4" : "owner.webm";
    return upload<VoiceDecision>(`/api/orders/${order.id}/voice-approve`, "audio", audio, name);
  },
  announcementUrl(order) {
    return `/api/orders/${order.id}/announce`;
  },
};

export type PinResult = "ok" | "wrong" | "locked" | "offline";

/** Signs this phone in with the shop PIN. */
export async function signIn(pin: string): Promise<PinResult> {
  const response = await fetch("/api/owner/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  }).catch(() => null);
  if (!response) return "offline";
  if (response.ok) return "ok";
  if (response.status === 429) return "locked";
  if (response.status === 401) return "wrong";
  return "offline";
}
