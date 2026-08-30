import { describe, expect, it } from "vitest";
import { getSpotlightProducts, type CatalogProduct } from "./catalog";

const product = (id: string, imageUrl?: string): CatalogProduct => ({ id, title: `Product ${id}`, category: "Audio", description: "", verdict: "", bestFor: [], imageUrl });

describe("catalog spotlight selection", () => {
  it("prefers catalog products with actual supplied imagery", () => {
    expect(getSpotlightProducts([product("plain"), product("pictured", "https://images.example/pictured.jpg")]).map((item) => item.id)).toEqual(["pictured"]);
  });

  it("keeps catalog products available when no record has an image", () => {
    expect(getSpotlightProducts([product("one"), product("two")]).map((item) => item.id)).toEqual(["one", "two"]);
  });
});
