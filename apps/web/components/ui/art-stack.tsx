import { Art, type ArtName } from "@/components/ui/art";

/** Up to three pictures of what is in an order, side by side and slightly overlapping. */
export function ArtStack({ names, size = 36 }: { names: ArtName[]; size?: number }) {
  return (
    <span className="flex shrink-0 -space-x-2">
      {names.slice(0, 3).map((name, index) => (
        <Art key={`${name}-${index}`} name={name} size={size} />
      ))}
    </span>
  );
}
