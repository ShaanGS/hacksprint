import { Minus, Plus, Trash2 } from "lucide-react";

const stepButton =
  "grid size-11 place-items-center rounded-full text-ink transition-transform active:scale-90";

/** "− 2 +" in one pill. At the last step the minus becomes a bin, so removing is never a surprise. */
export function QtyStepper({
  value,
  removes,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
}: {
  value: string;
  /** The minus takes the line away. */
  removes: boolean;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted">
      <button type="button" aria-label={minusLabel} onClick={onMinus} className={stepButton}>
        {removes ? (
          <Trash2 aria-hidden className="size-4.5" />
        ) : (
          <Minus aria-hidden className="size-4.5" />
        )}
      </button>
      <span className="min-w-8 text-center text-base font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label={plusLabel} onClick={onPlus} className={stepButton}>
        <Plus aria-hidden className="size-4.5" />
      </button>
    </span>
  );
}
