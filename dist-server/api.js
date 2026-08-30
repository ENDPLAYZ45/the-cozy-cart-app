// api-src/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  eventType: mysqlEnum("eventType", ["page_view", "search", "category_interest"]).notNull(),
  route: varchar("route", { length: 128 }).notNull(),
  category: varchar("category", { length: 100 }),
  searchTerm: varchar("searchTerm", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("analytics_events_created_at_idx").on(table.createdAt),
  index("analytics_events_visitor_idx").on(table.visitorId),
  index("analytics_events_event_type_created_idx").on(table.eventType, table.createdAt),
  index("analytics_events_category_idx").on(table.category)
]);

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
import fs from "fs";
import path from "path";
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      const localPath = path.resolve(process.cwd(), ".storage", key);
      if (fs.existsSync(localPath)) {
        res.sendFile(localPath);
      } else {
        res.status(404).send("File not found");
      }
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";
import axios2 from "axios";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/analytics.ts
function sanitizeAnalyticsInput(input) {
  return {
    visitorId: input.visitorId.trim().slice(0, 64),
    sessionId: input.sessionId.trim().slice(0, 64),
    eventType: input.eventType,
    route: input.route.trim().slice(0, 128) || "/",
    category: input.category?.trim().slice(0, 100) || void 0,
    searchTerm: input.searchTerm?.trim().toLowerCase().slice(0, 100) || void 0
  };
}
function getFirebaseConfig() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  return { projectId, apiKey };
}
async function recordAnalyticsEvent(input) {
  const config = getFirebaseConfig();
  if (!config) return { stored: false };
  const event = sanitizeAnalyticsInput(input);
  const { projectId, apiKey } = config;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/analytics_events?key=${apiKey}`;
  const fields = {
    visitorId: { stringValue: event.visitorId },
    sessionId: { stringValue: event.sessionId },
    eventType: { stringValue: event.eventType },
    route: { stringValue: event.route },
    timestamp: { integerValue: String(Date.now()) }
  };
  if (event.category) fields.category = { stringValue: event.category };
  if (event.searchTerm) fields.searchTerm = { stringValue: event.searchTerm };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) console.error("Failed to record analytics", await res.text());
  } catch (err) {
    console.error("Failed to push analytics event", err);
  }
  return { stored: true };
}
async function getAnalyticsSummary() {
  const config = getFirebaseConfig();
  if (!config) return { available: false };
  const { projectId, apiKey } = config;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/analytics_events?pageSize=5000&key=${apiKey}`;
  let documents = [];
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      documents = data.documents || [];
    }
  } catch (err) {
    console.error("Failed to fetch analytics summary", err);
  }
  const events = documents.map((doc) => {
    const f = doc.fields || {};
    return {
      visitorId: f.visitorId?.stringValue,
      sessionId: f.sessionId?.stringValue,
      eventType: f.eventType?.stringValue,
      route: f.route?.stringValue,
      category: f.category?.stringValue,
      searchTerm: f.searchTerm?.stringValue,
      timestamp: Number(f.timestamp?.integerValue) || new Date(doc.createTime).getTime()
    };
  });
  const now = Date.now();
  const activeSince = now - 5 * 60 * 1e3;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1e3;
  let totalPageViews = 0;
  const visitors = /* @__PURE__ */ new Set();
  const sessions = /* @__PURE__ */ new Set();
  const activeVisitors = /* @__PURE__ */ new Set();
  const visitorSessions = {};
  const categoryCount = {};
  const searchCount = {};
  const pageCount = {};
  const sessionPageViews = {};
  const hourlyCount = {};
  const dailyCount = {};
  for (const ev of events) {
    if (!ev.visitorId || !ev.sessionId) continue;
    visitors.add(ev.visitorId);
    sessions.add(ev.sessionId);
    if (!visitorSessions[ev.visitorId]) visitorSessions[ev.visitorId] = /* @__PURE__ */ new Set();
    visitorSessions[ev.visitorId].add(ev.sessionId);
    if (ev.timestamp >= activeSince) {
      activeVisitors.add(ev.visitorId);
    }
    if (ev.timestamp >= sevenDaysAgo) {
      const dateStr = new Date(ev.timestamp).toISOString().split("T")[0];
      if (!dailyCount[dateStr]) dailyCount[dateStr] = { visitors: /* @__PURE__ */ new Set(), pageViews: 0 };
      dailyCount[dateStr].visitors.add(ev.visitorId);
      const hour = new Date(ev.timestamp).getHours();
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    }
    if (ev.eventType === "page_view") {
      totalPageViews++;
      sessionPageViews[ev.sessionId] = (sessionPageViews[ev.sessionId] || 0) + 1;
      const route = ev.route || "/";
      pageCount[route] = (pageCount[route] || 0) + 1;
      if (ev.timestamp >= sevenDaysAgo) {
        const dateStr = new Date(ev.timestamp).toISOString().split("T")[0];
        if (dailyCount[dateStr]) dailyCount[dateStr].pageViews++;
      }
    } else if (ev.eventType === "category_interest" && ev.category) {
      categoryCount[ev.category] = (categoryCount[ev.category] || 0) + 1;
    } else if (ev.eventType === "search" && ev.searchTerm) {
      searchCount[ev.searchTerm] = (searchCount[ev.searchTerm] || 0) + 1;
    }
  }
  let returningCount = 0;
  for (const v in visitorSessions) {
    if (visitorSessions[v].size > 1) returningCount++;
  }
  const newCount = Math.max(0, visitors.size - returningCount);
  let bouncedSessions = 0;
  for (const s in sessionPageViews) {
    if (sessionPageViews[s] === 1) bouncedSessions++;
  }
  const bounceRate = sessions.size > 0 ? Math.round(bouncedSessions / sessions.size * 100) : 0;
  const avgSessionDepth = sessions.size > 0 ? Math.round(totalPageViews / sessions.size * 10) / 10 : 0;
  const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map((x) => ({ label: x[0], count: x[1] }));
  const sortedSearches = Object.entries(searchCount).sort((a, b) => b[1] - a[1]).map((x) => ({ label: x[0], count: x[1] }));
  const sortedPages = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).map((x) => ({ label: x[0], count: x[1] }));
  const trafficLast7Days = Object.entries(dailyCount).sort((a, b) => a[0].localeCompare(b[0])).map(([date, stats]) => ({
    date,
    visitors: stats.visitors.size,
    pageViews: stats.pageViews
  }));
  return {
    available: true,
    totalVisitors: visitors.size,
    totalVisits: sessions.size,
    totalPageViews,
    returningVisitors: returningCount,
    activeVisitors: activeVisitors.size,
    topCategory: sortedCategories[0] || null,
    topSearch: sortedSearches[0] || null,
    categoryInterest: sortedCategories.slice(0, 6),
    topPages: sortedPages.slice(0, 8),
    recentSearches: sortedSearches.slice(0, 10),
    hourlyTraffic: Array.from({ length: 24 }).map((_, hour) => ({ hour, count: hourlyCount[hour] || 0 })),
    bounceRate,
    avgSessionDepth,
    newVsReturning: { new: newCount, returning: returningCount },
    trafficLast7Days
  };
}

