import { Art, artNames, Banner, bannerNames, type BannerName } from "@/components/ui/art";

const bannerCopy: Record<BannerName, { title: string; line: string }> = {
  voice: { title: "Order by voice", line: "Customers talk to the shop in their own language." },
  approve: { title: "Approve in one tap", line: "Every order waits for the owner's yes." },
  bill: {
    title: "Snap the morning bill",
    line: "Stock and prices update from the distributor's bill.",
  },
  night: {
    title: "Hear the day at night",
    line: "Orders, money and low stock, read out in Tamil.",
  },
};

export function ArtGallery() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {artNames.map((name) => (
        <figure key={name} className="flex flex-col items-center gap-1">
          <Art name={name} size={72} />
          <figcaption className="text-xs text-ink-muted">{name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Banners() {
  return (
    <div className="space-y-6">
      {bannerNames.map((name) => (
        <figure key={name}>
          <Banner name={name} />
          <figcaption className="mt-2">
            <span className="block text-lg font-medium">{bannerCopy[name].title}</span>
            <span className="block text-sm text-ink-muted">{bannerCopy[name].line}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
