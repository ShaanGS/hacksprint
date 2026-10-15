// The app's look in numbers: Uber-style light, ported from the team's mazhai app.
// This file is the source of truth. apps/web/app/globals.css mirrors the colours and text
// sizes in its @theme block, and tests/unit/tokens.test.ts fails if the two drift apart.

/** Colour comes from the art, the feature panels and meaning; the interface itself is black, white and grey. */
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
  /** Running low: the one warning colour. */
  warning: "#9a5b00",
  border: "rgb(0 0 0 / 0.08)",
  /** Placeholders, chevrons and inactive tabs. */
  inkFaint: "#6f6f6f",
  /** The desk around the phone frame on a laptop or projector. */
  backdrop: "#e9e9e9",
  /** Feature card panels: each the darkest strong colour of its banner, so the two read as one. */
  panelVoice: "#203e34",
  panelApprove: "#24485b",
  panelBill: "#104247",
  panelNight: "#1e385a",
  /** Soft scenes behind hero art. At most one per screen, never to show status. */
  tintSand: "#f6efe4",
  tintMint: "#e7f3ec",
  tintSky: "#e8f0fa",
  tintLilac: "#efeaf8",
} as const;

/** Body text is 12 to 18px; headings are 20 to 40px, extra-bold with tight tracking. */
export const textSizes = {
  title: "1.75rem",
  display: "2rem",
  /** Big totals and stage headlines. */
  hero: "2.5rem",
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

/** Only things that float get a shadow: the cart dock, the tab bar and sheets. */
export const shadows = {
  float: "0 8px 24px rgb(0 0 0 / 0.1)",
  sheet: "0 -4px 16px rgb(0 0 0 / 0.08)",
} as const;
