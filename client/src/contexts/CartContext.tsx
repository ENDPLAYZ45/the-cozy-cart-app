import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addCartItem, cartCount, cartTotal, type CartItem, updateCartQuantity } from "@/lib/cart";
import type { CatalogProduct } from "@/lib/catalog";

type CartContextValue = { items: CartItem[]; count: number; total: number; addProduct: (product: CatalogProduct) => void; updateQuantity: (id: string, quantity: number) => void; removeProduct: (id: string) => void; clearCart: () => void };
const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "signal-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { const stored = localStorage.getItem(CART_STORAGE_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; } });
  useEffect(() => { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); }, [items]);
  const value = useMemo(() => ({ items, count: cartCount(items), total: cartTotal(items), addProduct: (product: CatalogProduct) => setItems((current) => addCartItem(current, product)), updateQuantity: (id: string, quantity: number) => setItems((current) => updateCartQuantity(current, id, quantity)), removeProduct: (id: string) => setItems((current) => current.filter((item) => item.id !== id)), clearCart: () => setItems([]) }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error("useCart must be used inside CartProvider"); return context; }
