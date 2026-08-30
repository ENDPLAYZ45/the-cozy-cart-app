export type CompareOutcome = "added" | "removed" | "limit";

export function updateCompareSelection(current: string[], productId: string, limit = 4) {
  if (current.includes(productId)) {
    return { items: current.filter((item) => item !== productId), outcome: "removed" as const };
  }
  if (current.length >= limit) {
    return { items: current, outcome: "limit" as const };
  }
  return { items: [...current, productId], outcome: "added" as const };
}

export function resolveRetailerAction(affiliateUrl?: string) {
  if (!affiliateUrl) return { kind: "missing" as const };
  return { kind: "open" as const, url: affiliateUrl };
}
