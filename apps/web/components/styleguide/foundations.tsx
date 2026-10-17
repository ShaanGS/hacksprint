import { colors } from "@design/tokens";
import { cn } from "@/lib/cn";

// Tailwind only generates classes it can read in the source, so each swatch names its class.
const swatches = [
  { name: "canvas", className: "bg-canvas", value: colors.canvas },
  { name: "surface", className: "bg-surface", value: colors.surface },
  { name: "surface-muted", className: "bg-surface-muted", value: colors.surfaceMuted },
  { name: "ink", className: "bg-ink", value: colors.ink },
  { name: "ink-muted", className: "bg-ink-muted", value: colors.inkMuted },
  { name: "accent", className: "bg-accent", value: colors.accent },
  { name: "accent-soft", className: "bg-accent-soft", value: colors.accentSoft },
  { name: "lime", className: "bg-lime", value: colors.lime },
  { name: "night", className: "bg-night", value: colors.night },
  { name: "night-raised", className: "bg-night-raised", value: colors.nightRaised },
  { name: "indigo", className: "bg-indigo", value: colors.indigo },
  { name: "success", className: "bg-success", value: colors.success },
  { name: "warning", className: "bg-warning", value: colors.warning },
  { name: "danger", className: "bg-danger", value: colors.danger },
  { name: "tint-sand", className: "bg-tint-sand", value: colors.tintSand },
  { name: "tint-mint", className: "bg-tint-mint", value: colors.tintMint },
];

export function Colours() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {swatches.map((swatch) => (
        <div key={swatch.name} className="flex items-center gap-3">
          <span
            className={cn("size-10 shrink-0 rounded-full border border-border", swatch.className)}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{swatch.name}</span>
            <span className="block truncate text-xs text-ink-muted">{swatch.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Type() {
  return (
    <div className="space-y-2">
      <p className="text-hero font-extrabold tracking-tight tabular-nums">₹36,500</p>
      <p className="text-title font-bold tracking-tight">Can you pay this week?</p>
      <p className="text-xl font-bold">Where your money is</p>
      <p className="text-base font-semibold">Arjun Reddy</p>
      <p className="text-sm text-ink-muted">Usually pays in 12 days · 9 days late</p>
      <div className="mt-4 space-y-1 border-t border-border pt-4">
        <p lang="ta" className="text-title font-bold">
          இந்த வாரம் பணம் குறைவு
        </p>
        <p lang="ta" className="text-base font-semibold">
          தாமதமான 3 பேரிடம் வசூலித்தால்: +₹9,600
        </p>
        <p className="text-sm text-ink-muted">
          Tamil headlines take two lines at most; nothing is cut mid-word.
        </p>
      </div>
    </div>
  );
}
