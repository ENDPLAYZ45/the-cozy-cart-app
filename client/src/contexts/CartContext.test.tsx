/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartProvider, useCart } from "./CartContext";

const product = { id: "cart-test", title: "Cart test lamp", category: "Office", description: "", verdict: "", bestFor: [], price: { amount: 49, currency: "USD" } };

function RouteHarness() {
  const { addProduct, count } = useCart();
  return <div><button onClick={() => addProduct(product)}>Add product</button><button>Shop</button><button>Categories</button><button>Deals</button><output data-testid="cart-count">{count}</output></div>;
}

function CartCount() { return <output data-testid="rehydrated-count">{useCart().count}</output>; }

describe("shared storefront cart", () => {
  it("keeps cart state available across public route controls and restores it from localStorage", () => {
    localStorage.clear();
    const first = render(<CartProvider><RouteHarness /></CartProvider>);
    fireEvent.click(screen.getByText("Add product"));
    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    fireEvent.click(screen.getByText("Shop"));
    fireEvent.click(screen.getByText("Categories"));
    fireEvent.click(screen.getByText("Deals"));
    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    first.unmount();
    render(<CartProvider><CartCount /></CartProvider>);
    expect(screen.getByTestId("rehydrated-count").textContent).toBe("1");
  });
});
