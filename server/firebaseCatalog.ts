type FirestoreListResponse = {
  documents?: FirestoreDocument[];
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

function getStringField(fields: Record<string, FirestoreValue> | undefined, key: string) {
  return fields?.[key]?.stringValue;
}

function getNumberField(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const field = fields?.[key];
  if (typeof field?.doubleValue === "number") return field.doubleValue;
  if (typeof field?.integerValue === "string") return Number(field.integerValue);
  return undefined;
}

function getFirebaseConfig() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error("Firebase catalog configuration is incomplete");
  }

  return { projectId, apiKey };
}

/**
 * Server-only verification used by admin procedures. It never returns the API
 * key or any affiliate destination; it only confirms that the product catalog
 * is available to the application.
 */
export async function getFirebaseCatalogStatus() {
  const { projectId, apiKey } = getFirebaseConfig();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`,
  );
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("pageSize", "1");

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`Firebase catalog check failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FirestoreListResponse;
  return {
    projectId,
    reachable: true,
    hasProductRecords: Boolean(payload.documents?.length),
  } as const;
}

/**
 * Management-safe catalog overview. The server intentionally returns only
 * affiliate readiness, not the external affiliate URL, so a protected admin UI
 * can identify records needing work without exposing destinations to the client.
 */
export async function getFirebaseCatalogManagementRecords() {
  const { projectId, apiKey } = getFirebaseConfig();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`,
  );
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("pageSize", "1000");

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`Firebase catalog management read failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FirestoreListResponse;
  return (payload.documents || []).map((document) => {
    const fields = document.fields;
    const priceFields = fields?.price?.mapValue?.fields;
    return {
      id: document.name.split("/").at(-1) || "unknown",
      title: getStringField(fields, "name") || getStringField(fields, "title") || "Untitled product",
      category: getStringField(fields, "category") || "Uncategorized",
      editorialScore: getNumberField(fields, "editorialScore") ?? getNumberField(fields, "editorial_score") ?? null,
      priceAvailable: Boolean(getNumberField(priceFields, "amount") && getNumberField(priceFields, "amount")! > 0),
      affiliateReady: Boolean(getStringField(fields, "affiliate_link") || getStringField(fields, "affiliateUrl")),
    };
  });
}

// In-memory cache for public catalog to significantly improve Vercel response times
let cachedProducts: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Public catalog fetch. Returns all published products for the storefront.
 */
export async function getFirebaseCatalogProducts(includeAll = false) {
  if (!includeAll && cachedProducts && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProducts;
  }

  const { projectId, apiKey } = getFirebaseConfig();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`,
  );
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("pageSize", "1000");

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`Firebase catalog read failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FirestoreListResponse;
  
  const mapped = (payload.documents || [])
    .map((document) => {
      const fields = document.fields;
      const priceFields = fields?.price?.mapValue?.fields;
      return {
        id: document.name.split("/").at(-1) || "unknown",
        title: getStringField(fields, "name") || getStringField(fields, "title") || "Untitled product",
        category: getStringField(fields, "category") || "Other",
        brand: getStringField(fields, "brand") || "",
        description: getStringField(fields, "description") || "",
        verdict: getStringField(fields, "editorialVerdict") || getStringField(fields, "note") || "",
        bestFor: fields?.bestFor?.arrayValue?.values ? fields.bestFor.arrayValue.values.map(v => v.stringValue || "") : [],
        score: getNumberField(fields, "editorialScore") ?? getNumberField(fields, "editorial_score"),
        price: priceFields ? {
          amount: getNumberField(priceFields, "amount"),
          currency: getStringField(priceFields, "currency"),
          mrp: getNumberField(priceFields, "mrp")
        } : undefined,
        affiliateUrl: getStringField(fields, "affiliate_link") || getStringField(fields, "affiliateUrl"),
        imageUrl: getStringField(fields, "imageUrl") || (fields?.images?.arrayValue?.values ? fields.images.arrayValue.values[0]?.stringValue : undefined),
        imagePosition: `${Math.min(100, Math.max(0, getNumberField(fields, "imageFocusX") ?? 50))}% ${Math.min(100, Math.max(0, getNumberField(fields, "imageFocusY") ?? 50))}%`,
        status: getStringField(fields, "status") || "published"
      };
    })
    .filter((record) => typeof record.title === "string" && typeof record.category === "string");

  const publicProducts = mapped.filter((record) => record.status !== "draft" && record.status !== "archived");
  
  if (!includeAll) {
    cachedProducts = publicProducts;
    cacheTimestamp = Date.now();
  }
  
  if (includeAll) return mapped;
  return publicProducts;
}
export async function saveFirebaseProduct(id: string | undefined, payload: any, token?: string) {
  const { projectId, apiKey } = getFirebaseConfig();
  
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "number") fields[k] = { doubleValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(item => ({ stringValue: item })) } };
    else if (typeof v === "object") {
      const nestedFields: Record<string, FirestoreValue> = {};
      for (const [nk, nv] of Object.entries(v)) {
        if (typeof nv === "string") nestedFields[nk] = { stringValue: nv };
        else if (typeof nv === "number") nestedFields[nk] = { doubleValue: nv };
      }
      fields[k] = { mapValue: { fields: nestedFields } };
    }
  }

  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products${id ? `/${id}` : ""}`
  );
  endpoint.searchParams.set("key", apiKey);

  if (id) {
    // Without an updateMask, a PATCH completely overwrites the document!
    // We add all keys present in the payload (even nulls) to the mask.
    // Fields in the mask but absent in `fields` (e.g. skipped nulls) are deleted.
    for (const key of Object.keys(payload)) {
      endpoint.searchParams.append("updateMask.fieldPaths", key);
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: id ? "PATCH" : "POST",
    headers,
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(12_000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error(`Session expired. Please sign out and sign back in.`);
    }
    throw new Error(`Firebase save failed: ${errorText}`);
  }
  
  cachedProducts = null; // Clear cache
  
  return await response.json();
}

export async function deleteFirebaseProduct(id: string, token?: string) {
  const { projectId, apiKey } = getFirebaseConfig();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${id}`
  );
  endpoint.searchParams.set("key", apiKey);
  
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    throw new Error(`Firebase delete failed with status ${response.status}`);
  }
  
  cachedProducts = null; // Clear cache
  
  return true;
}
