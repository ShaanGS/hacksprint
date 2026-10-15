import { Art, type ArtName } from "@/components/ui/art";
import { FeatureCard } from "@/components/ui/feature-card";
import { previewShop } from "@/lib/preview/data";

const howItWorks: { art: ArtName; title: string; text: string }[] = [
  { art: "mic", title: "Say it", text: "In Tamil, Hindi, Kannada or English, the way you talk." },
  { art: "shop", title: "The shop approves", text: "One tap on the owner's phone." },
  {
    art: "phone-pay",
    title: "Pay or put it on account",
    text: "A Paytm link, or the credit book.",
  },
];

/** The front door: one way in for customers, one for the owner, and how the two meet. */
export default function Home() {
  return (
    <main className="px-4 pt-8 pb-10">
      <p className="text-sm font-semibold text-ink-muted">Your kirana, on your phone</p>
      <h1 className="text-display font-extrabold tracking-tight">{previewShop.name}</h1>

      <div className="mt-6 space-y-4">
        <FeatureCard
          banner="voice"
          title="Order by voice"
          text="Speak your order in your own language. We read it back before it goes."
          action="Start an order"
          href="/order"
        />
        <FeatureCard
          banner="approve"
          title="Run the shop"
          text="Approve orders, collect by Paytm link, and keep stock and credit in one place."
          action="Open the shop app"
          href="/owner"
        />
      </div>

      <h2 className="mt-10 text-xl font-extrabold tracking-tight">How it works</h2>
      <ol className="mt-4 space-y-3">
        {howItWorks.map((step, index) => (
          <li key={step.title} className="flex items-center gap-4 rounded-2xl bg-surface-muted p-3">
            <Art name={step.art} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-muted">Step {index + 1}</p>
              <p className="text-lg leading-tight font-bold">{step.title}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
