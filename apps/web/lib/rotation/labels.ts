// Where a number came from (spec rule 5), strongest first. A total is only as trustworthy as its
// weakest input, so it takes that input's label (spec 9.13).
export const sourceLabels = [
  "verified_payment",
  "supplier_bill",
  "estimate",
  "owner_said",
] as const;

export type SourceLabel = (typeof sourceLabels)[number];

export function weakest(first: SourceLabel, ...rest: SourceLabel[]): SourceLabel {
  return rest.reduce(
    (worst, label) => (sourceLabels.indexOf(label) > sourceLabels.indexOf(worst) ? label : worst),
    first,
  );
}

/** An amount and where it came from. */
export type Labelled = { paise: number; label: SourceLabel };
