import React from "react";

export default function ProductCardSkeleton() {
  return (
    <article className="retailer-card route-product-card skeleton-card">
      <div style={{
        position: "relative",
        width: "100%",
        paddingBottom: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }} className="skeleton-pulse" />

      <div className="card-body">
        <div className="card-meta">
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div className="skeleton-pulse" style={{ width: "60px", height: "12px", borderRadius: "4px" }} />
            <div className="skeleton-pulse" style={{ width: "40px", height: "12px", borderRadius: "4px" }} />
          </div>
          <div className="skeleton-pulse" style={{ width: "50px", height: "12px", borderRadius: "4px" }} />
        </div>
        
        <div className="skeleton-pulse" style={{ width: "90%", height: "24px", marginTop: "11px", marginBottom: "4px", borderRadius: "4px" }} />
        <div className="skeleton-pulse" style={{ width: "60%", height: "24px", marginBottom: "9px", borderRadius: "4px" }} />
        
        <div className="fit-line" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div className="skeleton-pulse" style={{ width: "14px", height: "14px", borderRadius: "50%" }} />
          <div className="skeleton-pulse" style={{ width: "100px", height: "12px", borderRadius: "4px" }} />
        </div>
        
        <div className="card-insights" style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', flexDirection: 'column' }}>
          <div className="skeleton-pulse" style={{ width: "60px", height: "20px", borderRadius: "4px" }} />
          <div className="skeleton-pulse" style={{ width: "120px", height: "14px", borderRadius: "4px", marginTop: "2px" }} />
        </div>
        
        <div className="product-note" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
          <div className="skeleton-pulse" style={{ width: "100%", height: "10px", borderRadius: "4px" }} />
          <div className="skeleton-pulse" style={{ width: "90%", height: "10px", borderRadius: "4px" }} />
        </div>
        
        <div className="card-actions">
          <div className="skeleton-pulse" style={{ flex: 1, minHeight: "34px", borderRadius: "4px" }} />
          <div className="skeleton-pulse" style={{ width: "34px", height: "34px", borderRadius: "4px" }} />
        </div>
      </div>
    </article>
  );
}
