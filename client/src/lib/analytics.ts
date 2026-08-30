const visitorStorageKey = "signal-analytics-visitor";
const sessionStorageKey = "signal-analytics-session";

function createOpaqueId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `signal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getStoredId(storage: Storage, key: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const next = createOpaqueId();
  storage.setItem(key, next);
  return next;
}

export function getAnalyticsIdentity() {
  if (typeof window === "undefined") return { visitorId: "server", sessionId: "server" };
  return {
    visitorId: getStoredId(window.localStorage, visitorStorageKey),
    sessionId: getStoredId(window.sessionStorage, sessionStorageKey),
  };
}
