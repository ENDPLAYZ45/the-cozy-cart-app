import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Anonymous, first-party storefront interaction events. No IP address, email, or user-agent is retained. */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  eventType: mysqlEnum("eventType", ["page_view", "search", "category_interest"]).notNull(),
  route: varchar("route", { length: 128 }).notNull(),
  category: varchar("category", { length: 100 }),
  searchTerm: varchar("searchTerm", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("analytics_events_created_at_idx").on(table.createdAt),
  index("analytics_events_visitor_idx").on(table.visitorId),
  index("analytics_events_event_type_created_idx").on(table.eventType, table.createdAt),
  index("analytics_events_category_idx").on(table.category),
]);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
