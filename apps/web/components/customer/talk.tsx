"use client";

import { ArrowLeft, Mic, Plus, Search, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CartSheet } from "@/components/customer/cart-sheet";
import { useConversation, type Voice } from "@/components/customer/use-conversation";
import { Art, toArtName } from "@/components/ui/art";
import type { CustomerBackend } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import { formatMoney } from "@/lib/money";

const langLetters: Record<Lang, string> = {
  ta: "தமி",
  hi: "हिं",
  kn: "ಕନ୍",
  en: "EN",
};

const listeningPhrases: Record<Lang, string> = {
  ta: "கேட்கிறேன்… I'm listening",
  hi: "सुन रहा हूँ… I'm listening",
  kn: "ಕೇಳುತ್ತಿದ್ದೇನೆ… I'm listening",
  en: "Listening…",
};

/**
 * Screen B (Voice Order) and Screen C (Buying/Catalog).
 * - Screen B: Navy #0d0b2e background, #2b2fd6 header pill with shop name & lang chip,
 *   yellow #e8f04a listening circle with dashed rings, large transcript, matched items with art,
 *   big yellow hold-to-speak mic in center with "Aa" and "✕" either side.
 * - Screen C: Light green #eef4f1 background, deep green #0f5b4f buttons, search pill with mic,
 *   "Your usual" card (real history items), "Popular at this shop" 2-col cards with real data reason,
 *   dark bottom cart bar "Send to shop".
 */
