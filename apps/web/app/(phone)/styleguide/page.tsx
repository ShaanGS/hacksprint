import type { Metadata } from "next";
import { Controls } from "@/components/styleguide/controls";
import { Colours, Type } from "@/components/styleguide/foundations";
import { ArtGallery, Banners } from "@/components/styleguide/gallery";
import { Rows } from "@/components/styleguide/rows";
import { Section } from "@/components/styleguide/section";
import { Voice } from "@/components/styleguide/voice";

export const metadata: Metadata = { title: "Styleguide" };

/** Every building block in every state. Screens are built only from these. */
export default function StyleguidePage() {
  return (
    <main className="pb-10">
      <header className="px-4 pt-8 pb-4">
        <h1 className="text-title font-bold">Styleguide</h1>
        <p className="mt-1 text-base text-ink-muted">
          Every building block in every state. Screens use only these.
        </p>
      </header>
      <Section title="Colours">
        <Colours />
      </Section>
      <Section title="Type">
        <Type />
      </Section>
      <Section title="Buttons, chips and tags">
        <Controls />
      </Section>
      <Section title="Rows and totals">
        <Rows />
      </Section>
      <Section title="Voice">
        <Voice />
      </Section>
      <Section title="Art">
        <ArtGallery />
      </Section>
      <Section title="Banners">
        <Banners />
      </Section>
    </main>
  );
}
