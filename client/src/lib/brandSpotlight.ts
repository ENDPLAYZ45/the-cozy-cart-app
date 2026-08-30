export const brandSpotlights = [
  { id: "audio", brand: "Audio Gear", title: "Premium Headphones", category: "Wireless headphones", detail: "Noise-cancelling audio", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80" },
  { id: "footwear", brand: "Footwear", title: "Running Shoes", category: "Lifestyle footwear", detail: "Dynamic cushioning", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80" },
  { id: "wearables", brand: "Wearables", title: "Smart Watch", category: "Wearables", detail: "Health tracking", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" },
] as const;

export function nextBrandSpotlightIndex(currentIndex: number) {
  return (currentIndex + 1) % brandSpotlights.length;
}

export function previousBrandSpotlightIndex(currentIndex: number) {
  return (currentIndex - 1 + brandSpotlights.length) % brandSpotlights.length;
}

const dayMs = 24 * 60 * 60 * 1000;
const featureCampaignStart = Date.UTC(2026, 7, 24);

function getFeatureWindow(date: Date) {
  const utcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcMidnight - featureCampaignStart) / dayMs / 2);
}

/** Uses UTC day windows so every visitor sees the same featured product for two full calendar days. */
export function getTwoDayBrandSpotlightIndex(date = new Date()) {
  const window = getFeatureWindow(date);
  return ((window % brandSpotlights.length) + brandSpotlights.length) % brandSpotlights.length;
}

export function getNextTwoDayFeatureDate(date = new Date()) {
  return new Date(featureCampaignStart + (getFeatureWindow(date) + 1) * 2 * dayMs);
}
