import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/hooks/useCatalog";
import { categoryVisuals } from "./Categories";
import SkeletonGrid from "@/components/SkeletonGrid";

export default function CategoryDetail({
  params,
}: {
  params: { name: string };
}) {
  const { products, status } = useCatalog();
  const categoryName = decodeURIComponent(params.name);

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
  }, [products, categoryName]);

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

  const fallbackHeroImage =
    categoryVisuals[categoryName] || categoryVisuals.Electronics;
  const activeProduct = topProducts[activeIndex];
  const activeProductImage = activeProduct?.imageUrl;
  const imageReady = activeProduct ? readyImages.has(activeProductImage) : false;
  const imageFailed = activeProduct ? failedImages.has(activeProductImage) : false;

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryName]);

  const totalPages = Math.max(1, Math.ceil(selection.length / ITEMS_PER_PAGE));
  const paginatedSelection = useMemo(() => {
    return selection.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [selection, currentPage]);

  return (
    <StoreLayout>
      <main className="route-main">
        {/* If we have top products with images, use the rotating spotlight hero, else fallback to category poster */}
        {topProducts.length > 0 ? (
          <section className="commerce-hero home-hero">
            <div className="home-copy">
              <Link
                href="/categories"
                className="back-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#687269",
                  textDecoration: "none",
                  marginBottom: "16px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                <ArrowLeft size={14} /> Back to Categories
              </Link>
              <div className="hero-label">
                <span className="signal-pip" /> {categoryName} Category
              </div>
              <div className="hero-row">
                <div>
                  <h1>
                    {categoryName},<br />
                    <em>narrowed down.</em>
                  </h1>
                  <p>
                    Explore the best products we've curated for{" "}
                    {categoryName.toLowerCase()}.
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
                  <i /> Top Products in {categoryName}
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
                    Shop {categoryName} <ChevronRight size={15} />
                  </Link>
                </div>
              </div>
            </section>
          </section>
        ) : (
          <section className="route-hero categories-hero">
            <div className="route-hero-copy">
              <Link
                href="/categories"
                className="back-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#687269",
                  textDecoration: "none",
                  marginBottom: "16px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                <ArrowLeft size={14} /> Back to Categories
              </Link>
              <p className="route-kicker">CATEGORY</p>
              <h1>
                {categoryName},<br />
                <em>narrowed down.</em>
              </h1>
              <p>
                Explore the full catalog of {categoryName.toLowerCase()}{" "}
                products.
              </p>
            </div>
            <div className="category-hero-visual" aria-hidden="true">
              <img
                src={fallbackHeroImage}
                alt=""
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
              {categoryName} Products
            </span>
            <span style={{ fontSize: "10px", color: "#8a938b" }}>
              {selection.length} products
            </span>
          </div>

          {status === "loading" ? (
            <SkeletonGrid count={8} />
          ) : (
            <div className="product-grid route-grid">
              {paginatedSelection.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', padding: '20px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <button 
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                style={{ padding: '8px 16px', background: currentPage === 1 ? '#e1e1e1' : '#202620', color: currentPage === 1 ? '#a1a1a1' : '#fff', border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 11, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#687269' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                style={{ padding: '8px 16px', background: currentPage === totalPages ? '#e1e1e1' : '#202620', color: currentPage === totalPages ? '#a1a1a1' : '#fff', border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 11, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
          
          {status === "ready" && !selection.length && (
            <p className="route-loading">
              No products found for this category.
            </p>
          )}
        </section>
      </main>
    </StoreLayout>
  );
}
