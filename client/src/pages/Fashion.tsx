import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/hooks/useCatalog";
import { categoryVisuals } from "./Categories";
import SkeletonGrid from "@/components/SkeletonGrid";

export default function Fashion() {
  const { products, status } = useCatalog();
  const categoryName = "Fashion";

  const selection = useMemo(() => {
    const hashString = (str: string) => {
      let h = 0xdeadbeef;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
      }
      return (h ^ (h >>> 16)) >>> 0;
    };
    return products
      .filter(product => product.category === categoryName)
      .sort((a, b) => hashString(a.id) - hashString(b.id));
  }, [products]);

  const topProducts = useMemo(() => {
    return [...selection]
      .filter((p) => Boolean(p.imageUrl))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
  }, [selection]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [readyImages, setReadyImages] = useState<Set<string>>(() => new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set()
  );

  // Preload images
  useEffect(() => {
    let disposed = false;
    const markReady = (source: string) =>
      !disposed && setReadyImages(current => new Set(current).add(source));
    const markFailed = (source: string) =>
      !disposed && setFailedImages(current => new Set(current).add(source));

    topProducts.forEach(product => {
      const src = product.imageUrl!;
      const preload = new Image();
      const handleLoaded = () => {
        const decoded =
          typeof preload.decode === "function"
            ? preload.decode().catch(() => undefined)
            : Promise.resolve();
        void decoded.then(() => markReady(src));
      };
      preload.onload = handleLoaded;
      preload.onerror = () => markFailed(src);
      preload.src = src;
      if (preload.complete) handleLoaded();
    });
    return () => {
      disposed = true;
    };
  }, [topProducts]);

  // Rotation interval
  useEffect(() => {
    if (topProducts.length <= 1) return;
    const rotation = window.setInterval(
      () =>
        setActiveIndex(index => {
          const next = (index + 1) % topProducts.length;
          const img = topProducts[next].imageUrl!;
          return readyImages.has(img) || failedImages.has(img) ? next : index;
        }),
      7000
    );
    return () => window.clearInterval(rotation);
  }, [topProducts, readyImages, failedImages]);

  const fallbackHeroImage = categoryVisuals.Fashion;
  const activeProduct = topProducts[activeIndex];
  const activeProductImage = activeProduct?.imageUrl;
  const imageReady = activeProduct ? readyImages.has(activeProductImage) : false;
  const imageFailed = activeProduct ? failedImages.has(activeProductImage) : false;

  return (
    <StoreLayout>
      <main className="route-main">
        {topProducts.length > 0 ? (
          <section className="commerce-hero home-hero">
            <div className="home-copy">
              <div className="hero-label">
                <span className="signal-pip" /> The Fashion Edit
              </div>
              <div className="hero-row">
                <div>
                  <h1>
                    Curated Style,<br />
                    <em>effortlessly.</em>
                  </h1>
                  <p>
                    Explore our top-selling, premium fashion collection tailored for
                    your unique look.
                  </p>
                </div>
              </div>
            </div>

            <section
              className="home-visual product-spotlight premium-spotlight auto-spotlight"
              aria-label="Featured product rotation"
            >
              <div className="spotlight-topline">
                <span className="spotlight-live">
                  <i /> Featured Fashion
                </span>
              </div>
              <div
                className="spotlight-product premium-product"
                key={activeProduct.id}
              >
                <div
                  className={`spotlight-image premium-product-stage ${imageReady ? "image-ready" : "image-pending"}`}
                >
                  {!imageReady && (
                    <div
                      className="spotlight-image-empty spotlight-image-loading"
                      aria-hidden="true"
                    >
                      <span>
                        {imageFailed
                          ? "Product visual unavailable"
                          : "Preparing product visual"}
                      </span>
                      <strong>{activeProduct.brand}</strong>
                      <i />
                    </div>
                  )}
                  {activeProduct && (
                    <img
                      src={activeProductImage}
                      alt={`${activeProduct.brand} ${activeProduct.title}`}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      onLoad={() =>
                        setReadyImages(current =>
                          new Set(current).add(activeProductImage)
                        )
                      }
                      onError={() =>
                        setFailedImages(current =>
                          new Set(current).add(activeProductImage)
                        )
                      }
                    />
                  )}
                </div>
                <div className="spotlight-details premium-product-details">
                  <p>{activeProduct.brand}</p>
                  <span style={{ fontSize: "11px", color: "#666", letterSpacing: "0.5px" }}>ID: {activeProduct.id}</span>
                  <h2>{activeProduct.title}</h2>
                  <span className="spotlight-category">
                    {activeProduct.category}
                  </span>
                  <div className="product-story">
                    <span>
                      {activeProduct.bestFor[0]
                        ? `Best for ${activeProduct.bestFor[0]}`
                        : "Editorially selected"}
                    </span>
                  </div>
                  <Link href="/shop" className="spotlight-shop-button">
                    Shop Fashion <ChevronRight size={15} />
                  </Link>
                </div>
              </div>
            </section>
          </section>
        ) : (
          <section className="route-hero categories-hero">
            <div className="route-hero-copy">
              <p className="route-kicker">THE FASHION EDIT</p>
              <h1>
                Curated Style,<br />
                <em>effortlessly.</em>
              </h1>
              <p>
                Explore our top-selling, premium fashion collection tailored for
                your unique look.
              </p>
            </div>
            <div className="category-hero-visual" aria-hidden="true">
              <img
                src={fallbackHeroImage}
                alt="Fashion Header"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </section>
        )}

        <section className="route-catalog" style={{ marginTop: "40px" }}>
          <div
            className="route-result-line"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(36,47,39,.12)",
              paddingBottom: "14px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#687269",
              }}
            >
              All Fashion Items
            </span>
            <span style={{ fontSize: "10px", color: "#8a938b" }}>
              {selection.length} products
            </span>
          </div>

          {status === "loading" ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="product-grid route-grid">
              {selection.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          {status === "ready" && !selection.length && (
            <p className="route-loading">
              No fashion products available yet. Check back soon!
            </p>
          )}
        </section>
      </main>
    </StoreLayout>
  );
}
