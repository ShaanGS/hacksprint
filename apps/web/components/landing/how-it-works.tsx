import { HandCoins, Landmark, Mic, ReceiptText, type LucideIcon } from "lucide-react";
import { IconCircle, type IconTone } from "@/components/ui/icon-circle";

const steps: { icon: LucideIcon; tone: IconTone; title: string; text: string }[] = [
  {
    icon: Mic,
    tone: "lime",
    title: "Say it, snap the bill",
    text: "Credit given, cash paid back, tonight's sales, a stock count. A photo of the supplier's bill.",
  },
  {
    icon: ReceiptText,
    tone: "sand",
    title: "See this week",
    text: "What the bills need against what is likely to come in, and who to collect from first.",
  },
  {
    icon: HandCoins,
    tone: "lilac",
    title: "Collect by Paytm link",
    text: "One tap opens WhatsApp with the message in the customer's language. A payment clears it live.",
  },
  {
    icon: Landmark,
    tone: "sky",
    title: "A loan only if needed",
    text: "How much, the official scheme that covers it, and the papers to take to the bank.",
  },
];

/** The four things the app does, in the order the owner meets them. */
export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-3xl bg-surface p-6 shadow-card">
            <IconCircle icon={step.icon} tone={step.tone} size="lg" />
            <p className="mt-5 text-sm font-semibold text-ink-muted">Step {index + 1}</p>
            <p className="mt-1 text-xl leading-tight font-bold">{step.title}</p>
            <p className="mt-2 text-sm text-ink-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
