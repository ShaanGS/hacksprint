import type { CustomerBackend, OrderView, TurnResult } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
import type { Cart } from "@/lib/orders/cart";

// The customer screens on the real API (spec section 9). Every call is a plain fetch; the
// server keeps the cart, the conversation and the session cookie.

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Reads the voice turn's two lines: the words heard, then the shop's answer. */
async function readVoiceTurn(
  response: Response,
  onHeard: (text: string) => void,
): Promise<TurnResult | null> {
  if (!response.ok || !response.body) throw new Error(`Voice turn failed: HTTP ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = "";
  let result: TurnResult | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffered += value;
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines.filter(Boolean)) {
      const event = JSON.parse(line) as { type: string; text?: string } & Partial<TurnResult>;
      if (event.type === "heard") onHeard(event.text ?? "");
      if (event.type === "error") throw new Error("The shop could not answer that turn.");
      if (event.type === "result") result = event as unknown as TurnResult;
    }
  }
  return result;
}

/** `opening` is what the session call returned: the greeting and the cart so far. */
export function liveCustomer(lang: Lang, opening: TurnResult): CustomerBackend {
  let payUrl: string | null = null;
  return {
    async start() {
      return opening;
    },

    async speak(audio, onHeard) {
      if (!audio) return null;
      const form = new FormData();
      form.append("lang", lang);
      form.append("audio", audio, "turn");
      const response = await fetch("/api/voice/turn", { method: "POST", body: form });
      return readVoiceTurn(response, onHeard);
    },

    say(text) {
      return post<TurnResult>("/api/voice/turn", { lang, text });
    },

    choose(turnId, index) {
      return post<TurnResult>("/api/voice/turn", { lang, choice: { turnId, index } });
    },

    async setQuantity(code, qty) {
      return (await post<{ cart: Cart }>("/api/cart/items", { code, qty })).cart;
    },

    send(mode) {
      return post<{ number: number }>("/api/cart/send", { paymentMode: mode });
    },

    async order(number) {
      const response = await fetch(`/api/customer/orders/${number}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Order ${number} failed: HTTP ${response.status}`);
      const view = (await response.json()) as OrderView;
      payUrl = view.payUrl;
      return view;
    },

    async pay() {
      // Opened before any await, inside the tap, so the phone does not block the new tab.
      if (payUrl) window.open(payUrl, "_blank", "noopener");
    },

    audioUrl(turnId) {
      return `/api/voice/audio/${turnId}`;
    },
  };
}

/** Starts or resumes the customer's session; the server sets the signed cookie. */
export function startSession(details: { name: string; phone: string; lang: Lang }) {
  return post<TurnResult>("/api/customer/session", details);
}
