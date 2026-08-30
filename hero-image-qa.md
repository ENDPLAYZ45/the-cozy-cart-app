# Hero Image and Admin Access QA

## Asset readiness

The critical homepage, Shop, Categories, and Deals images now use browser image preloads. The Categories hero asset resolves as a complete 1920 × 1280 WebP image through the managed storage route. The Deals product image, Shop fashion image, and homepage spotlight image also resolve as complete image media. The remaining category-card images are prefetched at startup and rendered eagerly on the Categories route.

## Desktop review

The Categories hero maintains clear left-aligned heading and supporting copy, with a fully visible editorial electronics image on the right. The category-card grid begins below without overlap. The Deals hero keeps its dark price-context treatment and readable white/tangerine type; the product visual is contained on the right with no invented price or promotional text. The `/admin` route opens the Firebase sign-in screen with only safe approval guidance and never displays credentials.

## Mobile review

On mobile, both hero sections present heading and supporting copy first, then a full-width visual panel. The Categories image and Deals product image remain within their frames without clipping or text overlap, and the price-context controls remain readable before the image.