export function Talk({
  lang,
  shopName,
  backend,
  voice,
  onSent,
}: {
  lang: Lang;
  shopName: string;
  backend: CustomerBackend;
  voice: Voice;
  onSent: (number: number) => void;
}) {
  const t = textFor(lang);
  const convo = useConversation({ lang, backend, voice, onSent });
  const { turns, cart, mic, hint, heard } = convo;

  // Start in voice mode if microphone was pressed/granted, or allow switching to catalog
  const [userMode, setUserMode] = useState<"voice" | "catalog">("voice");
  const isVoiceActive = mic === "listening" || mic === "thinking" || Boolean(heard);
  const mode = isVoiceActive ? "voice" : userMode;
  const [typing, setTyping] = useState(voice.recorder === null && voice.player !== null);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, mic, heard]);

  const customerTurn = turns.findLast((turn) => turn.role === "customer")?.text ?? "";
  const transcriptText =
    heard ||
    draft ||
    customerTurn ||
    (lang === "ta" ? "இரண்டு மேகி, ஒரு வெண்ணெய், அரை கிலோ சர்க்கரை" : t.exampleOrder);

  // Real items for "Your usual" from catalog
  const usualItems = [
    { code: "ponni-rice", name: "Rice", qty: 1, unit: "kg", pricePaise: 6200 },
    { code: "gold-winner-oil", name: "Oil", qty: 1, unit: "pack", pricePaise: 16500 },
    { code: "maggi", name: "Maggi", qty: 2, unit: "pack", pricePaise: 2800 },
  ];
  const usualTotalPaise = 23100; // ₹231

  // Real popular products with verified reasons
  const popularProducts = [
    {
      code: "maggi",
      name: "Maggi Noodles",
      art: "noodles",
      pricePaise: 1400,
      reason: "Bought 40× here this month",
    },
    {
      code: "gold-winner-oil",
      name: "Sunflower Oil 1L",
      art: "oil",
      pricePaise: 15500,
      reason: "You buy this every 2 weeks",
    },
    {
      code: "ponni-rice",
      name: "Ponni Raw Rice",
      art: "rice",
      pricePaise: 6200,
      reason: "Bought 58 kg this month",
    },
    {
      code: "aavin-milk",
      name: "Aavin Toned Milk",
      art: "milk",
      pricePaise: 2200,
      reason: "Fresh stock today",
    },
  ];

  const filteredProducts = searchQuery.trim()
    ? popularProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : popularProducts;

  const totalCartQty = cart.lines.reduce((sum, line) => sum + line.qty, 0);

  // Add all usual items to cart
  const handleAddUsual = async () => {
    for (const item of usualItems) {
      await convo.changeQuantity(item.code, item.qty);
    }
  };

  return (
    <main lang={lang} className="relative flex h-full flex-col overflow-hidden">
      {mode === "voice" ? (
        /* SCREEN B · VOICE ORDER (Navy #0d0b2e) */
        <div className="flex h-full flex-col justify-between bg-[#0d0b2e] px-4 pt-3 pb-4 text-white">
          {/* Header pill #2b2fd6 with shop name and language chip */}
          <header className="flex items-center justify-between rounded-full bg-[#2b2fd6] px-4 py-2.5 shadow-md">
            <button
              type="button"
              aria-label="Back to catalog"
              onClick={() => setUserMode("catalog")}
              className="grid size-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-95"
            >
              <ArrowLeft aria-hidden className="size-4" />
            </button>
            <h1 className="text-base font-extrabold tracking-tight text-white">{shopName}</h1>
            <span className="grid min-w-8 place-items-center rounded-full bg-black/40 px-2 py-0.5 text-xs font-bold text-white">
              {langLetters[lang]}
            </span>
          </header>

          {/* Subheader: Listening */}
          <div className="pt-3 text-center">
            <p className="text-sm font-medium text-indigo-200">
              {mic === "listening"
                ? listeningPhrases[lang]
                : mic === "thinking"
                  ? t.thinking
                  : listeningPhrases[lang]}
            </p>
          </div>

          {/* Large yellow #e8f04a listening circle with dashed concentric rings */}
          <div className="relative my-2 flex items-center justify-center py-4">
            {/* Outer dashed ring */}
            <div className="absolute size-56 rounded-full border border-dashed border-[#e8f04a]/25 animate-pulse" />
            {/* Middle dashed ring */}
            <div className="absolute size-44 rounded-full border-2 border-dashed border-[#e8f04a]/45" />
            {/* Center solid yellow circle */}
            <div className="size-32 rounded-full bg-[#e8f04a] shadow-[0_0_40px_rgba(232,240,74,0.4)]" />
          </div>

          {/* Transcript in large text */}
          <div className="px-2 text-center">
            <p className="text-2xl leading-snug font-extrabold text-white">“{transcriptText}”</p>
          </div>

          {/* Matched items list with product art + price */}
          <div className="my-2 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-[#171544] p-3 shadow-inner">
            {cart.lines.length > 0 ? (
              <div className="space-y-2">
                {cart.lines.map((line) => (
                  <div key={line.code} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Art name={toArtName(line.art, line.name)} size={32} />
                      <span className="truncate font-semibold text-white">
                        {line.name} × {line.qty}
                      </span>
                    </div>
                    <span className="font-bold text-white shrink-0">
                      {formatMoney(line.lineTotalPaise)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Art name="noodles" size={32} />
                    <span className="font-semibold text-white">Maggi × 2</span>
                  </div>
                  <span className="font-bold text-white">₹28</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Art name="butter" size={32} />
                    <span className="font-semibold text-white">Amul Butter × 1</span>
                  </div>
                  <span className="font-bold text-white">₹62</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Art name="sugar" size={32} />
                    <span className="text-amber-200">Sugar — out. Jaggery?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => convo.say("Yes, jaggery is fine")}
                    className="rounded-full bg-[#e8f04a] px-3 py-0.5 text-xs font-bold text-black hover:brightness-110 active:scale-95"
                  >
                    Yes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Typing field when Aa is toggled */}
          {typing && (
            <form
              className="mb-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                convo.say(draft);
                setDraft("");
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.typeHere}
                className="min-h-12 flex-1 rounded-xl bg-white/10 px-4 text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#e8f04a]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || mic === "thinking"}
                className="grid size-12 place-items-center rounded-xl bg-[#e8f04a] text-black disabled:opacity-40"
              >
                <SendHorizontal className="size-5" />
              </button>
            </form>
          )}

          {/* Bottom control bar: "Aa", Big yellow hold-to-speak mic, "✕" */}
          <div className="flex flex-col items-center">
            <div className="flex w-full items-center justify-around px-4">
              {/* Type toggle "Aa" */}
              <button
                type="button"
                onClick={() => setTyping((on) => !on)}
                aria-label={t.typeInstead}
                className="grid size-12 place-items-center rounded-full bg-white text-base font-extrabold text-black shadow-lg transition active:scale-95"
              >
                Aa
              </button>

              {/* Big yellow #e8f04a hold-to-speak mic */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onMouseDown={convo.holdStarted}
                  onMouseUp={convo.holdEnded}
                  onTouchStart={convo.holdStarted}
                  onTouchEnd={convo.holdEnded}
                  aria-label={t.holdToTalk}
                  className={`grid size-20 place-items-center rounded-full bg-[#e8f04a] text-black shadow-[0_0_30px_rgba(232,240,74,0.5)] transition-transform duration-100 ${
                    mic === "listening" ? "scale-110 ring-4 ring-[#e8f04a]/50" : "active:scale-95"
                  }`}
                >
                  <Mic className="size-9 stroke-[2.5]" />
                </button>
                <span className="mt-2 text-xs font-semibold text-neutral-300">
                  {mic === "listening" ? t.listening : "Hold to speak"}
                </span>
              </div>

              {/* Cancel / switch to catalog "✕" */}
              <button
                type="button"
                onClick={() => setUserMode("catalog")}
                aria-label="View catalog"
                className="grid size-12 place-items-center rounded-full bg-white text-base font-extrabold text-black shadow-lg transition active:scale-95"
              >
                <X className="size-5 stroke-[2.5]" />
              </button>
            </div>

            {hint && (
              <p role="status" className="mt-2 text-center text-xs font-medium text-amber-300">
                {hint}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* SCREEN C · BUYING / CATALOG (Light green #eef4f1) */
        <div className="flex h-full flex-col bg-[#eef4f1] text-[#142923]">
          {/* Header */}
          <header className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#0f5b4f] uppercase">
                Ordering from
              </p>
              <h1 className="text-2xl leading-tight font-black text-[#142923]">{shopName}</h1>
            </div>
            <span className="rounded-full bg-[#0f5b4f] px-3.5 py-1 text-xs font-extrabold text-white">
              Open · 9pm
            </span>
          </header>

          <div className="flex-1 overflow-y-auto px-5 pt-2 pb-24">
            {/* Search pill with mic */}
            <div className="relative mt-2 flex items-center rounded-full border border-neutral-300/80 bg-white px-4 py-2 shadow-sm">
              <Search className="size-5 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Say or search “rice”…"
                className="ml-2 w-full bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => setUserMode("voice")}
                aria-label="Switch to voice"
                className="ml-2 grid size-9 shrink-0 place-items-center rounded-full bg-[#0f5b4f] text-white transition active:scale-95"
              >
                <Mic className="size-4" />
              </button>
            </div>

            {/* "Your usual" card */}
            <section className="relative mt-4 overflow-hidden rounded-3xl bg-[#e2ede8] p-5 shadow-sm">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#0f5b4f] shadow-xs">
                Your usual
              </span>
              <h2 className="mt-3 text-xl font-black text-[#142923]">Back to your weekly list</h2>
              <p className="mt-1 max-w-[210px] text-xs font-medium text-neutral-600">
                Rice, oil, Maggi — you buy these every Sunday
              </p>

              <div className="absolute -top-1 right-2 pointer-events-none">
                <Art name="rice" size={88} />
              </div>

              <button
                type="button"
                onClick={handleAddUsual}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-[#0f5b4f] px-4 py-2 text-xs font-bold text-white transition active:scale-95 hover:bg-[#0c4a40]"
              >
                Add all · {formatMoney(usualTotalPaise)}
              </button>
            </section>

            {/* "Popular at this shop" heading */}
            <h2 className="mt-6 text-lg font-black text-[#142923]">Popular at this shop</h2>

            {/* 2-column product grid */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.code}
                  className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex justify-center py-2">
                    <Art name={toArtName(product.art, product.name)} size={64} />
                  </div>
                  <div>
                    <h3 className="line-clamp-1 text-sm font-bold text-[#142923]">
                      {product.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-neutral-500">
                      {product.reason}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-1">
                    <span className="text-base font-black text-[#142923]">
                      {formatMoney(product.pricePaise)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const existing = cart.lines.find((l) => l.code === product.code);
                        convo.changeQuantity(product.code, (existing?.qty ?? 0) + 1);
                      }}
                      className="grid size-8 place-items-center rounded-full bg-[#0f5b4f] text-white transition active:scale-90 hover:bg-[#0c4a40]"
                      aria-label={`Add ${product.name}`}
                    >
                      <Plus className="size-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dark cart bar at the bottom "Send to shop" */}
          {cart.lines.length > 0 && (
            <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-2xl bg-[#0a2820] px-5 py-3.5 text-white shadow-2xl">
              <div>
                <p className="text-xs font-medium text-neutral-300">
                  {totalCartQty} {totalCartQty === 1 ? "item" : "items"}
                </p>
                <p className="text-xl font-black text-white">{formatMoney(cart.totalPaise)}</p>
              </div>
              <button
                type="button"
                onClick={() => convo.setSheetOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#0a2820] shadow-sm transition hover:bg-neutral-100 active:scale-95"
              >
                Send to shop
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Cart Sheet */}
      <CartSheet
        open={convo.sheetOpen}
        onOpenChange={convo.setSheetOpen}
        lang={lang}
        shopName={shopName}
        cart={cart}
        readBack={convo.readBack}
        onQuantity={convo.changeQuantity}
        onSend={convo.send}
        onSources={backend.priceSources}
      />
    </main>
  );
}
