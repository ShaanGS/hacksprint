// The app's look in numbers: light teal screens and an indigo voice layer, from the references the
// owner chose on Oct 17 (design/references). This file is the source of truth.
// apps/web/app/globals.css mirrors the colours and text sizes in its @theme block, and
// tests/unit/tokens.test.ts fails if the two drift apart.

export const colors = {
  /** Behind every light screen; globals.css draws it as a soft mint gradient. */
  canvas: "#eaf4f0",
  surface: "#ffffff",
  /** Inputs, chips, inner tiles and the circles behind art. */
  surfaceMuted: "#eef5f2",
  surfacePressed: "#e2ece8",
  ink: "#0f1f1b",
  inkMuted: "#5b6a66",
  /** Placeholders, chevrons and inactive tabs. */
  inkFaint: "#7d8b86",
  /** Deep teal: primary buttons, the active tab, links. */
  accent: "#0e5c50",
  accentInk: "#ffffff",
  /** Selected chips and the teal-tinted art circles. */
  accentSoft: "#d9eee7",
  /** The mic and every action an agent takes. */
  lime: "#d6f249",
  limeInk: "#0d0b2e",
  /** Paid, collected. */
  success: "#11805a",
  /** Overdue, failed. */
  danger: "#c43d2b",
  /** Running low: the one warning colour. */
  warning: "#a35d00",
  border: "rgb(15 31 27 / 0.08)",
  /** The front page's warm paper, behind the hand holding the phone. */
  cream: "#f3efe6",
  /** The desk around the phone frame on a laptop or projector. */
  backdrop: "#dfe9e5",
  /** The voice and agent layer. */
  night: "#0d0b2e",
  nightRaised: "#1c1a4d",
  nightInk: "#ffffff",
  nightMuted: "#a7a9d0",
  indigo: "#3b39ef",
  /** Pastel promo cards: each a soft scene behind a cutout, at most one per screen. */
  tintSand: "#fbf1dc",
  tintMint: "#dcf1e9",
  tintSky: "#e2edfb",
  tintLilac: "#ebe7fb",
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
  card: "0 6px 24px rgb(14 92 80 / 0.08)",
  /** Things that float: the tab bar, toasts, the mic. */
  float: "0 10px 30px rgb(15 31 27 / 0.14)",
  sheet: "0 -4px 16px rgb(15 31 27 / 0.08)",
} as const;
