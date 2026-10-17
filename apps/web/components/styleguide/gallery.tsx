import { ProductImage } from "@/components/ui/product-image";
import { photographed } from "@/lib/products/photos";

const title = (slug: string) => slug.replace(/-/g, " ");

/** Every product photo, as the Stock tab and the agents show them. */
export function ArtGallery() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {photographed.map((slug) => (
        <figure key={slug} className="flex flex-col items-center gap-1 text-center">
          <ProductImage name={title(slug)} size="lg" />
          <figcaption className="text-xs text-ink-muted">{title(slug)}</figcaption>
        </figure>
      ))}
    </div>
  );
}
