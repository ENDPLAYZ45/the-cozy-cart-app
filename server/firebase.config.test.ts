import { describe, expect, it } from "vitest";
import { getFirebaseCatalogStatus } from "./firebaseCatalog";

describe("Firebase web configuration", () => {
  it("contacts the configured Firestore project with the supplied Firebase API key", async () => {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

    expect(apiKey).toBeTruthy();
    expect(projectId).toBeTruthy();

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents?key=${apiKey}`,
    );
    const payload = await response.text();

    expect(response.status).toBeLessThan(500);
    expect(payload.toLowerCase()).not.toContain("api key not valid");
    expect(payload.toLowerCase()).not.toContain("api_key_invalid");
  }, 15_000);

  it("exposes a server-only catalog health check without returning Firebase credentials", async () => {
    const status = await getFirebaseCatalogStatus();

    expect(status.reachable).toBe(true);
    expect(status.projectId).toBe(process.env.VITE_FIREBASE_PROJECT_ID);
    expect(JSON.stringify(status)).not.toContain(process.env.VITE_FIREBASE_API_KEY || "");
  }, 15_000);

  it("validates the configured Firebase administrator account without exposing its password", async () => {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    const email = process.env.FIREBASE_ADMIN_EMAIL;
    const publicAdminEmail = process.env.VITE_FIREBASE_ADMIN_EMAIL;
    const password = process.env.FIREBASE_ADMIN_PASSWORD;

    expect(apiKey).toBeTruthy();
    expect(email).toBeTruthy();
    expect(publicAdminEmail).toBe(email);
    expect(password).toBeTruthy();

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    const payload = (await response.json()) as { localId?: string; error?: { message?: string } };

    expect(response.ok, payload.error?.message || "Firebase Authentication validation failed").toBe(true);
    expect(payload.localId).toBeTruthy();
    expect(JSON.stringify(payload)).not.toContain(password || "");
  }, 15_000);
});
