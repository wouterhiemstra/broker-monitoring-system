import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const brokers = pgTable("brokers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  website: text("website").notNull(),
  tier: integer("tier").notNull().default(5), // 1-5, 1 = flagship
  isActive: boolean("is_active").notNull().default(true),
  scrapingPath: jsonb("scraping_path").notNull(), // JSON configuration for scraping
  lastScrapedAt: timestamp("last_scraped_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dateAdded: timestamp("date_added").notNull().default(sql`now()`),
  link: text("link").notNull(),
  listingId: text("listing_id").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("NEW"), // NEW, CONTACTED, RESPONDED, QUALIFIED, CLOSED
  brokerAttractiveness: integer("broker_attractiveness").notNull().default(5),
  brokerId: varchar("broker_id").notNull(),
  contactPerson: text("contact_person"),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  ebitda: decimal("ebitda", { precision: 10, scale: 2 }),
  ftes: integer("ftes").default(0),
  recurringRevPercent: decimal("recurring_rev_percent", { precision: 5, scale: 2 }),
  category: text("category"),
  notes: text("notes"),
  evidenceLink: text("evidence_link"),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const scrapingLogs = pgTable("scraping_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brokerId: varchar("broker_id").notNull(),
  startedAt: timestamp("started_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("running"), // running, completed, failed
  errorMessage: text("error_message"),
  listingsFound: integer("listings_found").default(0),
  newListings: integer("new_listings").default(0),
});

export const painPoints = pgTable("pain_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().default(sql`now()`),
  brokerId: varchar("broker_id").notNull(),
  issueType: text("issue_type").notNull(),
  description: text("description").notNull(),
  timeLostMin: integer("time_lost_min").notNull(),
});

// Relations
export const brokersRelations = relations(brokers, ({ many }) => ({
  listings: many(listings),
  scrapingLogs: many(scrapingLogs),
  painPoints: many(painPoints),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  broker: one(brokers, {
    fields: [listings.brokerId],
    references: [brokers.id],
  }),
}));

export const scrapingLogsRelations = relations(scrapingLogs, ({ one }) => ({
  broker: one(brokers, {
    fields: [scrapingLogs.brokerId],
    references: [brokers.id],
  }),
}));

export const painPointsRelations = relations(painPoints, ({ one }) => ({
  broker: one(brokers, {
    fields: [painPoints.brokerId],
    references: [brokers.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBrokerSchema = createInsertSchema(brokers).omit({
  id: true,
  createdAt: true,
  lastScrapedAt: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScrapingLogSchema = createInsertSchema(scrapingLogs).omit({
  id: true,
  startedAt: true,
});

export const insertPainPointSchema = createInsertSchema(painPoints).omit({
  id: true,
  date: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Broker = typeof brokers.$inferSelect;
export type InsertBroker = z.infer<typeof insertBrokerSchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type ScrapingLog = typeof scrapingLogs.$inferSelect;
export type InsertScrapingLog = z.infer<typeof insertScrapingLogSchema>;

export type PainPoint = typeof painPoints.$inferSelect;
export type InsertPainPoint = z.infer<typeof insertPainPointSchema>;

// Status enums for validation
export const ListingStatus = z.enum(["NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "CLOSED"]);
export const ScrapingStatus = z.enum(["running", "completed", "failed"]);
