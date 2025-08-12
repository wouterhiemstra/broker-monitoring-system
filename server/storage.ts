import { users, brokers, listings, scrapingLogs, painPoints, type User, type InsertUser, type Broker, type InsertBroker, type Listing, type InsertListing, type ScrapingLog, type InsertScrapingLog, type PainPoint, type InsertPainPoint } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Broker methods
  getBrokers(): Promise<Broker[]>;
  getBroker(id: string): Promise<Broker | undefined>;
  createBroker(broker: InsertBroker): Promise<Broker>;
  updateBroker(id: string, updates: Partial<InsertBroker>): Promise<Broker | undefined>;

  // Listing methods
  getListings(limit?: number, offset?: number): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getListingByListingId(listingId: string): Promise<Listing | undefined>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, updates: Partial<InsertListing>): Promise<Listing | undefined>;
  getListingsWithBrokers(limit?: number, offset?: number): Promise<(Listing & { broker: Broker })[]>;
  getRecentListings(days: number): Promise<(Listing & { broker: Broker })[]>;
  
  // Scraping log methods
  getScrapingLogs(brokerId?: string): Promise<ScrapingLog[]>;
  createScrapingLog(log: InsertScrapingLog): Promise<ScrapingLog>;
  updateScrapingLog(id: string, updates: Partial<InsertScrapingLog>): Promise<ScrapingLog | undefined>;

  // Pain point methods
  createPainPoint(painPoint: InsertPainPoint): Promise<PainPoint>;
  getPainPoints(brokerId?: string): Promise<PainPoint[]>;

  // Analytics methods
  getKPIs(): Promise<{
    todayListings: number;
    qualified: number;
    avgEbitda: number;
    activeBrokers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getBrokers(): Promise<Broker[]> {
    return await db.select().from(brokers).orderBy(brokers.tier, brokers.name);
  }

  async getBroker(id: string): Promise<Broker | undefined> {
    const [broker] = await db.select().from(brokers).where(eq(brokers.id, id));
    return broker || undefined;
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const [broker] = await db
      .insert(brokers)
      .values(insertBroker)
      .returning();
    return broker;
  }

  async updateBroker(id: string, updates: Partial<InsertBroker>): Promise<Broker | undefined> {
    const [broker] = await db
      .update(brokers)
      .set(updates)
      .where(eq(brokers.id, id))
      .returning();
    return broker || undefined;
  }

  async getListings(limit = 50, offset = 0): Promise<Listing[]> {
    return await db.select().from(listings)
      .orderBy(desc(listings.dateAdded))
      .limit(limit)
      .offset(offset);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }

  async getListingByListingId(listingId: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.listingId, listingId));
    return listing || undefined;
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db
      .insert(listings)
      .values(insertListing)
      .returning();
    return listing;
  }

  async updateListing(id: string, updates: Partial<InsertListing>): Promise<Listing | undefined> {
    const [listing] = await db
      .update(listings)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(listings.id, id))
      .returning();
    return listing || undefined;
  }

  async getListingsWithBrokers(limit = 50, offset = 0): Promise<(Listing & { broker: Broker })[]> {
    return await db
      .select({
        id: listings.id,
        dateAdded: listings.dateAdded,
        link: listings.link,
        listingId: listings.listingId,
        isActive: listings.isActive,
        status: listings.status,
        brokerAttractiveness: listings.brokerAttractiveness,
        brokerId: listings.brokerId,
        contactPerson: listings.contactPerson,
        revenue: listings.revenue,
        ebitda: listings.ebitda,
        ftes: listings.ftes,
        recurringRevPercent: listings.recurringRevPercent,
        category: listings.category,
        notes: listings.notes,
        evidenceLink: listings.evidenceLink,
        title: listings.title,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        broker: brokers,
      })
      .from(listings)
      .innerJoin(brokers, eq(listings.brokerId, brokers.id))
      .orderBy(desc(listings.dateAdded))
      .limit(limit)
      .offset(offset);
  }

  async getRecentListings(days: number): Promise<(Listing & { broker: Broker })[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select({
        id: listings.id,
        dateAdded: listings.dateAdded,
        link: listings.link,
        listingId: listings.listingId,
        isActive: listings.isActive,
        status: listings.status,
        brokerAttractiveness: listings.brokerAttractiveness,
        brokerId: listings.brokerId,
        contactPerson: listings.contactPerson,
        revenue: listings.revenue,
        ebitda: listings.ebitda,
        ftes: listings.ftes,
        recurringRevPercent: listings.recurringRevPercent,
        category: listings.category,
        notes: listings.notes,
        evidenceLink: listings.evidenceLink,
        title: listings.title,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
        broker: brokers,
      })
      .from(listings)
      .innerJoin(brokers, eq(listings.brokerId, brokers.id))
      .where(gte(listings.dateAdded, cutoffDate))
      .orderBy(desc(listings.dateAdded));
  }

  async getScrapingLogs(brokerId?: string): Promise<ScrapingLog[]> {
    const query = db.select().from(scrapingLogs).orderBy(desc(scrapingLogs.startedAt));
    
    if (brokerId) {
      return await query.where(eq(scrapingLogs.brokerId, brokerId));
    }
    
    return await query;
  }

  async createScrapingLog(insertLog: InsertScrapingLog): Promise<ScrapingLog> {
    const [log] = await db
      .insert(scrapingLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async updateScrapingLog(id: string, updates: Partial<InsertScrapingLog>): Promise<ScrapingLog | undefined> {
    const [log] = await db
      .update(scrapingLogs)
      .set(updates)
      .where(eq(scrapingLogs.id, id))
      .returning();
    return log || undefined;
  }

  async createPainPoint(insertPainPoint: InsertPainPoint): Promise<PainPoint> {
    const [painPoint] = await db
      .insert(painPoints)
      .values(insertPainPoint)
      .returning();
    return painPoint;
  }

  async getPainPoints(brokerId?: string): Promise<PainPoint[]> {
    const query = db.select().from(painPoints).orderBy(desc(painPoints.date));
    
    if (brokerId) {
      return await query.where(eq(painPoints.brokerId, brokerId));
    }
    
    return await query;
  }

  async getKPIs(): Promise<{
    todayListings: number;
    qualified: number;
    avgEbitda: number;
    activeBrokers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayListingsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(gte(listings.dateAdded, today));

    const [qualifiedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.status, "QUALIFIED"));

    const [avgEbitdaResult] = await db
      .select({ avg: sql<number>`coalesce(avg(${listings.ebitda})::numeric, 0)` })
      .from(listings)
      .where(and(eq(listings.isActive, true), sql`${listings.ebitda} IS NOT NULL`));

    const [activeBrokersResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(brokers)
      .where(eq(brokers.isActive, true));

    return {
      todayListings: todayListingsResult?.count || 0,
      qualified: qualifiedResult?.count || 0,
      avgEbitda: Number(avgEbitdaResult?.avg || 0),
      activeBrokers: activeBrokersResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
