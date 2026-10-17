import type { BillOutcome, ConfirmLine, ScannedBill } from "@/lib/bills/types";
import type { Product } from "@/lib/catalog";
import type { PaymentMode } from "@/lib/orders/submit";
import type { HomeNumbers, HomeSource, HomeSourceKind, PriceSource } from "@/lib/sources/types";
import type { RejectReason } from "@/lib/orders/state";
import type { Decision } from "@/lib/owner/approval";
import type { OwnerOrder } from "@/lib/owner/types";

// What the owner's screens need from the shop, so the same screens run on the real API
// (lib/owner/live.ts) and on sample data in the preview (lib/preview/owner-backend.ts).

/** What the owner said about an order, and what was done about it. */
export type VoiceDecision = { heard: string; decision: Decision | null };

/** The owner's PIN has expired or was never entered: the app goes back to the PIN screen. */
export class SignedOutError extends Error {
  constructor() {
    super("The owner is not signed in.");
    this.name = "SignedOutError";
  }
}

/** A request the shop refused, with its HTTP status, so a screen can say why in the owner's words. */
export class RequestError extends Error {
  readonly status: number;

  constructor(url: string, status: number) {
    super(`${url} failed: HTTP ${status}`);
    this.name = "RequestError";
    this.status = status;
  }
}

export interface OwnerBackend {
  /** Today's orders and any still open, as the shop has them now. */
  orders(): Promise<OwnerOrder[]>;
  /** Approves in the customer's chosen way, or on account when `mode` is "credit". */
  approve(order: OwnerOrder, mode?: PaymentMode): Promise<void>;
  reject(order: OwnerOrder, reason: RejectReason): Promise<void>;
  deliver(order: OwnerOrder): Promise<void>;
  /** Tries the payment link again when it could not be made at approval. */
  retryLink(order: OwnerOrder): Promise<void>;
  /** Sends what the owner said; the shop decides only on a word it knows. */
  decideByVoice(order: OwnerOrder, audio: Blob): Promise<VoiceDecision>;
  /** The order spoken in the owner's language, or null where there is no speech. */
  announcementUrl(order: OwnerOrder): string | null;
  /** Every product with its stock now. */
  stock(): Promise<Product[]>;
  /** Reads a photo of today's bill into lines for the owner to check (spec B1). */
  scanBill(photo: Blob): Promise<ScannedBill>;
  /** The owner's yes to a checked bill: stock, prices, payable and the delivery check. */
  confirmBill(bill: ScannedBill, distributorId: string, lines: ConfirmLine[]): Promise<BillOutcome>;
  /** Today's home numbers (spec E1). */
  home(): Promise<HomeNumbers>;
  /** The rows behind a home number (spec E3). */
  homeSource(kind: HomeSourceKind): Promise<HomeSource>;
  /** The bill line behind a product's price (spec E3). */
  priceSource(product: Product): Promise<PriceSource>;
}
