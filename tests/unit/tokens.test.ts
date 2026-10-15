import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colors, textSizes } from "@design/tokens";

// design/tokens.ts is the source of truth; globals.css must carry the same values for Tailwind.
const css = readFileSync(new URL("../../apps/web/app/globals.css", import.meta.url), "utf8");

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("design tokens", () => {
  it.each(Object.entries(colors))("globals.css has the colour %s", (name, value) => {
    expect(css).toContain(`--color-${kebab(name)}: ${value};`);
  });

  it.each(Object.entries(textSizes))("globals.css has the text size %s", (name, value) => {
    expect(css).toContain(`--text-${name}: ${value};`);
  });
});
