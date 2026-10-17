import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { photographed, productPhoto, productSlug } from "@/lib/products/photos";

describe("product photos", () => {
  it("has a file for every photographed product", () => {
    for (const slug of photographed) {
      const file = new URL(`../../apps/web/public/products/${slug}.webp`, import.meta.url);
      expect(existsSync(file), slug).toBe(true);
    }
  });

  it("finds a product's photo by its name", () => {
    expect(productSlug("Lay's Classic Salted")).toBe("lays-classic-salted");
    expect(productSlug("Narasu's Filter Coffee")).toBe("narasus-filter-coffee");
    expect(productPhoto("Maggi Masala Noodles")).toBe("/products/maggi-masala-noodles.webp");
  });

  it("has no photo for a product added later", () => {
    expect(productPhoto("Kumar's Special Pickle")).toBeNull();
  });
});
