import { describe, expect, it } from "vitest";
import { brandSpotlights, getNextTwoDayFeatureDate, getTwoDayBrandSpotlightIndex, nextBrandSpotlightIndex, previousBrandSpotlightIndex } from "./brandSpotlight";

describe("brand spotlight rotation", () => {
  it("keeps every animated slide tied to a named real brand product and image", () => {
    expect(brandSpotlights).toHaveLength(3);
    expect(brandSpotlights.every((slide) => slide.brand && slide.title && slide.image)).toBe(true);
  });

  it("cycles to the first product after the final product", () => {
    expect(nextBrandSpotlightIndex(brandSpotlights.length - 1)).toBe(0);
  });

  it("cycles back to the final product from the first product", () => {
    expect(previousBrandSpotlightIndex(0)).toBe(brandSpotlights.length - 1);
  });

  it("keeps the same product selected for a two-day UTC feature window before moving to the next", () => {
    const firstDay = getTwoDayBrandSpotlightIndex(new Date("2026-08-24T09:00:00Z"));
    expect(getTwoDayBrandSpotlightIndex(new Date("2026-08-25T23:59:59Z"))).toBe(firstDay);
    expect(getTwoDayBrandSpotlightIndex(new Date("2026-08-26T00:00:00Z"))).toBe(nextBrandSpotlightIndex(firstDay));
  });

  it("returns the UTC midnight that starts the next two-day feature window", () => {
    expect(getNextTwoDayFeatureDate(new Date("2026-08-24T12:00:00Z")).toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });
});
