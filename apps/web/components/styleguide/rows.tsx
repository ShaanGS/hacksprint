"use client";

import { Section } from "@/components/owner/section";
import { Amount } from "@/components/ui/amount";
import { Package, Truck } from "lucide-react";
import { IconCircle } from "@/components/ui/icon-circle";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";

function ignore() {}

export function Rows() {
  return (
    <div>
      <Section title="Where your money is">
        <li>
          <ListRow
            art={<IconCircle icon={Package} />}
            title="On the shelf"
            meta="2 items have no bill price yet"
            note={<Badge>Estimate</Badge>}
            trailing={<Amount paise={11365900} size="md" />}
            onClick={ignore}
          />
        </li>
        <li>
          <ListRow
            art={<IconCircle icon={Truck} tone="sand" />}
            title="Owed to suppliers"
            meta="5 bills · ₹21,500 overdue"
            note={<Badge>Supplier bill</Badge>}
            trailing={<Amount paise={10550000} size="md" />}
            onClick={ignore}
          />
        </li>
      </Section>
      <Section title="Collect first" total={960000}>
        <li>
          <ListRow
            art={<Monogram name="Arjun Reddy" />}
            tag={<Badge tone="danger">9 days late</Badge>}
            title="Arjun Reddy"
            meta="Usually pays in 12 days"
            trailing={<Amount paise={420000} size="lg" />}
            onClick={ignore}
          />
        </li>
        <li>
          <ListRow
            art={<Monogram name="Lakshmi Iyer" muted />}
            title="Lakshmi Iyer"
            meta="Due in 4 days"
            trailing={<Amount paise={90000} size="lg" />}
            onClick={ignore}
          />
        </li>
      </Section>
    </div>
  );
}
