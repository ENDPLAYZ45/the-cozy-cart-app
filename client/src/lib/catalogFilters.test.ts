import { describe, expect, it } from "vitest";
import { formatCatalogPrice, matchesBudget, matchesWorkUseCase } from "./catalogFilters";
import { resolveRetailerAction, updateCompareSelection } from "./catalogInteractions";

const workProduct = {
  price: { amount: 49, currency: "USD" },
  bestFor: ["Office work"],
  category: "Electronics",
};

describe("catalog filters", () => {
  it("applies budget bands only when a reliable catalog price exists", () => {
    expect(matchesBudget(workProduct, "under50")).toBe(true);
    expect(matchesBudget(workProduct, "50to150")).toBe(false);
    expect(matchesBudget({ price: { amount: 0, currency: "USD" } }, "unavailable")).toBe(true);
    expect(matchesBudget({ price: { amount: 0, currency: "USD" } }, "under50")).toBe(false);
  });

  it("recognizes structured work-use-case language without fabricating a match", () => {
    expect(matchesWorkUseCase(workProduct, true)).toBe(true);
    expect(matchesWorkUseCase({ bestFor: ["Family game night"], category: "Toys & Games" }, true)).toBe(false);
  });

  it("formats usable prices and labels unavailable values honestly", () => {
    expect(formatCatalogPrice(workProduct)).toBe("$49");
    expect(formatCatalogPrice({ price: { amount: 0, currency: "USD" } })).toBe("Price unavailable");
  });

  it("adds and removes compare selections without exceeding the supported limit", () => {
    expect(updateCompareSelection(["one"], "two")).toEqual({ items: ["one", "two"], outcome: "added" });
    expect(updateCompareSelection(["one", "two"], "two")).toEqual({ items: ["one"], outcome: "removed" });
    expect(updateCompareSelection(["one", "two", "three", "four"], "five")).toEqual({ items: ["one", "two", "three", "four"], outcome: "limit" });
  });

  it("opens only an approved retailer destination and retains a safe fallback otherwise", () => {
    expect(resolveRetailerAction("https://www.amazon.in/dp/example")).toEqual({ kind: "open", url: "https://www.amazon.in/dp/example" });
    expect(resolveRetailerAction()).toEqual({ kind: "missing" });
  });
});
