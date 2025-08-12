import { db } from "../server/db";
import { brokers } from "../shared/schema";

const data = [
  {
    name: "RightBiz",
    website: "https://www.rightbiz.co.uk/businesses-for-sale/it-computing-services",
    scrapingPath: [
      "Sector = Technology",
      "Include Pending = OFF",
      "Sort by = Newest",
      "Scroll until = Yesterday",
      "Title keyword check = Apply",
    ],
    isActive: true,
  },
  {
    name: "BusinessesForSale",
    website: "https://www.businessesforsale.com/uk/search/technology-businesses-for-sale-in-united-kingdom",
    scrapingPath: [
      "Category = Information Technology",
      "Sort by = Newest",
      "Scroll until = Yesterday",
      "Title keyword check = Apply",
    ],
    isActive: true,
  },
  {
    name: "DaltonsBusiness",
    website: "https://www.daltonsbusiness.com/businesses-for-sale",
    scrapingPath: [
      "Category = IT & Computing Services",
      "Location = United Kingdom",
      "Only New Listings = ON",
      "Sort by = Newest",
    ],
    isActive: true,
  },
  {
    name: "Business Sale Report",
    website: "https://www.business-sale.com/businesses-for-sale",
    scrapingPath: [
      "Sector = Technology",
      "Latest Only = ON",
      "Sort by = Newest",
      "Stop when = Yesterday",
    ],
    isActive: true,
  },
  {
    name: "SMERGERS",
    website: "https://www.smergers.com/businesses-for-sale/",
    scrapingPath: [
      "Location = United Kingdom",
      "Industry = IT Services",
      "Tab = Newest",
      "Stop when = Yesterday",
    ],
    isActive: true,
  },
  {
    name: "Benchmark International",
    website: "https://www.benchmarkintl.com/buyers/opportunities/",
    scrapingPath: [
      "Industry = IT Services",
      "Region = UK / Europe",
      "Sort by = Newest",
    ],
    isActive: true,
  },
  {
    name: "Transworld Business Advisors",
    website: "https://www.tworld.com/buy-a-business/search/",
    scrapingPath: [
      "Industry = Technology",
      "Region = United Kingdom",
      "Include Pending = OFF",
      "Sort by = Newest",
      "Stop when = Yesterday",
    ],
    isActive: true,
  },
  {
    name: "EMF Group",
    website: "https://www.emfgroup.com/businesses-for-sale",
    scrapingPath: [
      "Type = IT & Computing Services",
      "Geo = All",
      "Order by = Date (Newest)",
      "Stop when = Yesterday",
    ],
    isActive: true,
  },
  {
    name: "Knightsbridge Commercial",
    website: "https://www.knightsbridgeplc.com/buy-a-business/",
    scrapingPath: [
      "Sector = IT Services & Support",
      "Region = England",
      "Sort by = Newest",
    ],
    isActive: true,
  },
  {
    name: "Hornblower",
    website: "https://hornblower-businesses.co.uk/businesses-for-sale/",
    scrapingPath: [
      "Sector = Technology & B2B Service",
      "Status = For Sale",
      "Sort by = Latest",
    ],
    isActive: true,
  },
  {
    name: "BizSale",
    website: "https://www.bizsale.co.uk/business-for-sale",
    scrapingPath: [
      "Sector = Technology",
      "Include Pending = OFF",
      "Sort by = Newest",
      "Stop when = Yesterday",
    ],
    isActive: true,
  },
];

async function seed() {
  try {
    // Insert each row; if you run twice, you may want to add a unique(name) in DB and use onConflictDoNothing()
    for (const b of data) {
      await db.insert(brokers).values(b);
    }
    console.log("✅ Brokers seeded");
    process.exit(0);
  } catch (e) {
    console.error("❌ Error seeding brokers:", e);
    process.exit(1);
  }
}

seed();
