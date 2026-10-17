import type { Cart } from "@/lib/orders/cart";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import type { VoiceTurn } from "@/lib/voice/turns";

// What the customer screens need from the shop. The screens never fetch on their own, so the
// same screens run on the live API or, before any keys exist, on the preview's sample data.

/**
 * New turns to show, and the cart after them. `review` opens the order review; `sent` is the
 * order's number once a spoken "send it" has sent it.
 */
export type TurnResult = { turns: VoiceTurn[]; cart: Cart; review: boolean; sent?: number };

export type SubmittedStatus =
  "pending_approval" | "rejected" | "awaiting_payment" | "paid" | "on_credit" | "delivered";

export type OrderView = {
  number: number;
  status: SubmittedStatus;
  paymentMode: PaymentMode;
  itemCount: number;
  /** Pictures of up to three things in the order. */
  arts: string[];
  totalPaise: number;
  rejectReason: RejectReason | null;
  /** What the customer owes the shop once this order is on their account. */
  balancePaise: number | null;
  /** True between paying and the shop seeing the payment. */
  confirming: boolean;
  /** Where to pay, once the shop has approved a link order. */
  payUrl: string | null;
};

export type CustomerBackend = {
  /** The shop's greeting, or the conversation so far. */
  start(): Promise<TurnResult>;
  /** Speech to text; empty when nothing was heard. */
  transcribe(audio: Blob | null): Promise<string>;
  say(text: string, source: "voice" | "typed"): Promise<TurnResult>;
  /** A tapped answer to the shop's question. */
  choose(turnId: number, index: number): Promise<TurnResult>;
  setQuantity(code: string, qty: number): Promise<TurnResult["cart"]>;
  send(mode: PaymentMode): Promise<{ number: number }>;
  order(number: number): Promise<OrderView>;
  pay(number: number): Promise<void>;
  /** Where the shop's spoken reply is, or null when there is no audio. */
  audioUrl(turnId: number): string | null;
};
