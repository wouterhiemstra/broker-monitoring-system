import { db } from "../server/db";
import { brokers, users } from "../shared/schema";
import { eq } from "drizzle-orm";

const defaultBrokers = [
  {
    name: "BizBuySell",
    website: "https://www.bizbuysell.com",
    scrapingPath: "/search/businesses-for-sale/computer-internet-business-opportunities",
    tier: 1,
    isActive: true,
    config: {
      searchUrl: "https://www.bizbuysell.com/search/businesses-for-sale/computer-internet-business-opportunities",
      selectors: {
        listingContainer: ".listing-item",
        title: ".listing-title",
        price: ".price",
        location: ".location",
        description: ".description",
        link: "a"
      },
      filters: {
        keywords: ["IT", "MSP", "managed services", "computer", "technology", "software"],
        excludeKeywords: ["franchise", "equipment only"],
        minPrice: 100000,
        maxPrice: 50000000
      }
    }
  },
  {
    name: "BizQuest",
    website: "https://www.bizquest.com",
    scrapingPath: "/businesses-for-sale/category/technology",
    tier: 1,
    isActive: true,
    config: {
      searchUrl: "https://www.bizquest.com/businesses-for-sale/category/technology",
      selectors: {
        listingContainer: ".business-listing",
        title: ".business-name",
        price: ".asking-price",
        location: ".business-location",
        description: ".business-description",
        link: "a"
      },
      filters: {
        keywords: ["IT", "MSP", "managed services", "computer", "technology", "software"],
        excludeKeywords: ["franchise", "equipment only"],
        minPrice: 100000,
        maxPrice: 50000000
      }
    }
  },
  {
    name: "BusinessMart",
    website: "https://www.businessmart.com",
    scrapingPath: "/search/technology-businesses",
    tier: 2,
    isActive: true,
    config: {
      searchUrl: "https://www.businessmart.com/search/technology-businesses",
      selectors: {
        listingContainer: ".listing",
        title: ".title",
        price: ".price",
        location: ".location",
        description: ".summary",
        link: "a"
      },
      filters: {
        keywords: ["IT", "MSP", "managed services", "computer", "technology"],
        excludeKeywords: ["franchise", "equipment only"],
        minPrice: 100000,
        maxPrice: 50000000
      }
    }
  },
  {
    name: "SunbeltNetwork",
    website: "https://www.sunbeltnetwork.com",
    scrapingPath: "/businesses-for-sale/technology",
    tier: 2,
    isActive: true,
    config: {
      searchUrl: "https://www.sunbeltnetwork.com/businesses-for-sale/technology",
      selectors: {
        listingContainer: ".business-card",
        title: ".business-title",
        price: ".asking-price",
        location: ".location",
        description: ".description",
        link: "a"
      },
      filters: {
        keywords: ["IT", "MSP", "managed services", "computer", "technology"],
        excludeKeywords: ["franchise", "equipment only"],
        minPrice: 100000,
        maxPrice: 50000000
      }
    }
  },
  {
    name: "BusinessBroker.net",
    website: "https://www.businessbroker.net",
    scrapingPath: "/search/technology-businesses",
    tier: 3,
    isActive: true,
    config: {
      searchUrl: "https://www.businessbroker.net/search/technology-businesses",
      selectors: {
        listingContainer: ".listing-row",
        title: ".listing-title",
        price: ".price",
        location: ".location",
        description: ".description",
        link: "a"
      },
      filters: {
        keywords: ["IT", "MSP", "managed services", "computer", "technology"],
        excludeKeywords: ["franchise", "equipment only"],
        minPrice: 100000,
        maxPrice: 50000000
      }
    }
  }
];

const defaultUser = {
  username: "admin",
  password: "admin123", // In production, this should be hashed
  email: "admin@brokermonitoring.com"
};

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, defaultUser.username));
    
    if (existingUser.length === 0) {
      await db.insert(users).values(defaultUser);
      console.log("✅ Default admin user created");
    } else {
      console.log("ℹ️  Admin user already exists");
    }

    // Check if brokers already exist
    const existingBrokers = await db.select().from(brokers);
    
    if (existingBrokers.length === 0) {
      await db.insert(brokers).values(defaultBrokers);
      console.log("✅ Default broker configurations created");
    } else {
      console.log("ℹ️  Broker configurations already exist");
    }

    console.log("🎉 Database seeding completed successfully!");
    console.log("\nDefault Login Credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("\n⚠️  Please change the default password in production!");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();