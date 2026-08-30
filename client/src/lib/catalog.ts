export type CatalogProduct = {
  id: string;
  title: string;
  category: string;
  brand?: string;
  description: string;
  verdict: string;
  bestFor: string[];
  score?: number;
  price?: { amount?: number; currency?: string; mrp?: number };
  affiliateUrl?: string;
  imageUrl?: string;
  imagePosition?: string;
};

export function isPriceAvailable(product: Pick<CatalogProduct, "price">) {
  return Boolean(product.price?.amount && product.price.amount > 0);
}

export function formatCatalogPrice(product: Pick<CatalogProduct, "price">) {
  if (!isPriceAvailable(product)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(product.price?.amount || 0);
  } catch {
    return `₹${product.price?.amount}`;
  }
}

/** Prefer real product imagery in editorial placements; never substitute a made-up product image. */
export function getSpotlightProducts(products: CatalogProduct[]) {
  const withImages = products.filter((product) => Boolean(product.imageUrl));
  return withImages.length ? withImages : products;
}
