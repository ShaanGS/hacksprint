import type { Metadata } from "next";
import { Cards } from "@/components/styleguide/cards";
import { Controls } from "@/components/styleguide/controls";
import { Colours, Type } from "@/components/styleguide/foundations";
import { ArtGallery } from "@/components/styleguide/gallery";
import { Night } from "@/components/styleguide/night";
import { Rows } from "@/components/styleguide/rows";
import { Section } from "@/components/styleguide/section";

export const metadata: Metadata = { title: "Styleguide" };

/** Every building block in every state. Screens are built only from these. */
export default function StyleguidePage() {
  return (
    <main className="pb-10">
      <header className="px-4 pt-8 pb-2">
        <h1 className="text-title font-bold tracking-tight">Styleguide</h1>
        <p className="mt-1 text-base text-ink-muted">
          A white page with black ink, the banner&apos;s yellow for the mic and agent actions,
          violet for the promo card, and a dark layer for voice and the agents.
        </p>
      </header>
      <Section title="Cards">
        <Cards />
      </Section>
      <Section title="Buttons, chips and tags">
        <Controls />
      </Section>
      <Section title="Rows">
        <Rows />
      </Section>
      <Section title="Voice and agents">
        <Night />
      </Section>
      <Section title="Type">
        <Type />
      </Section>
      <Section title="Colours">
        <Colours />
      </Section>
      <Section title="Art">
        <ArtGallery />
      </Section>
    </main>
  );
}