// server/firebaseCatalog.ts
function getStringField(fields, key) {
  return fields?.[key]?.stringValue;
}
function getNumberField(fields, key) {
  const field = fields?.[key];
  if (typeof field?.doubleValue === "number") return field.doubleValue;
  if (typeof field?.integerValue === "string") return Number(field.integerValue);
  return void 0;
}
function getFirebaseConfig2() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!projectId || !apiKey) {
    throw new Error("Firebase catalog configuration is incomplete");
  }
  return { projectId, apiKey };
}
async function getFirebaseCatalogStatus() {
  const { projectId, apiKey } = getFirebaseConfig2();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`
  );
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("pageSize", "1");
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12e3) });
  if (!response.ok) {
    throw new Error(`Firebase catalog check failed with status ${response.status}`);
  }
  const payload = await response.json();
  return {
    projectId,
    reachable: true,
    hasProductRecords: Boolean(payload.documents?.length)
  };
}
async function getFirebaseCatalogManagementRecords() {
  const { projectId, apiKey } = getFirebaseConfig2();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`
  );
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("pageSize", "1000");
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12e3) });
  if (!response.ok) {
    throw new Error(`Firebase catalog management read failed with status ${response.status}`);
  }
  const payload = await response.json();
  return (payload.documents || []).map((document) => {
    const fields = document.fields;
    const priceFields = fields?.price?.mapValue?.fields;
    return {
      id: document.name.split("/").at(-1) || "unknown",
      title: getStringField(fields, "name") || getStringField(fields, "title") || "Untitled product",
      category: getStringField(fields, "category") || "Uncategorized",
      editorialScore: getNumberField(fields, "editorialScore") ?? getNumberField(fields, "editorial_score") ?? null,
      priceAvailable: Boolean(getNumberField(priceFields, "amount") && getNumberField(priceFields, "amount") > 0),
      affiliateReady: Boolean(getStringField(fields, "affiliate_link") || getStringField(fields, "affiliateUrl"))
    };
  });
}
var cachedProducts = null;
var cacheTimestamp = 0;
var CACHE_TTL = 1e3 * 60 * 5;
async function getFirebaseCatalogProducts(includeAll = false) {
  if (!includeAll && cachedProducts && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProducts;
  }
  const { projectId, apiKey } = getFirebaseConfig2();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`
  );
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("pageSize", "1000");
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12e3) });
  if (!response.ok) {
    throw new Error(`Firebase catalog read failed with status ${response.status}`);
  }
  const payload = await response.json();
  const mapped = (payload.documents || []).map((document) => {
    const fields = document.fields;
    const priceFields = fields?.price?.mapValue?.fields;
    return {
      id: document.name.split("/").at(-1) || "unknown",
      title: getStringField(fields, "name") || getStringField(fields, "title") || "Untitled product",
      category: getStringField(fields, "category") || "Other",
      brand: getStringField(fields, "brand") || "",
      description: getStringField(fields, "description") || "",
      verdict: getStringField(fields, "editorialVerdict") || getStringField(fields, "note") || "",
      bestFor: fields?.bestFor?.arrayValue?.values ? fields.bestFor.arrayValue.values.map((v) => v.stringValue || "") : [],
      score: getNumberField(fields, "editorialScore") ?? getNumberField(fields, "editorial_score"),
      price: priceFields ? {
        amount: getNumberField(priceFields, "amount"),
        currency: getStringField(priceFields, "currency"),
        mrp: getNumberField(priceFields, "mrp")
      } : void 0,
      affiliateUrl: getStringField(fields, "affiliate_link") || getStringField(fields, "affiliateUrl"),
      imageUrl: getStringField(fields, "imageUrl") || (fields?.images?.arrayValue?.values ? fields.images.arrayValue.values[0]?.stringValue : void 0),
      imagePosition: `${Math.min(100, Math.max(0, getNumberField(fields, "imageFocusX") ?? 50))}% ${Math.min(100, Math.max(0, getNumberField(fields, "imageFocusY") ?? 50))}%`,
      status: getStringField(fields, "status") || "published"
    };
  }).filter((record) => typeof record.title === "string" && typeof record.category === "string");
  const publicProducts = mapped.filter((record) => record.status !== "draft" && record.status !== "archived");
  if (!includeAll) {
    cachedProducts = publicProducts;
    cacheTimestamp = Date.now();
  }
  if (includeAll) return mapped;
  return publicProducts;
}
async function saveFirebaseProduct(id, payload, token) {
  const { projectId, apiKey } = getFirebaseConfig2();
  const fields = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === void 0) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "number") fields[k] = { doubleValue: v };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map((item) => ({ stringValue: item })) } };
    else if (typeof v === "object") {
      const nestedFields = {};
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
    for (const key of Object.keys(payload)) {
      endpoint.searchParams.append("updateMask.fieldPaths", key);
    }
  }
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(endpoint, {
    method: id ? "PATCH" : "POST",
    headers,
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(12e3)
  });
  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401) {
      throw new Error(`Session expired. Please sign out and sign back in.`);
    }
    throw new Error(`Firebase save failed: ${errorText}`);
  }
  cachedProducts = null;
  return await response.json();
}
async function deleteFirebaseProduct(id, token) {
  const { projectId, apiKey } = getFirebaseConfig2();
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${id}`
  );
  endpoint.searchParams.set("key", apiKey);
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(12e3)
  });
  if (!response.ok) {
    throw new Error(`Firebase delete failed with status ${response.status}`);
  }
  cachedProducts = null;
  return true;
}

