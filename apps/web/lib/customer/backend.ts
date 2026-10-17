import type { Cart } from "@/lib/orders/cart";
import type { RejectReason } from "@/lib/orders/state";
import type { PaymentMode } from "@/lib/orders/submit";
import type { PriceSource } from "@/lib/sources/types";
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
  /**
   * A spoken turn. `onHeard` gets the customer's words the moment they are heard, before the
   * shop answers; the result is null when nothing was heard.
   */
  speak(audio: Blob | null, onHeard: (text: string) => void): Promise<TurnResult | null>;
  /** A typed turn. */
  say(text: string): Promise<TurnResult>;
  /** A tapped answer to the shop's question. */
  choose(turnId: number, index: number): Promise<TurnResult>;
  setQuantity(code: string, qty: number): Promise<TurnResult["cart"]>;
  send(mode: PaymentMode): Promise<{ number: number }>;
  order(number: number): Promise<OrderView>;
  pay(number: number): Promise<void>;
  /** Where the shop's spoken reply is, or null when there is no audio. */
  audioUrl(turnId: number): string | null;
  /**
   * The bill behind each price in the order (guardrail 6): MRPs and bills, never the shop's costs.
   */
  priceSources(): Promise<PriceSource[]>;
};
