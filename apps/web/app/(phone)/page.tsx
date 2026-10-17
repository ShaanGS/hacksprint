import Link from "next/link";
import { Art } from "@/components/ui/art";

export const metadata = {
  title: "Your kirana, by voice",
};

/**
 * Screen A · Welcome
 * Dark #141414 background, product art (noodles, rice, khata) on an orange #f07a3a ellipse,
 * headline "Your kirana, by voice", lime #c8e26a "Get started", secondary "தமிழில் தொடரவும்".
 */
export default function Home() {
  return (
    <main className="relative flex min-h-full flex-col justify-between bg-[#141414] px-6 pt-6 pb-8 text-white selection:bg-[#c8e26a] selection:text-black">
      {/* Subtle arc background decorations */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full border border-orange-500/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full border border-lime-400/20"
      />

      {/* Top bar with discreet owner app link */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
          Munim
        </span>
        <Link
          href="/owner"
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:bg-white/20 hover:text-white"
        >
          Owner login →
        </Link>
      </div>

      {/* Product art hero on orange ellipse */}
      <div className="relative my-auto flex flex-col items-center justify-center py-6">
        {/* Floating top products: noodles and rice */}
        <div className="relative z-10 mb-[-1.5rem] flex w-full max-w-xs items-center justify-between px-6">
          <div className="animate-in fade-in zoom-in -rotate-12 duration-700">
            <Art name="noodles" size={88} eager className="drop-shadow-2xl" />
          </div>
          <div className="animate-in fade-in zoom-in rotate-6 duration-700">
            <Art name="rice" size={96} eager className="drop-shadow-2xl" />
          </div>
        </div>

        {/* Orange #f07a3a ellipse and khata notebook */}
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-64 rounded-[100%] bg-[#f07a3a] shadow-[0_10px_35px_rgba(240,122,58,0.45)]" />
          <div className="absolute -top-6 z-10 drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]">
            <Art name="khata" size={116} eager />
          </div>
        </div>
      </div>

      {/* Content section */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-white sm:text-5xl">
          Your kirana,
          <br />
          by voice
        </h1>

        <p className="mt-4 max-w-xs text-base leading-relaxed text-neutral-300">
          Customers order in Tamil, Hindi, Kannada or English. You approve with one tap.
        </p>

        {/* Carousel indicators */}
        <div className="mt-6 flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-[#c8e26a]" />
          <span className="size-2 rounded-full bg-neutral-700" />
          <span className="size-2 rounded-full bg-neutral-700" />
        </div>

        {/* Buttons */}
        <div className="mt-8 flex w-full flex-col gap-3">
          <Link
            href="/order"
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#c8e26a] px-6 text-lg font-bold text-black transition-transform duration-150 hover:brightness-105 active:scale-[0.98]"
          >
            Get started
          </Link>

          <Link
            href="/order?lang=ta"
            className="flex min-h-11 items-center justify-center py-2 text-base font-semibold text-white/90 transition-colors hover:text-white"
          >
            தமிழில் தொடரவும்
          </Link>
        </div>
      </div>
    </main>
  );
}
