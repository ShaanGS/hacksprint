import { ChevronRight, Landmark, Mic, ReceiptText, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "@/components/landing/how-it-works";
import { IconCircle } from "@/components/ui/icon-circle";

// The services that each do a real job in the app (spec section 14), named in plain text.
const builtWith = ["Paytm", "Sarvam", "Google Gemini", "n8n", "Supabase"];

/**
 * The front door, after the owner's chosen reference: a headline, two ways in, and a hand holding
 * the phone with the real app on it. Every claim on the page is true of the app.
 */
export default function Home() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-cream text-ink">
      <p className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 pt-3 text-xs text-ink-muted">
        <span>Speaks Tamil, Hindi, Kannada and English</span>
        <span className="hidden sm:inline">We never hold or move your money</span>
      </p>

      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-8">
        <span className="flex items-center gap-2 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
            <Store aria-hidden className="size-5" />
          </span>
          For kirana shops
        </span>
        <span className="hidden items-center gap-8 text-sm font-medium text-ink-muted md:flex">
          <a href="#how">How it works</a>
          <Link href="/demo">Judges&apos; screen</Link>
        </span>
        <Link
          href="/owner"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-ink px-5 text-sm font-semibold text-surface"
        >
          <span className="sm:hidden">Open app</span>
          <span className="hidden sm:inline">Open the shop app</span>
        </Link>
      </nav>

      <section className="relative mx-auto max-w-6xl px-4 pt-10 text-center sm:pt-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface py-1.5 pr-4 pl-1.5 text-xs font-medium shadow-card sm:text-sm">
          <span className="flex -space-x-2">
            <IconCircle icon={Mic} tone="lime" size="sm" className="ring-2 ring-surface" />
            <IconCircle icon={ReceiptText} tone="sand" size="sm" className="ring-2 ring-surface" />
            <IconCircle icon={Landmark} tone="sky" size="sm" className="ring-2 ring-surface" />
          </span>
          Talk and snap the bill. No typing.
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-6xl sm:leading-tight">
          Know where your shop&apos;s money is, every week.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted sm:text-lg">
          Bills due, who to collect from first, and the bank loan papers when collecting is not
          enough.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="inline-flex min-h-12 items-center rounded-full bg-surface px-6 text-sm font-semibold shadow-card"
          >
            Judges&apos; screen
          </Link>
          <Link
            href="/owner"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full bg-ink px-6 text-sm font-semibold text-surface"
          >
            Open the shop app
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>

        <div className="relative mx-auto mt-4 h-112 max-w-4xl sm:mt-6 sm:h-176">
          {[96, 80, 64, 48].map((size) => (
            <span
              key={size}
              aria-hidden
              className="absolute bottom-0 left-1/2 aspect-square -translate-x-1/2 translate-y-1/2 rounded-full border border-ink/8"
              style={{ width: `${size}rem` }}
            />
          ))}
          <Image
            src="/landing/hand-phone.webp"
            alt="The shop app on a phone, held in a hand: this week short by ₹36,500, with three late payers to collect from"
            width={1536}
            height={2048}
            priority
            sizes="(max-width: 640px) 340px, 540px"
            className="fade-bottom absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2 object-contain"
          />
        </div>
      </section>

      <section className="border-t border-ink/8 bg-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-ink-muted">
          <span className="text-sm">Built with</span>
          {builtWith.map((name) => (
            <span key={name} className="text-lg font-bold tracking-tight">
              {name}
            </span>
          ))}
        </div>
      </section>

      <HowItWorks />
    </main>
  );
}
