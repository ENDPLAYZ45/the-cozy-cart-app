export type BudgetFilter = "all" | "under50" | "50to150" | "over150" | "unavailable";

export type FilterableCatalogProduct = {
  price?: { amount?: number; currency?: string };
  bestFor?: string[];
  fit?: string;
  category?: string;
};

export function isUsablePrice(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function matchesBudget<T extends FilterableCatalogProduct>(product: T, budget: BudgetFilter) {
  const price = product.price?.amount;
  if (budget === "all") return true;
  if (!isUsablePrice(price)) return budget === "unavailable";
  const usablePrice = price as number;
  if (budget === "under50") return usablePrice < 50;
  if (budget === "50to150") return usablePrice >= 50 && usablePrice <= 150;
  return usablePrice > 150;
}

export function matchesWorkUseCase<T extends FilterableCatalogProduct>(product: T, workOnly: boolean) {
  if (!workOnly) return true;
  const searchableText = [
    ...(product.bestFor || []),
    product.fit || "",
    product.category || "",
  ].join(" ").toLowerCase();
  return /work|office|professional|desk|productiv|business|creator/.test(searchableText);
}

export function formatCatalogPrice(product: FilterableCatalogProduct) {
  const { amount, currency } = product.price || {};
  if (!isUsablePrice(amount)) return "Price unavailable";
  const usableAmount = amount as number;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(usableAmount);
  } catch {
    return `${currency || "USD"} ${usableAmount}`;
  }
}
