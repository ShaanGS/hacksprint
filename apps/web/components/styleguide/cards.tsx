import { Package, ReceiptText, Truck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconCircle } from "@/components/ui/icon-circle";
import { ProductImage } from "@/components/ui/product-image";
import { HeroCard, PromoCard } from "@/components/ui/promo-card";
import { Tile } from "@/components/ui/tile";

export function Cards() {
  return (
    <div className="space-y-4">
      <HeroCard>
        <p className="text-sm font-semibold text-accent-ink/80">Short this week</p>
        <p className="mt-1 text-hero font-extrabold tracking-tight tabular-nums">₹36,500</p>
        <p className="mt-2 text-sm text-accent-ink/80">Needed ₹95,500 · Likely ₹59,000</p>
      </HeroCard>
      <PromoCard
        tint="sand"
        visual={<IconCircle icon={ReceiptText} tone="sand" size="lg" />}
        title="Today's delivery"
        text="Snap the bill. Stock, prices and what you owe update."
        action="Snap the bill"
      />
      <div className="grid grid-cols-2 gap-3">
        <Tile visual={<IconCircle icon={Package} size="sm" />} size="sm">
          <p className="text-sm text-ink-muted">On the shelf</p>
          <p className="text-xl font-bold tabular-nums">₹1,13,659</p>
        </Tile>
        <Tile visual={<IconCircle icon={Users} tone="lilac" size="sm" />} size="sm">
          <p className="text-sm text-ink-muted">With customers</p>
          <p className="text-xl font-bold tabular-nums">₹14,500</p>
        </Tile>
        <Tile visual={<IconCircle icon={Truck} tone="sand" size="sm" />} size="sm">
          <p className="text-sm text-ink-muted">Owed to suppliers</p>
          <p className="text-xl font-bold tabular-nums">₹1,05,500</p>
        </Tile>
        <Tile visual={<ProductImage name="Maggi Masala Noodles" size="sm" />} size="sm">
          <p className="text-sm text-ink-muted">Maggi Masala Noodles</p>
          <p className="text-xl font-bold tabular-nums">150 left</p>
        </Tile>
      </div>
      <Card>
        <p className="text-base font-semibold">A white card on the canvas</p>
        <Card tone="muted" className="mt-3">
          <p className="text-sm text-ink-muted">A muted card inside it</p>
        </Card>
      </Card>
    </div>
  );
}