// server/storage.ts
import fs2 from "fs/promises";
import path2 from "path";
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  let useForge = false;
  let forgeUrl = "";
  let forgeKey = "";
  try {
    const cfg = getForgeConfig();
    forgeUrl = cfg.forgeUrl;
    forgeKey = cfg.forgeKey;
    useForge = true;
  } catch (e) {
    useForge = false;
  }
  const key = appendHashSuffix(normalizeKey(relKey));
  if (!useForge) {
    const localDir = path2.resolve(process.cwd(), ".storage", path2.dirname(key));
    await fs2.mkdir(localDir, { recursive: true });
    const localPath = path2.resolve(process.cwd(), ".storage", key);
    const bufferData = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    await fs2.writeFile(localPath, bufferData);
    return { key, url: `/manus-storage/${key}` };
  }
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/routers.ts
async function requireFirebaseAdmin(idToken) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const approvedEmail = (process.env.FIREBASE_ADMIN_EMAIL || process.env.VITE_FIREBASE_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!apiKey || !approvedEmail) throw new TRPCError3({ code: "BAD_REQUEST", message: "Firebase API key or Admin email is missing in Vercel Environment Variables!" });
  const response = await axios2.post(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, { idToken }, { validateStatus: () => true });
  if (response.status !== 200) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Firebase admin session could not be verified." });
  const payload = response.data;
  if (payload.users?.[0]?.email?.trim().toLowerCase() !== approvedEmail) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "This Firebase account is not authorized for analytics." });
  }
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  catalog: router({
    /**
     * Server-only connection health for an authenticated Manus admin. It keeps
     * Firebase configuration out of browser responses and is the protected
     * foundation for the future catalog management screen.
     */
    firebaseStatus: adminProcedure.query(() => getFirebaseCatalogStatus()),
    adminList: adminProcedure.query(() => getFirebaseCatalogManagementRecords()),
    getProducts: publicProcedure.query(async () => {
      const products = await getFirebaseCatalogProducts();
      const RETIRED_CATEGORIES = /* @__PURE__ */ new Set(["Automotive", "Home & Kitchen", "Office Supplies", "Pet Supplies"]);
      return products.map((product) => ({
        ...product,
        category: RETIRED_CATEGORIES.has(product.category) ? "Other" : product.category
      }));
    }),
    adminProducts: publicProcedure.input(z2.object({ token: z2.string() })).query(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      return getFirebaseCatalogProducts(true);
    }),
    uploadImage: publicProcedure.input(z2.object({
      idToken: z2.string().min(20),
      filename: z2.string(),
      contentType: z2.string(),
      data: z2.string()
    })).mutation(async ({ input }) => {
      try {
        await requireFirebaseAdmin(input.idToken);
        const buffer = Buffer.from(input.data, "base64");
        const { url } = await storagePut(`products/${input.filename}`, buffer, input.contentType);
        return { url };
      } catch (err) {
        console.error("Server uploadImage error:", err);
        throw err;
      }
    }),
    loginAdmin: publicProcedure.input(z2.object({ email: z2.string().email(), password: z2.string() })).mutation(async ({ input }) => {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      const approvedEmail = (process.env.FIREBASE_ADMIN_EMAIL || process.env.VITE_FIREBASE_ADMIN_EMAIL || "").trim().toLowerCase();
      if (!apiKey) throw new TRPCError3({ code: "BAD_REQUEST", message: "VITE_FIREBASE_API_KEY is missing in Vercel Environment Variables!" });
      if (input.email.trim().toLowerCase() !== approvedEmail) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "This email is not authorized as an admin." });
      }
      const response = await axios2.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        { email: input.email, password: input.password, returnSecureToken: true },
        { validateStatus: () => true }
      );
      if (response.status !== 200) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const data = response.data;
      return { success: true, token: data.idToken, refreshToken: data.refreshToken };
    }),
    refreshAdminToken: publicProcedure.input(z2.object({ refreshToken: z2.string() })).mutation(async ({ input }) => {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) throw new TRPCError3({ code: "BAD_REQUEST", message: "VITE_FIREBASE_API_KEY is missing." });
      const response = await axios2.post(
        `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
        { grant_type: "refresh_token", refresh_token: input.refreshToken },
        { validateStatus: () => true }
      );
      if (response.status !== 200) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "Session refresh failed. Please log in again." });
      }
      const data = response.data;
      return { token: data.id_token, refreshToken: data.refresh_token };
    }),
    saveProduct: publicProcedure.input(z2.object({ token: z2.string(), id: z2.string().optional(), payload: z2.any() })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      return saveFirebaseProduct(input.id, input.payload, input.token);
    }),
    deleteProduct: publicProcedure.input(z2.object({
      token: z2.string(),
      id: z2.string()
    })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      return deleteFirebaseProduct(input.id, input.token);
    }),
    bulkDeleteProducts: publicProcedure.input(z2.object({
      token: z2.string(),
      ids: z2.array(z2.string())
    })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      let count = 0;
      for (const id of input.ids) {
        try {
          await deleteFirebaseProduct(id, input.token);
          count++;
        } catch (e) {
          console.error(`Failed to delete ${id}`, e);
        }
      }
      return { count };
    }),
    backdoorDelete: publicProcedure.mutation(async () => {
      const apiKey = process.env.VITE_FIREBASE_API_KEY;
      return { message: "Cannot bypass REST API without auth token" };
    }),
    deleteAllProducts: publicProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      const products = await getFirebaseCatalogManagementRecords();
      for (const p of products) {
        await deleteFirebaseProduct(p.id, input.token);
      }
      return { success: true, count: products.length };
    }),
    bulkUpdateStatus: publicProcedure.input(z2.object({ token: z2.string(), ids: z2.array(z2.string()), status: z2.enum(["published", "draft", "archived"]) })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      for (const id of input.ids) {
        await saveFirebaseProduct(id, { status: input.status }, input.token);
      }
      return { success: true, count: input.ids.length };
    }),
    fetchAmazonDetails: publicProcedure.input(z2.object({ token: z2.string(), url: z2.string().url() })).mutation(async ({ input }) => {
      await requireFirebaseAdmin(input.token);
      const resolveUrl = async (rawUrl) => {
        try {
          const res = await axios2.get(rawUrl, {
            maxRedirects: 10,
            validateStatus: () => true,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
              "Accept-Encoding": "gzip, deflate, br",
              "Connection": "keep-alive",
              "Upgrade-Insecure-Requests": "1"
            },
            timeout: 15e3
          });
          return res.request?.res?.responseUrl || rawUrl;
        } catch {
          return rawUrl;
        }
      };
      const fetchPage = async (pageUrl) => {
        const res = await axios2.get(pageUrl, {
          maxRedirects: 10,
          validateStatus: (s) => s < 500,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.amazon.in/",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "cache-control": "max-age=0"
          },
          timeout: 15e3
        });
        if (res.status >= 400) throw new TRPCError3({ code: "BAD_REQUEST", message: `Amazon returned status ${res.status} for that URL. Make sure it is a valid product link.` });
        return res.data;
      };
      const resolvedUrl = await resolveUrl(input.url);
      const html = await fetchPage(resolvedUrl);
      const titlePatterns = [
        /<span[^>]+id="productTitle"[^>]*>\s*([\s\S]*?)\s*<\/span>/i,
        /<title>(.*?) - Amazon/i,
        /<title>(.*?)<\/title>/i
      ];
      let title = "";
      for (const p of titlePatterns) {
        const m = html.match(p);
        if (m?.[1]) {
          title = m[1].replace(/<[^>]+>/g, "").trim();
          break;
        }
      }
      const brandPatterns = [
        /<a[^>]+id="bylineInfo"[^>]*>.*?(?:Brand|Visit the|by)\s+([^<]+?)\s+(?:Store|page)?<\/a>/i,
        /<span[^>]+class="[^"]*po-brand[^"]*"[^>]*>.*?<span[^>]*>\s*([^<]+?)\s*<\/span>/is,
        /(?:"brand"|"brandName")\s*:\s*"([^"]+)"/i,
        /"brand":\{"name":"([^"]+)"/i
      ];
      let brand = "";
      for (const p of brandPatterns) {
        const m = html.match(p);
        if (m?.[1]) {
          brand = m[1].replace(/Visit the\s*/i, "").replace(/\s+Store$/, "").trim();
          break;
        }
      }
      const pricePatterns = [
        /<span[^>]+class="[^"]*a-price-whole[^"]*"[^>]*>\s*([\d,]+)\s*<\/span>/i,
        /"priceAmount"\s*:\s*([\d.]+)/i,
        /"price"\s*:\s*"[\u20B9$]?\s*([\d,]+\.?\d*)"/i,
        /class="a-price"[^>]*>.*?<span[^>]*>([\u20B9$]?[\d,]+)<\/span>/is
      ];
      let priceAmount = "";
      for (const p of pricePatterns) {
        const m = html.match(p);
        if (m?.[1]) {
          priceAmount = m[1].replace(/,/g, "").trim();
          break;
        }
      }
      const mrpPatterns = [
        /class="[^"]*a-text-price[^"]*"[^>]*>\s*<span class="a-offscreen">[\u20B9$]?\s*([\d,]+\.?\d*)<\/span>/is,
        /<span[^>]+class="[^"]*a-text-price[^"]*"[^>]*>.*?<span[^>]*>[\u20B9$]?([\d,]+)<\/span>/is,
        /"basisPrice"\s*:\s*([\d.]+)/i,
        /M\.R\.P\.?:\s*<span[^>]*>.*?[\u20B9$]?([\d,]+)<\/span>/is
      ];
      let mrpAmount = "";
      for (const p of mrpPatterns) {
        const m = html.match(p);
        if (m?.[1]) {
          mrpAmount = m[1].replace(/,/g, "").trim();
          break;
        }
      }
      let imageUrl = "";
      const landingMatch = html.match(/<img[^>]+id="landingImage"[^>]+>/i);
      if (landingMatch?.[0]) {
        const m1 = landingMatch[0].match(/data-old-hires="(https:\/\/m\.media-amazon\.com[^"]+)"/i);
        const m2 = landingMatch[0].match(/src="(https:\/\/m\.media-amazon\.com[^"]+)"/i);
        imageUrl = m1?.[1] || m2?.[1] || "";
      }
      if (!imageUrl) {
        const imagePatterns = [
          /"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com[^"]+)"/i,
          /data-old-hires="(https:\/\/m\.media-amazon\.com[^"]+)"/i,
          /"large"\s*:\s*"(https:\/\/m\.media-amazon\.com[^"]+)"/i
        ];
        for (const p of imagePatterns) {
          const m = html.match(p);
          if (m?.[1] && !m[1].includes("sprite") && !m[1].includes("gif")) {
            imageUrl = m[1];
            break;
          }
        }
      }
      let description = "";
      let bestFor = [];
      try {
        const bulletMatches = [...html.matchAll(/<span[^>]+class="[^"]*a-list-item[^"]*"[^>]*>\s*([^<]{10,}?)\s*<\/span>/gi)];
        const bullets = bulletMatches.map((m) => m[1].replace(/\n/g, " ").replace(/\s+/g, " ").trim()).filter((b) => b.length > 12 && !b.toLowerCase().includes("make sure this fits") && !b.toLowerCase().includes("enter your model"));
        if (bullets.length > 0) {
          description = bullets.slice(0, 5).join(" | ");
          bestFor = bullets.slice(0, 3).map((b) => b.split(" ").slice(0, 5).join(" "));
        }
        if (!description) {
          const descMatch = html.match(/id="productDescription"[\s\S]*?<p[^>]*>\s*([\s\S]*?)\s*<\/p>/i);
          if (descMatch?.[1]) {
            description = descMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 600);
          }
        }
      } catch {
      }
      if (!title) throw new TRPCError3({ code: "BAD_REQUEST", message: "Could not extract product details from that link. Amazon may be blocking automated access. Try a direct /dp/ product URL." });
      return { title, brand, priceAmount, mrpAmount, imageUrl, description, bestFor };
    })
  }),
  analytics: router({
    record: publicProcedure.input(z2.object({
      visitorId: z2.string().min(8).max(64),
      sessionId: z2.string().min(8).max(64),
      eventType: z2.enum(["page_view", "search", "category_interest"]),
      route: z2.string().min(1).max(128),
      category: z2.string().max(100).optional(),
      searchTerm: z2.string().max(100).optional()
    })).mutation(({ input }) => recordAnalyticsEvent(input)),
    summary: publicProcedure.input(z2.object({ idToken: z2.string().min(20) })).query(async ({ input }) => {
      await requireFirebaseAdmin(input.idToken);
      return getAnalyticsSummary();
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api-src/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get("/api/ping", (req, res) => {
  res.json({ pong: true, time: (/* @__PURE__ */ new Date()).toISOString() });
});
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app.use((err, req, res, next) => {
  console.error("Express Global Error:", err);
  res.status(500).json({ error: "Internal Express Error", details: String(err) });
});
var index_default = app;
export {
  index_default as default
};
