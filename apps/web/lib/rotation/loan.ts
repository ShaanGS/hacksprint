// The loan-ready check (spec 9.14): how much loan the festival order needs once spare money and
// what late payers owe are counted, rounded up to the next ₹1,000.

export const LOAN_STEP_PAISE = 100_000;

/**
 * Need minus the week's gap without the order (spare money lowers it, a shortfall raises it)
 * minus what late payers could bring. Never below zero.
 */
export function loanNeeded(
  needPaise: number,
  gapWithoutOrderPaise: number,
  canCollectPaise: number,
): number {
  const raw = needPaise - gapWithoutOrderPaise - canCollectPaise;
  if (raw <= 0) return 0;
  return Math.ceil(raw / LOAN_STEP_PAISE) * LOAN_STEP_PAISE;
}
