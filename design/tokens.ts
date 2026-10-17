// The app's look in numbers: a white page, black ink and pills, lime highlights and violet promo
// cards (the owner's landing reference), and a dark layer for voice and the agents. This file is the source of truth.
// apps/web/app/globals.css mirrors the colours and text sizes in its @theme block, and
// tests/unit/tokens.test.ts fails if the two drift apart.

export const colors = {
  /** Behind every light screen: plain white. */
  canvas: "#ffffff",
  surface: "#ffffff",
  /** Inputs, chips, inner tiles and the circles behind art. */
  surfaceMuted: "#f4f4f1",
  surfacePressed: "#e9e9e4",
  ink: "#111111",
  inkMuted: "#6b6b66",
  /** Placeholders, chevrons and inactive tabs. */
  inkFaint: "#8f8f89",
  /** Black: primary pills, the active tab, links. */
  accent: "#111111",
  accentInk: "#ffffff",
  /** Selected chips and the soft circles behind icons. */
  accentSoft: "#f0f0eb",
  /** The mic and every action an agent takes. */
  lime: "#d8f34b",
  limeInk: "#111111",
  /** Paid, collected. */
  success: "#1a7f4b",
  /** Overdue, failed. */
  danger: "#d0402b",
  /** Running low: the one warning colour. */
  warning: "#a35d00",
  border: "rgb(17 17 17 / 0.08)",
  /** The front page's warm paper, behind the hand holding the phone. */
  cream: "#f3efe6",
  /** The desk around the phone frame on a laptop or projector. */
  backdrop: "#ecebe6",
  /** The voice and agent layer. */
  night: "#101014",
  nightRaised: "#1f1f26",
  nightInk: "#ffffff",
  nightMuted: "#a1a1aa",
  indigo: "#5b4ff5",
  /** Pastel promo cards: each a soft scene behind a cutout, at most one per screen. */
  tintSand: "#fbf3e0",
  tintMint: "#e8f6ee",
  tintSky: "#e8eefc",
  tintLilac: "#efecfe",
} as const;

/** Body text is 14 to 17px; headlines are 22 to 32px bold; hero numbers 44px extra-bold. */
export const textSizes = {
  title: "1.75rem",
  display: "2rem",
  /** Big totals and stage headlines. */
  hero: "2.75rem",
} as const;

/** Tailwind's own steps cover these: rounded-2xl, rounded-3xl, rounded-full. */
export const radius = {
  inner: "16px",
  card: "24px",
  pill: "9999px",
} as const;

export const spacing = {
  grid: 4,
  gutter: 16,
  tileGap: 12,
} as const;

/** Minimum heights in px. Every tap target is at least 44px. */
export const heights = {
  button: 56,
  chip: 40,
  row: 56,
  micButton: 64,
} as const;

export const shadows = {
  /** White cards on the mint canvas. */
  card: "0 1px 2px rgb(17 17 17 / 0.04), 0 8px 24px rgb(17 17 17 / 0.06)",
  /** Things that float: the tab bar, toasts, the mic. */
  float: "0 12px 32px rgb(17 17 17 / 0.16)",
  sheet: "0 -4px 16px rgb(17 17 17 / 0.08)",
} as const;
