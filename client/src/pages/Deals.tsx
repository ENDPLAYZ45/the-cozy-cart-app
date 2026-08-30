import { useState } from "react";
import { CircleCheck, Tag } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/hooks/useCatalog";
import type { CatalogProduct } from "@shared/schema";
import SkeletonGrid from "@/components/SkeletonGrid";

export default function Deals() {
  const { products, status } = useCatalog();
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const dealsProducts = products
    .filter(product => product.price?.amount && product.price.amount > 0 && product.price.amount < 250)
    .sort((a, b) => (b.score || -1) - (a.score || -1));

  const dealsByCategory = dealsProducts.reduce((acc, product) => {
    const cat = product.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, CatalogProduct[]>);

  const allCategories = Object.keys(dealsByCategory).sort();
  const visibleCategories = selectedCategory === "All" ? allCategories : allCategories.filter(c => c === selectedCategory);

  return (
    <StoreLayout>
      <main className="route-main">
        <section className="route-hero deals-hero">
          <div className="route-hero-copy">
            <p className="route-kicker">THE COZY CART / DEALS</p>
            <h1>
              Quality finds,
              <br />
              <em>under ₹250.</em>
            </h1>
            <p>
              These are live catalog products available for under ₹250. The Cozy Cart does
              not invent discounts, strike-through prices, or urgency claims.
            </p>
            <div className="deal-principles">
              <span>
                <CircleCheck size={16} /> Price is supplied by catalog data
              </span>
              <span>
                <CircleCheck size={16} /> Retailer details are verified at handoff
              </span>
            </div>
          </div>
          <div className="deals-hero-visual" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </section>
        <section className="route-catalog">
          <div className="route-toolbar">
            <div className="category-tabs">
              {["All", ...allCategories].map(item => (
                <button
                  key={item}
                  className={selectedCategory === item ? "active" : ""}
                  onClick={() => setSelectedCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="route-result-line">
            <span>
              <Tag size={15} /> Deals under ₹250
            </span>
            <span>{dealsProducts.length} products</span>
          </div>
          {status === "loading" ? (
            <SkeletonGrid count={4} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 48, marginTop: 10 }}>
              {visibleCategories.map(category => (
                <div key={category}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: "#202620", borderBottom: "1px solid rgba(32,38,32,0.13)", paddingBottom: 10 }}>
                    {category} <span style={{ color: "#888c84", fontSize: 14, fontWeight: 500, marginLeft: 8 }}>({dealsByCategory[category].length})</span>
                  </h2>
                  <div className="product-grid route-grid">
                    {dealsByCategory[category].map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {status === "ready" && !dealsProducts.length && (
            <p className="route-loading">
              No catalog products are currently priced under ₹250. Update price
              data in Admin to populate this page.
            </p>
          )}
        </section>
      </main>
    </StoreLayout>
  );
}
