import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import StoreLayout from "@/components/StoreLayout";
import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/hooks/useCatalog";
import { getAnalyticsIdentity } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { getClosestMatches } from "@/lib/fuzzySearch";
import SkeletonGrid from "@/components/SkeletonGrid";

export default function Shop() {
  const { products, categories, status } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Recommended");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [sortOpen, setSortOpen] = useState(false);
  const sortOptions = ["Recommended", "Price: low", "A–Z"];
  const recordAnalytics = trpc.analytics.record.useMutation();
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const timeout = window.setTimeout(() => {
      const { visitorId, sessionId } = getAnalyticsIdentity();
      recordAnalytics.mutate({
        visitorId,
        sessionId,
        eventType: "search",
        route: "/shop",
        searchTerm: term,
      });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [query]);
  const selectCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    if (nextCategory !== "All") {
      const { visitorId, sessionId } = getAnalyticsIdentity();
      recordAnalytics.mutate({
        visitorId,
        sessionId,
        eventType: "category_interest",
        route: "/shop",
        category: nextCategory,
      });
    }
  };
  const visible = useMemo(() => {
    const searchTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(t => {
        if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
        if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
        return t;
      });

    let next = products.filter(item => {
      if (category !== "All" && item.category !== category) return false;
      if (searchTokens.length === 0) return true;
      
      const text = `${item.id} ${item.title} ${item.category} ${item.brand || ""} ${item.bestFor.join(" ")}`.toLowerCase();
      
      return searchTokens.every(t => {
        const t2 = t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t;
        return text.includes(t) || text.includes(t2);
      });
    });

    if (sort === "Price: low") {
      next = [...next].sort(
        (a, b) => (a.price?.amount || Infinity) - (b.price?.amount || Infinity)
      );
    } else if (sort === "A–Z") {
      next = [...next].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Recommended sort: deterministic shuffle so items are mixed up
      const hashString = (str: string) => {
        let h = 0xdeadbeef;
        for (let i = 0; i < str.length; i++) {
          h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
        }
        return (h ^ (h >>> 16)) >>> 0;
      };
      next = [...next].sort((a, b) => hashString(a.id) - hashString(b.id));
    }
    
    return next;
  }, [products, category, query, sort]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, sort]);

  const totalPages = Math.ceil(visible.length / ITEMS_PER_PAGE);
  const paginatedVisible = visible.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const closestMatches = useMemo(() => {
    if (visible.length > 0 || !query.trim()) return [];
    const pool = category === "All" ? products : products.filter(p => p.category === category);
    return getClosestMatches(pool, query, 4);
  }, [visible.length, query, category, products]);
  return (
    <StoreLayout>
      <main className="route-main">
        <section className="route-hero shop-hero">
          <div className="shop-hero-content">
            <p className="route-kicker">THE COZY CART / SHOP</p>
            <h1>
              Shop with a<br />
              <em>clear brief.</em>
            </h1>
            <p className="shop-hero-copy">
              Search the live product catalog, compare the criteria that matter,
              then use an approved retailer destination when you are ready.
            </p>
            <div className="route-search">
              <Search size={19} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search product, category, or use case"
              />
            </div>
          </div>
          <div className="shop-fashion-visual" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80"
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
              {["All", ...categories].map(item => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => selectCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="sort-menu">
              <button
                className="sort-trigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen(open => !open)}
              >
                <span>Sort by</span>
                <strong>{sort}</strong>
                <ChevronDown size={15} className={sortOpen ? "open" : ""} />
              </button>
              {sortOpen && (
                <div
                  className="sort-options"
                  role="listbox"
                  aria-label="Sort products"
                >
                  {sortOptions.map(option => (
                    <button
                      role="option"
                      aria-selected={sort === option}
                      key={option}
                      onClick={() => {
                        setSort(option);
                        setSortOpen(false);
                      }}
                    >
                      {sort === option && <Check size={14} />}
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="route-result-line">
            <span>
              {category === "All"
                ? "Full product catalog"
                : `${category} products`}
            </span>
            <span>{visible.length} products</span>
          </div>
          {status === "loading" ? (
            <SkeletonGrid count={8} />
          ) : status === "error" ? (
            <p className="route-loading">
              The catalog is not currently available. Please refresh and try
              again.
            </p>
          ) : (
            <>
              <div className="product-grid route-grid">
                {paginatedVisible.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginTop: 40, alignItems: 'center' }}>
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '8px 16px', background: currentPage === 1 ? '#e1e1e1' : '#202620', color: currentPage === 1 ? '#a1a1a1' : '#fff', border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 11, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6a726a' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '8px 16px', background: currentPage === totalPages ? '#e1e1e1' : '#202620', color: currentPage === totalPages ? '#a1a1a1' : '#fff', border: 'none', borderRadius: 4, fontWeight: 800, fontSize: 11, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
          {status === "ready" && !visible.length && closestMatches.length === 0 && (
            <p className="route-loading">
              No product matches that brief. Try another category or a broader
              search.
            </p>
          )}
          {status === "ready" && !visible.length && closestMatches.length > 0 && (
            <div className="closest-matches-section">
              <p className="route-loading" style={{ marginBottom: 15, color: '#ff5a36', fontWeight: 800 }}>
                We couldn't find an exact match for "{query}". Here are the closest products we found:
              </p>
              <div className="product-grid route-grid">
                {closestMatches.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </StoreLayout>
  );
}
