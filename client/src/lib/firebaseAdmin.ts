export const storefrontCategories = [
  "Electronics",
  "Accessories",
  "Fashion",
  "Sports & Fitness",
  "Toys & Games",
  "Other"
] as const;

export type ProductFormState = {
  id?: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  editorialVerdict: string;
  editorialScore: string;
  priceAmount: string;
  mrpAmount: string;
  priceCurrency: string;
  bestFor: string;
  affiliateLink: string;
  imageUrl: string;
  imageFocusX: string;
  imageFocusY: string;
  status: "draft" | "published" | "archived";
};

export const emptyProductForm: ProductFormState = {
  name: "", category: "", brand: "", description: "", editorialVerdict: "", editorialScore: "", priceAmount: "", mrpAmount: "", priceCurrency: "USD", bestFor: "", affiliateLink: "", imageUrl: "", imageFocusX: "50", imageFocusY: "50", status: "draft",
};



export function toProductWritePayload(form: ProductFormState) {
  const editorialScore = Number(form.editorialScore);
  // Remove commas, currency symbols, and spaces from the price input
  const cleanPrice = form.priceAmount.toString().replace(/[^0-9.]/g, '');
  const priceAmount = Number(cleanPrice);
  const cleanMrp = (form.mrpAmount || "").toString().replace(/[^0-9.]/g, '');
  const mrpAmount = Number(cleanMrp);
  const imageFocusX = Number(form.imageFocusX);
  const imageFocusY = Number(form.imageFocusY);
  const boundedFocus = (value: number, fallback: number) => Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
  
  const priceObj: any = { amount: priceAmount, currency: form.priceCurrency.trim().toUpperCase() || "USD" };
  if (Number.isFinite(mrpAmount) && mrpAmount > 0) {
    priceObj.mrp = mrpAmount;
  }

  return {
    name: form.name.trim(),
    category: form.category.trim(),
    brand: form.brand.trim(),
    description: form.description.trim(),
    editorialVerdict: form.editorialVerdict.trim(),
    editorialScore: Number.isFinite(editorialScore) && editorialScore > 0 ? editorialScore : null,
    price: Number.isFinite(priceAmount) && priceAmount > 0 ? priceObj : null,
    bestFor: form.bestFor.split(",").map((item) => item.trim()).filter(Boolean),
    affiliate_link: form.affiliateLink.trim(),
    imageUrl: form.imageUrl.trim() || null,
    images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
    imageFocusX: boundedFocus(imageFocusX, 50),
    imageFocusY: boundedFocus(imageFocusY, 50),
    status: form.status,
  };
}
