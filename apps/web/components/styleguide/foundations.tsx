import { colors } from "@design/tokens";
import { cn } from "@/lib/cn";

// Tailwind only generates classes it can read in the source, so each swatch names its class.
const swatches = [
  { name: "surface", className: "bg-surface", value: colors.surface },
  { name: "surface-muted", className: "bg-surface-muted", value: colors.surfaceMuted },
  { name: "surface-pressed", className: "bg-surface-pressed", value: colors.surfacePressed },
  { name: "ink", className: "bg-ink", value: colors.ink },
  { name: "ink-muted", className: "bg-ink-muted", value: colors.inkMuted },
  { name: "success", className: "bg-success", value: colors.success },
  { name: "danger", className: "bg-danger", value: colors.danger },
  { name: "border", className: "bg-border", value: colors.border },
];

export function Colours() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {swatches.map((swatch) => (
        <div key={swatch.name} className="flex items-center gap-3">
          <span
            className={cn("size-10 shrink-0 rounded-xl border border-border", swatch.className)}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{swatch.name}</span>
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
      <p className="text-display font-bold tabular-nums">₹3,240</p>
      <p className="text-title font-bold">Today at the shop</p>
      <p className="text-2xl font-bold">14 orders</p>
      <p className="text-xl font-bold">Choose a substitute</p>
      <p className="text-lg font-medium">Maggi Masala Noodles</p>
      <p className="text-base text-ink-muted">2 packs · ₹14 each</p>
      <p className="text-sm text-ink-muted">Jaggery is in stock</p>
      <p className="text-xs text-ink-muted">Updated 6:40 PM</p>
      <div className="mt-4 space-y-1 border-t border-border pt-4">
        <p lang="ta" className="text-lg">
          சர்க்கரை தீர்ந்துவிட்டது. வெல்லம் வேண்டுமா?
        </p>
        <p lang="hi" className="text-lg">
          चीनी खत्म हो गई है। गुड़ चाहिए?
        </p>
        <p lang="kn" className="text-lg">
          ಸಕ್ಕರೆ ಮುಗಿದಿದೆ. ಬೆಲ್ಲ ಬೇಕೆ?
        </p>
        <p className="text-sm text-ink-muted">
          Every spoken line also shows as text, in the customer&apos;s language.
        </p>
      </div>
    </div>
  );
}
