import React from "react";
import ProductCardSkeleton from "./ProductCardSkeleton";

export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid route-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
