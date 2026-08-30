import { describe, expect, it } from "vitest";
import { addCartItem, cartCount, cartTotal, updateCartQuantity } from "./cart";

const product = { id: "p1", title: "Desk lamp", category: "Office", description: "", verdict: "", bestFor: [], price: { amount: 49, currency: "USD" } };

describe("cart helpers", () => {
  it("adds duplicate products by increasing quantity", () => {
    expect(addCartItem(addCartItem([], product), product)).toMatchObject([{ id: "p1", quantity: 2 }]);
  });
  it("updates quantities, removes zero-quantity items, and calculates summary values", () => {
    const items = updateCartQuantity(addCartItem([], product), "p1", 3);
    expect(cartCount(items)).toBe(3);
    expect(cartTotal(items)).toBe(147);
    expect(updateCartQuantity(items, "p1", 0)).toEqual([]);
  });
});
