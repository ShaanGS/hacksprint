import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Ticker } from "@/components/ui/ticker";
import type { CreditRow } from "@/lib/owner/types";

/** O4: who owes the shop, most first, under the one number that matters. */
export function CreditTab({ rows }: { rows: CreditRow[] }) {
  const owed = rows.reduce((total, row) => total + row.owedPaise, 0);
  return (
    <main className="px-4 pt-6 pb-32">
      <h1 className="text-title font-extrabold tracking-tight">Credit</h1>
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-tint-lilac p-5">
        <Art name="khata" size={120} eager className="absolute -top-1 -right-3" />
        <p className="text-sm font-semibold text-ink-muted">Owed to you</p>
        <Ticker paise={owed} className="mt-1 block text-hero font-extrabold tracking-tight" />
        <p className="mt-1 text-base text-ink-muted">
          {rows.length === 1 ? "1 customer" : `${rows.length} customers`} on account
        </p>
      </section>
      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <Art name="savings" size={120} />
          <p className="mt-3 text-lg text-ink-muted">Nobody owes anything.</p>
        </div>
      ) : (
        <ul className="-mx-3 mt-4">
          {rows.map((row) => (
            <li key={row.customer}>
              <ListRow
                art={<Monogram name={row.customer} />}
                title={row.customer}
                meta={`Owes since ${row.since}`}
                trailing={<Amount paise={row.owedPaise} size="lg" />}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
