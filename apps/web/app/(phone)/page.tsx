import { Art, type ArtName } from "@/components/ui/art";
import { FeatureCard } from "@/components/ui/feature-card";

const howItWorks: { art: ArtName; title: string; text: string }[] = [
  {
    art: "mic",
    title: "Say it, snap the bill",
    text: "Credit given, cash paid back, tonight's sales, a stock count. A photo of the supplier's bill.",
  },
  {
    art: "savings",
    title: "See this week",
    text: "What the bills need against what is likely to come in, and who to collect from first.",
  },
  {
    art: "phone-pay",
    title: "Collect by Paytm link",
    text: "One tap opens WhatsApp with the message in the customer's language. A payment clears it live.",
  },
  {
    art: "bill",
    title: "A loan only if needed",
    text: "How much, the official scheme that covers it, and the papers to take to the bank.",
  },
];

/** The front door: the owner's app, the judges' screen, and what the app does. */
export default function Home() {
  return (
    <main className="px-4 pt-8 pb-10">
      <p className="text-sm font-semibold text-ink-muted">For kirana shops</p>
      <h1 className="text-display font-extrabold tracking-tight">See where your money is</h1>

      <div className="mt-6 space-y-4">
        <FeatureCard
          banner="night"
          title="Open the shop app"
          text="This week's bills, who to collect from, stock, and the bank. In Tamil, by voice."
          action="Open"
          href="/owner"
        />
        <FeatureCard
          banner="approve"
          title="This week, on a big screen"
          text="The same numbers, large, updating as the owner's phone changes them."
          action="Open the screen"
          href="/demo"
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
