// The app's look in numbers: Uber-style light, ported from the team's mazhai app.
// This file is the source of truth. apps/web/app/globals.css mirrors the colours and text
// sizes in its @theme block, and tests/unit/tokens.test.ts fails if the two drift apart.

/** Colour comes from the art and from meaning; the interface itself is black, white and grey. */
export const colors = {
  surface: "#ffffff",
  surfaceMuted: "#f3f3f3",
  surfacePressed: "#e8e8e8",
  ink: "#000000",
  inkMuted: "#5e5e5e",
  accent: "#000000",
  accentInk: "#ffffff",
  /** Paid, collected, in stock. */
  success: "#0a7d44",
  /** Out of stock, rejected, overdue. */
  danger: "#c0341d",
  border: "rgb(0 0 0 / 0.08)",
  /** The desk around the phone frame on a laptop or projector. */
  backdrop: "#e9e9e9",
} as const;

/** Body text is 12 to 18px at weight 400 or 500; headings are 20 to 32px at weight 700. */
export const textSizes = {
  title: "1.75rem",
  display: "2rem",
} as const;

/** Tailwind's own steps cover these: rounded-lg, rounded-xl, rounded-2xl, rounded-full. */
export const radius = {
  input: "8px",
  button: "12px",
  card: "16px",
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
  micButton: 88,
} as const;

export const shadows = {
  floating: "0 4px 16px rgb(0 0 0 / 0.12)",
  sheetEdge: "0 -4px 16px rgb(0 0 0 / 0.08)",
} as const;
