import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import type { CreditRow } from "@/lib/owner/types";

/** O4: who owes the shop, most first. */
export function CreditTab({ rows }: { rows: CreditRow[] }) {
  const owed = rows.reduce((total, row) => total + row.owedPaise, 0);
  return (
    <main className="px-4 pt-8 pb-6">
      <h1 className="text-title font-bold">Credit</h1>
      <Card className="mt-4 flex items-baseline justify-between">
        <span className="text-lg font-medium">Owed to you</span>
        <Amount paise={owed} className="text-2xl font-bold" />
      </Card>
      {rows.length === 0 ? (
        <p className="mt-6 text-base text-ink-muted">Nobody owes anything.</p>
      ) : (
        <ul className="mt-3">
          {rows.map((row) => (
            <li key={row.customer}>
              <ListRow
                art={<Art name="khata" />}
                title={row.customer}
                meta={`Owes since ${row.since}`}
                trailing={<Amount paise={row.owedPaise} />}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
