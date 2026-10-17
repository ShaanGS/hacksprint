import type { BillOutcome, ScannedBill } from "@/lib/bills/types";
import type { Product } from "@/lib/catalog";
import type { CreditBook, CreditDraft, CreditEntry } from "@/lib/credit/types";
import {
  RequestError,
  SignedOutError,
  type OwnerBackend,
  type VoiceDecision,
} from "@/lib/owner/backend";
import type { OwnerOrder } from "@/lib/owner/types";
import type { HomeNumbers, HomeSource, PriceSource } from "@/lib/sources/types";

// The owner's screens on the real API (spec section 9). The session is an httpOnly cookie set
// by the PIN, so every call is a plain fetch; a 401 sends the owner back to the PIN screen.

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (response.status === 401) throw new SignedOutError();
  if (!response.ok) throw new RequestError(url, response.status);
  return (await response.json()) as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return call<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
  async decideByVoice(order, audio) {
    const form = new FormData();
    form.append("audio", audio, audio.type.includes("mp4") ? "owner.mp4" : "owner.webm");
    return call<VoiceDecision>(`/api/orders/${order.id}/voice-approve`, {
      method: "POST",
      body: form,
    });
  },
  announcementUrl(order) {
    return `/api/orders/${order.id}/announce`;
  },
  async stock() {
    return (await call<{ products: Product[] }>("/api/stock")).products;
  },
  scanBill(photo) {
    const form = new FormData();
    form.append("photo", photo, "bill.jpg");
    return call<ScannedBill>("/api/bills", { method: "POST", body: form });
  },
  confirmBill(bill, distributorId, lines) {
    return post<BillOutcome>(`/api/bills/${bill.id}/confirm`, {
      distributor_id: distributorId,
      lines: lines.map((line) => ({
        product_id: line.productId,
        qty: line.qty,
        unit_cost_paise: line.unitCostPaise,
        mrp_paise: line.mrpPaise,
      })),
    });
  },
  home() {
    return call<HomeNumbers>("/api/home");
  },
  homeSource(kind) {
    return call<HomeSource>(`/api/sources/home/${kind}`);
  },
  priceSource(product) {
    return call<PriceSource>(`/api/sources/price/${product.id}`);
  },
  credit() {
    return call<CreditBook>("/api/credit");
  },
  creditEntries(customerId) {
    return call<CreditEntry[]>(`/api/sources/credit/${customerId}`);
  },
  hearCredit(audio) {
    const form = new FormData();
    form.append("audio", audio, audio.type.includes("mp4") ? "credit.mp4" : "credit.webm");
    return call<CreditDraft>("/api/credit/spoken", { method: "POST", body: form });
  },
  async addCredit(customerId, amountPaise, heard) {
    await post("/api/credit", { customer_id: customerId, amount_paise: amountPaise, heard });
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
