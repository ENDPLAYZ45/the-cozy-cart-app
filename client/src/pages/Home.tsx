import React, { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Layers, ShoppingBag, Tag } from "lucide-react";
import { Link } from "wouter";
import StoreLayout from "@/components/StoreLayout";
import { brandSpotlights } from "@/lib/brandSpotlight";

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [readyImages, setReadyImages] = useState<Set<string>>(() => new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let disposed = false;
    const markReady = (source: string) => !disposed && setReadyImages((current) => new Set(current).add(source));
    const markFailed = (source: string) => !disposed && setFailedImages((current) => new Set(current).add(source));

    brandSpotlights.forEach(({ image }) => {
      const preload = new Image();
      const handleLoaded = () => {
        const decoded = typeof preload.decode === "function" ? preload.decode().catch(() => undefined) : Promise.resolve();
        void decoded.then(() => markReady(image));
      };
      preload.onload = handleLoaded;
      preload.onerror = () => markFailed(image);
      preload.src = image;
      if (preload.complete) handleLoaded();
    });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    const rotation = window.setInterval(() => setActiveIndex((index) => {
      const next = (index + 1) % brandSpotlights.length;
      return readyImages.has(brandSpotlights[next].image) || failedImages.has(brandSpotlights[next].image) ? next : index;
    }), 7000);
    return () => window.clearInterval(rotation);
  }, [readyImages, failedImages]);
  const activeProduct = brandSpotlights[activeIndex];
  const imageReady = readyImages.has(activeProduct.image);
  const imageFailed = failedImages.has(activeProduct.image);

  return <StoreLayout>
    <main className="route-main home-main">
      <section className="commerce-hero home-hero">
        <div className="home-copy">
          <div className="hero-label"><span className="signal-pip" /> Product discovery with a point of view</div>
          <div className="hero-row"><div><h1>Find products<br /><em>worth buying.</em></h1><p>The Cozy Cart brings a practical product brief, live catalog context, and approved retailer handoff into one cleaner shopping workflow.</p></div></div>
          <div className="home-actions"><Link href="/shop">Shop products <ArrowRight size={17} /></Link><Link href="/categories" className="quiet">Browse categories</Link></div>
        </div>
        <section className="home-visual product-spotlight premium-spotlight auto-spotlight" aria-label="Featured product rotation">
          <div className="spotlight-topline"><span className="spotlight-live"><i /> Featured products</span></div>
          <div className="spotlight-product premium-product" key={activeProduct.id}>
            <div className={`spotlight-image premium-product-stage ${imageReady ? "image-ready" : "image-pending"}`}>
              {!imageReady && <div className="spotlight-image-empty spotlight-image-loading" aria-hidden="true"><span>{imageFailed ? "Product visual unavailable" : "Preparing product visual"}</span><strong>{activeProduct.brand}</strong><i /></div>}
              <img src={activeProduct.image} alt={`${activeProduct.brand} ${activeProduct.title}`} loading="eager" fetchPriority="high" decoding="async" onLoad={() => setReadyImages((current) => new Set(current).add(activeProduct.image))} onError={() => setFailedImages((current) => new Set(current).add(activeProduct.image))} />
            </div>
            <div className="spotlight-details premium-product-details"><p>{activeProduct.brand}</p><h2>{activeProduct.title}</h2><span className="spotlight-category">{activeProduct.category}</span><div className="product-story"><span>{activeProduct.detail}</span></div><Link href="/shop" className="spotlight-shop-button">Explore product set <ChevronRight size={15} /></Link></div>
          </div>
        </section>
      </section>
      <section className="home-route-cards"><Link href="/shop"><ShoppingBag size={22} /><span>01</span><h2>Shop the catalog.</h2><p>Search, filter, sort, and add live products to your cart.</p><ArrowRight size={18} /></Link><Link href="/categories"><Layers size={22} /><span>02</span><h2>Browse categories.</h2><p>Start from a department, then see its product set in context.</p><ArrowRight size={18} /></Link><Link href="/deals"><Tag size={22} /><span>03</span><h2>See price context.</h2><p>Review products with current catalog pricing—without made-up discounts.</p><ArrowRight size={18} /></Link></section>
    </main>
  </StoreLayout>;
}
