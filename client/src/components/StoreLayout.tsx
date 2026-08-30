import { Heart, LockKeyhole, Menu, ShoppingBag, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import TermsAndConditions from "./TermsAndConditions";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Fashion", href: "/fashion" },
  { label: "Categories", href: "/categories" },
  { label: "Deals", href: "/deals" },
];

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useCart();
  return (
    <div className="store-shell">
      <a href="https://phantoid.bond" target="_blank" rel="noopener noreferrer" className="phantoid-banner">
        <div className="phantoid-banner-content">
          <img src="/phantoid-icon.png" alt="" className="phantoid-icon" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span>Love movies? Check out <strong>Phantoid</strong> for free web series and anime! →</span>
          <img src="/phantoid-logo.png" alt="" className="phantoid-logo" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>
      </a>
      <header className="store-header">
        <Link href="/" className="store-brand">
          <img src="/logo.png" alt="The Cozy Cart Logo" />
          <span>The Cozy Cart</span>
          <small>SHOPPING INTELLIGENCE</small>
        </Link>
        <nav className="store-nav" aria-label="Main navigation">
          {navigation.map(item => (
            <Link
              href={item.href}
              className={location === item.href ? "active" : ""}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-controls">
          <Link
            href="/cart"
            className={`cart-link ${location === "/cart" ? "active" : ""}`}
          >
            <ShoppingBag size={17} />
            <span>Cart</span>
            {count > 0 && <b>{count}</b>}
          </Link>
          <button
            className="mobile-menu-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen(open => !open)}
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      {mobileOpen && (
        <nav className="mobile-nav route-nav" aria-label="Mobile navigation">
          {navigation.map(item => (
            <Link
              href={item.href}
              onClick={() => setMobileOpen(false)}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setMobileOpen(false)}>
            <ShoppingBag size={15} /> Cart {count ? `(${count})` : ""}
          </Link>
          <Link href="/admin" onClick={() => setMobileOpen(false)}>
            <LockKeyhole size={15} /> Admin sign in
          </Link>
        </nav>
      )}
      {children}
      <footer className="commerce-footer">
        <div className="footer-story">
          <div className="footer-brand">
            <img src="/logo.png" alt="The Cozy Cart Logo" />
            <span>The Cozy Cart</span>
          </div>
          <p>
            Clearer product discovery for people who prefer practical context
            over noisy shopping pressure.
          </p>
        </div>
        <div className="footer-link-group">
          <span>Explore</span>
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/fashion">Fashion</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/deals">Deals</Link>
          <Dialog>
            <DialogTrigger asChild>
              <button style={{ background: "none", border: "none", padding: 0, color: "#535a53", fontSize: "11px", fontWeight: 800, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>Terms & Conditions</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Terms & Conditions</DialogTitle>
                <DialogDescription asChild>
                  <TermsAndConditions />
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
        <div className="footer-link-group">
          <span>Your shortlist</span>
          <Link href="/cart">Cart {count ? `(${count})` : ""}</Link>
          <p>
            Prices and availability are confirmed with the retailer before
            purchase.
          </p>
        </div>
        <div className="footer-admin-panel">
          <LockKeyhole size={16} />
          <div>
            <span>Catalog team</span>
            <p>Manage published products and approved retailer destinations.</p>
            <Link href="/admin">Admin sign in</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            The Cozy Cart is an independent shopping discovery platform. As an Amazon
            Associate, The Cozy Cart may earn from qualifying purchases. Product
            claims, pricing, availability, and links should be verified before
            publication.
          </p>
          <span>© 2026 The Cozy Cart</span>
        </div>
      </footer>
    </div>
  );
}
