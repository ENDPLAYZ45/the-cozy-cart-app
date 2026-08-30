import { describe, expect, it } from "vitest";
import { emptyProductForm, storefrontCategories, toProductWritePayload } from "./firebaseAdmin";

describe("Firebase admin product payload", () => {
  it("exposes the established storefront departments for the controlled category dropdown", () => {
    expect(storefrontCategories).toEqual([
      "Electronics",
      "Fashion",
      "Sports & Fitness",
      "Toys & Games",
      "Other"
    ]);
  });

  it("converts valid management form values into an honest Firestore product payload", () => {
    const payload = toProductWritePayload({ ...emptyProductForm, name: "Desk lamp", category: "Office", editorialScore: "8.4", priceAmount: "49", bestFor: "Work, Small desk", affiliateLink: "https://www.amazon.in/dp/example", imageUrl: "https://firebasestorage.example/lamp.webp", imageFocusX: "72", imageFocusY: "31", status: "published" });
    expect(payload).toMatchObject({ name: "Desk lamp", category: "Office", editorialScore: 8.4, price: { amount: 49, currency: "USD" }, bestFor: ["Work", "Small desk"], imageUrl: "https://firebasestorage.example/lamp.webp", images: ["https://firebasestorage.example/lamp.webp"], imageFocusX: 72, imageFocusY: 31, status: "published" });
  });

  it("keeps missing score and price as null instead of inventing values", () => {
    const payload = toProductWritePayload({ ...emptyProductForm, name: "Desk lamp", category: "Office" });
    expect(payload.editorialScore).toBeNull();
    expect(payload.price).toBeNull();
  });

  it("bounds image focal coordinates to the valid storefront crop range", () => {
    const payload = toProductWritePayload({ ...emptyProductForm, name: "Desk lamp", category: "Office", imageFocusX: "-6", imageFocusY: "150" });
    expect(payload.imageFocusX).toBe(0);
    expect(payload.imageFocusY).toBe(100);
  });
});
