import React from "react";
import { ExternalLink, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { formatCatalogPrice, type CatalogProduct } from "@/lib/catalog";
import { resolveRetailerAction } from "@/lib/catalogInteractions";

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const { addProduct } = useCart();
  const retailerHandoff = () => {
    const action = resolveRetailerAction(product.affiliateUrl);
    if (action.kind === "missing") return toast.message(`${product.title} needs its approved Amazon destination.`);
    window.open(action.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="retailer-card route-product-card">
      {/* Image wrapper — always square, always filled */}
      <div style={{
        position: "relative",
        width: "100%",
        paddingBottom: "100%", /* creates the 1:1 square */
        overflow: "hidden",
        background: "#f0ede6",
        flexShrink: 0,
      }}>
        {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: product.category === "Fashion" ? "contain" : "cover",
                objectPosition: product.imagePosition || "center",
                backgroundColor: product.category === "Fashion" ? "#ffffff" : "transparent",
              }}
            />
        ) : (
          <>
            <span className="art-shadow" />
            <span className="art-object" />
            <span className="art-detail" />
          </>
        )}
      </div>

      {/* Card body — sits directly below the image, no gap */}
      <div className="card-body">
        <div className="card-meta">
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>{product.category}</span>
            {product.brand && <b>{product.brand}</b>}
          </div>
          <span style={{ fontSize: "11px", color: "#666", letterSpacing: "0.5px" }}>ID: {product.id}</span>
        </div>
        <h3>{product.title}</h3>
        <p className="fit-line">
          <Sparkles size={14} />
          {" "}{product.bestFor[0] ? `Best for ${product.bestFor[0]}` : "Editorially selected"}
        </p>
        <div className="card-insights">
          <span className={product.price?.amount ? "price-present" : ""}>
            {formatCatalogPrice(product)}
          </span>
          {product.price?.amount && product.price?.mrp && product.price.mrp > product.price.amount && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ textDecoration: 'line-through', color: '#565959', fontSize: '12px' }}>
                M.R.P: {new Intl.NumberFormat("en-IN", { style: "currency", currency: product.price.currency || "INR", maximumFractionDigits: 0 }).format(product.price.mrp)}
              </span>
              <span style={{ color: '#CC0C39', fontSize: '13px' }}>
                ({Math.round(((product.price.mrp - product.price.amount) / product.price.mrp) * 100)}% off)
              </span>
            </div>
          )}
        </div>
        <p className="product-note">{product.verdict}</p>
        <div className="card-actions">
          <button className="amazon-cta" onClick={retailerHandoff}>
            View on Amazon <ExternalLink size={14} />
          </button>
          <button
            className="add-cart"
            onClick={() => { addProduct(product); toast.success("Added to cart"); }}
            aria-label={`Add ${product.title} to cart`}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
