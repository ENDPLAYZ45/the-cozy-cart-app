import type { CatalogProduct } from "./catalog";

export type CartItem = Pick<CatalogProduct, "id" | "title" | "price" | "affiliateUrl" | "imageUrl" | "imagePosition" | "category"> & { quantity: number };

export function addCartItem(items: CartItem[], product: CatalogProduct) {
  const existing = items.find((item) => item.id === product.id);
  if (existing) return items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
  return [...items, { id: product.id, title: product.title, price: product.price, affiliateUrl: product.affiliateUrl, imageUrl: product.imageUrl, imagePosition: product.imagePosition, category: product.category, quantity: 1 }];
}

export function updateCartQuantity(items: CartItem[], id: string, quantity: number) {
  if (quantity <= 0) return items.filter((item) => item.id !== id);
  return items.map((item) => item.id === id ? { ...item, quantity } : item);
}

export function cartCount(items: CartItem[]) { return items.reduce((total, item) => total + item.quantity, 0); }
export function cartTotal(items: CartItem[]) { return items.reduce((total, item) => total + ((item.price?.amount || 0) * item.quantity), 0); }
