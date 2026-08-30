import { useMemo } from "react";
import { type CatalogProduct } from "@/lib/catalog";
import { trpc } from "@/lib/trpc";

export function useCatalog() {
  const { data: products = [], isLoading, isError } = trpc.catalog.getProducts.useQuery(undefined, {
    staleTime: 60 * 1000 * 5, // 5 minutes
  });

  const status = isLoading ? "loading" : isError ? "error" : products.length ? "ready" : "empty";

  const categories = useMemo(() => {
    const derived = products.map((item) => item.category);
    const unique = Array.from(new Set(["Electronics", "Accessories", "Fashion", "Sports & Fitness", "Toys & Games", "Other", ...derived]));
    const standard = unique.filter(c => c !== "Other").sort();
    if (unique.includes("Other")) {
      standard.push("Other");
    }
    return standard;
  }, [products]);

  return { products: products as CatalogProduct[], categories, status };
}
