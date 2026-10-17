import type { PaymentMode } from "@/lib/orders/submit";
import type { RejectReason } from "@/lib/orders/state";
import type { Decision } from "@/lib/owner/approval";
import type { OwnerOrder } from "@/lib/owner/types";

// What the frozen order approval screen needs from the shop (customer voice ordering is out of
// the money app's navigation; its code stays as it was).

/** What the owner said about an order, and what was done about it. */
export type VoiceDecision = { heard: string; decision: Decision | null };

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
  /** The order spoken in the owner's language. */
  announcementUrl(order: OwnerOrder): string;
}
