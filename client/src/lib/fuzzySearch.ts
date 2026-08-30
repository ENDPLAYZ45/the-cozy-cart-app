import { type CatalogProduct } from "./catalog";

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export function getClosestMatches(
  products: CatalogProduct[],
  query: string,
  limit: number = 4
): CatalogProduct[] {
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 1);

  if (queryTokens.length === 0) return [];

  const scoredProducts = products.map((product) => {
    let score = 0;
    const searchableText = `${product.title} ${product.category} ${product.brand || ""} ${product.bestFor.join(" ")}`.toLowerCase();
    const productTokens = searchableText.split(/\s+/).filter(Boolean);

    for (const qToken of queryTokens) {
      // 1. Exact substring match in the full text (high score)
      if (searchableText.includes(qToken)) {
        score += 10;
        continue;
      }

      // 2. Fuzzy match against individual tokens
      let bestTokenScore = 0;
      for (const pToken of productTokens) {
        if (Math.abs(pToken.length - qToken.length) > 3) continue; // Skip lengths that are too different
        
        const dist = levenshtein(qToken, pToken);
        
        // If distance is small, award points based on how close it is
        if (dist === 1 && qToken.length > 3) {
          bestTokenScore = Math.max(bestTokenScore, 7);
        } else if (dist === 2 && qToken.length > 4) {
          bestTokenScore = Math.max(bestTokenScore, 4);
        } else if (dist <= 3 && qToken.length > 5) {
          bestTokenScore = Math.max(bestTokenScore, 2);
        }
      }
      score += bestTokenScore;
    }

    return { product, score };
  });

  return scoredProducts
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((p) => p.product)
    .slice(0, limit);
}
