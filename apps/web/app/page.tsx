import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Banner, type BannerName } from "@/components/ui/art";
import { previewShop } from "@/lib/preview/data";

const entries: { href: string; banner: BannerName; title: string; text: string; action: string }[] =
  [
    {
      href: "/order",
      banner: "voice",
      title: "Order by voice",
      text: "Speak in Tamil, Hindi, Kannada or English. The shop approves in one tap.",
      action: "Start an order",
    },
    {
      href: "/owner",
      banner: "approve",
      title: "Run the shop",
      text: "Approve orders, collect by Paytm link, and keep stock and credit in one place.",
      action: "Open the shop app",
    },
  ];

/** The front door: one way in for customers, one for the owner. */
export default function Home() {
  return (
    <main className="px-4 pt-8 pb-6">
      <h1 className="text-title font-bold">{previewShop.name}</h1>
      <p className="mt-1 text-base text-ink-muted">Your kirana, on your phone</p>
      <div className="mt-6 space-y-4">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="block rounded-2xl bg-surface-muted p-3"
          >
            <Banner name={entry.banner} />
            <div className="px-1 pt-3 pb-1">
              <p className="text-xl font-bold">{entry.title}</p>
              <p className="mt-1 text-base text-ink-muted">{entry.text}</p>
              <p className="mt-3 flex items-center gap-2 text-base font-semibold">
                {entry.action}
                <ArrowRight aria-hidden className="size-5" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
