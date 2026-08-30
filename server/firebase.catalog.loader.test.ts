import { afterAll, describe, expect, it } from "vitest";
import { loadFirebaseCatalog } from "../client/src/lib/firebase";

const apiKey = process.env.VITE_FIREBASE_API_KEY!;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID!;
const email = process.env.FIREBASE_ADMIN_EMAIL!;
const password = process.env.FIREBASE_ADMIN_PASSWORD!;
const documentId = `__signal_loader_${Date.now()}`;
const documentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${documentId}`;
let idToken = "";
let created = false;

async function writeStatus(status: "draft" | "published" | "archived") {
  const response = await fetch(documentUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields: { name: { stringValue: "Signal loader validation" }, category: { stringValue: "System" }, status: { stringValue: status } } }),
  });
  expect(response.ok).toBe(true);
  created = true;
}

describe("live storefront Firebase catalog loader", () => {
  it("shows only published records across draft, published, and archived lifecycle states", async () => {
    const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    expect(authResponse.ok).toBe(true);
    idToken = (await authResponse.json()).idToken;

    await writeStatus("draft");
    expect((await loadFirebaseCatalog()).some((record) => record.id === documentId)).toBe(false);

    await writeStatus("published");
    expect((await loadFirebaseCatalog()).some((record) => record.id === documentId)).toBe(true);

    await writeStatus("archived");
    expect((await loadFirebaseCatalog()).some((record) => record.id === documentId)).toBe(false);
  }, 30_000);
});

afterAll(async () => {
  if (!created || !idToken) return;
  const response = await fetch(documentUrl, { method: "DELETE", headers: { Authorization: `Bearer ${idToken}` } });
  expect(response.ok).toBe(true);
});
