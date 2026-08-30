import React from "react";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/hooks/useCatalog";
import { getAnalyticsIdentity } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";

export const categoryVisuals: Record<string, string> = {
  Electronics:
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80",
  Accessories:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
  Fashion:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80",
  "Sports & Fitness":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
  "Toys & Games":
    "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80",
  Other:
    "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=800&q=80",
};

function getCategoryVisual(category: string) {
  return categoryVisuals[category] || categoryVisuals.Other;
}

export default function Categories() {
  const { products, categories, status } = useCatalog();
  const [, setLocation] = useLocation();
  const recordAnalytics = trpc.analytics.record.useMutation();
  const getBestProductImage = (category: string) => {
    return getCategoryVisual(category);
  };

  return (
    <StoreLayout>
      <main className="route-main">
        <section className="route-hero categories-hero">
          <div className="route-hero-copy">
            <p className="route-kicker">THE COZY CART / CATEGORIES</p>
            <h1>
              Browse by the
              <br />
              <em>job to do.</em>
            </h1>
            <p>
              Every category is built from the live catalog. Choose a department
              to narrow the product set without leaving the shopping flow.
            </p>
          </div>
          <div className="category-hero-visual" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80"
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </section>
        <section className="category-route">
          <div className="category-index">
            {status === "loading" ? (
              <p className="route-loading">Loading category index…</p>
            ) : (
              categories.map((category, index) => {
                const count = products.filter(
                  product => product.category === category
                ).length;
                return (
                  <button
                    className=""
                    onClick={() => {
                      const { visitorId, sessionId } = getAnalyticsIdentity();
                      recordAnalytics.mutate({
                        visitorId,
                        sessionId,
                        eventType: "category_interest",
                        route: "/categories",
                        category,
                      });
                      if (category === "Fashion") {
                        setLocation("/fashion");
                      } else {
                        setLocation(`/category/${encodeURIComponent(category)}`);
                      }
                    }}
                    key={category}
                  >
                    <img
                      className="category-image"
                      src={getBestProductImage(category)}
                      alt=""
                      loading="eager"
                      decoding="async"
                    />
                    <span className="category-shade" />
                    <div className="category-card-content">
                      <span>0{index + 1}</span>
                      <strong>{category}</strong>
                      <small>{count} products</small>
                      <ArrowRight size={17} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>
    </StoreLayout>
  );
}
