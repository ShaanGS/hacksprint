"use client";

import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Ticker } from "@/components/ui/ticker";

const MAGGI_PAISE = 1400;
const BUTTER_PAISE = 5800;
const JAGGERY_HALF_KG_PAISE = 3500;

export function Rows() {
  const [maggiPacks, setMaggiPacks] = useState(2);
  const total = maggiPacks * MAGGI_PAISE + BUTTER_PAISE + JAGGERY_HALF_KG_PAISE;
  return (
    <div className="space-y-1">
      <ListRow
        art={<Art name="noodles" />}
        title="Maggi Masala Noodles"
        meta={`${maggiPacks} packs · ₹14 each`}
        trailing={<Amount paise={maggiPacks * MAGGI_PAISE} />}
      />
      <ListRow
        art={<Art name="butter" />}
        title="Amul Butter 100 g"
        meta="1 pack"
        trailing={<Amount paise={BUTTER_PAISE} />}
      />
      <ListRow
        art={<Art name="sugar" />}
        tag={<Badge tone="danger">Out of stock</Badge>}
        title="Sugar"
        meta="½ kg asked for"
        note="Jaggery is in stock"
      />
      <ListRow
        art={<Art name="jaggery" />}
        tag={<Badge tone="best">Instead of sugar</Badge>}
        title="Jaggery"
        meta="½ kg · ₹70 a kg"
        trailing={<Amount paise={JAGGERY_HALF_KG_PAISE} />}
        selected
      />
      <Card className="mt-4 flex items-baseline justify-between">
        <span className="text-lg font-medium">Total</span>
        <Ticker paise={total} className="text-2xl font-bold" />
      </Card>
      <p className="px-1 pt-2 text-xs text-ink-muted">Worked out by the shop, never by the AI.</p>
      <Button
        variant="soft"
        wide
        className="mt-3"
        onClick={() => setMaggiPacks((packs) => packs + 1)}
      >
        Add one more Maggi
      </Button>
      <div className="pt-6">
        <ListRow
          art={<Art name="khata" />}
          title="Lakshmi Raman"
          meta="Owes since 12 Oct"
          trailing={<Amount paise={124000} />}
        />
        <ListRow
          art={<Art name="khata" />}
          title="Rahul Sharma"
          meta="Owes since 14 Oct"
          trailing={<Amount paise={38000} />}
        />
      </div>
    </div>
  );
}
