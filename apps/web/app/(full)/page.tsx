import { IndianRupee, Mic, ReceiptText, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HowItWorks } from "@/components/landing/how-it-works";
import { IconCircle } from "@/components/ui/icon-circle";
import { cn } from "@/lib/cn";

// The services that each do a real job in the app (spec section 14), named in plain text.
const builtWith = ["Paytm", "Sarvam AI", "Google Gemini", "n8n", "Supabase"];

/** A four-point sparkle, as on the team's banner. */
function Sparkle({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("absolute text-sparkle", className)}>
      <path
        fill="currentColor"
        d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0Z"
      />
    </svg>
  );
}

/**
 * The front door, in the look of the team's banner (docs/banner.png): a light headline, a yellow
 * way in, and a hand holding the phone with the real app on it. Every claim on the page is true
 * of the app.
 */
export default function Home() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-surface text-ink">
      {/* On a laptop the first screen is the whole hero, words on the left and the hand on the
          right, so nothing needs a scroll. On a phone they stack. */}
      <div className="flex flex-col overflow-hidden lg:h-dvh lg:max-h-232 lg:min-h-160">
        <p className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 pt-3 text-xs text-ink-muted">
          <span>Talk in Tamil or English. Reminders go out in four languages</span>
          <span className="hidden sm:inline">We never hold or move your money</span>
        </p>

        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pt-5 sm:px-8">
          <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="grid size-10 place-items-center rounded-xl bg-yellow text-yellow-ink">
              <Store aria-hidden className="size-5" />
            </span>
            For kirana shops
          </span>
          <span className="hidden items-center gap-8 text-base font-medium md:flex">
            <a href="#how">How it works</a>
            <Link href="/demo">Judges&apos; screen</Link>
          </span>
          <Link
            href="/owner"
            className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-ink px-6 text-base font-semibold text-surface"
          >
            <span className="sm:hidden">Open app</span>
            <span className="hidden sm:inline">Open the shop app</span>
          </Link>
        </nav>

        <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-6 px-4 pt-12 text-center sm:px-8 lg:min-h-0 lg:grid-cols-2 lg:gap-10 lg:pt-0 lg:text-left">
          <div>
            <h1 className="mx-auto max-w-xl text-5xl leading-none font-medium tracking-tighter text-balance sm:text-6xl lg:mx-0 xl:text-7xl">
              Know on Monday if you can pay Friday&rsquo;s bill
            </h1>
            <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-ink-muted lg:mx-0">
              A voice-first money planner for kirana owners. It reads his bills, tracks who owes
              him, and warns him a week before cash runs short.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/owner"
                className="inline-flex min-h-14 items-center rounded-full bg-yellow px-8 text-base font-semibold text-yellow-ink"
              >
                Open the shop app
              </Link>
              <Link
                href="/demo"
                className="inline-flex min-h-14 items-center rounded-full border border-ink/10 bg-surface px-8 text-base font-semibold"
              >
                Judges&apos; screen
              </Link>
            </div>
            {/* Below the buttons only when the window is tall enough, so a laptop never clips them. */}
            <div className="mt-10 flex items-center justify-center gap-5 lg:hidden lg:justify-start lg:tall:flex">
              <span className="flex shrink-0 -space-x-3">
                <IconCircle icon={Mic} tone="lilac" className="ring-4 ring-surface" />
                <IconCircle icon={ReceiptText} tone="sand" className="ring-4 ring-surface" />
                <IconCircle icon={IndianRupee} tone="green" className="ring-4 ring-surface" />
              </span>
              <span className="text-left">
                <span className="block text-5xl leading-none font-medium tracking-tighter">
                  7 days
                </span>
                <span className="mt-1 block max-w-xs text-sm text-ink-muted">
                  of warning before cash runs short, worked out from his own bills, sales and
                  credit.
                </span>
              </span>
            </div>
          </div>

          <div className="relative mx-auto h-112 w-full max-w-4xl sm:h-176 lg:h-full lg:max-w-none">
            {[96, 80, 64, 48].map((size) => (
              <span
                key={size}
                aria-hidden
                className="absolute bottom-0 left-1/2 aspect-square -translate-x-1/2 translate-y-1/2 rounded-full border border-ink/6"
                style={{ width: `${size}rem` }}
              />
            ))}
            <Sparkle className="top-1/12 left-1/8 size-10" />
            <Sparkle className="right-1/10 bottom-1/3 size-8" />
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
      </div>

      <section className="border-t border-ink/8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 text-ink-muted">
          <span className="text-sm">Built with</span>
          {builtWith.map((name) => (
            <span key={name} className="text-lg font-medium tracking-tight text-ink">
              {name}
            </span>
          ))}
        </div>
      </section>

      <HowItWorks />
    </main>
  );
}
