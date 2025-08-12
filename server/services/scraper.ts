import puppeteer from "puppeteer";
import { storage } from "../storage";
import { type Broker, type InsertListing } from "@shared/schema";
import { brokerConfigs } from "../../client/src/lib/brokers";

interface ScrapingResult {
  listingsFound: number;
  newListings: number;
  errors: string[];
}

interface ScrapingStatus {
  isRunning: boolean;
  currentBroker?: string;
  progress: { completed: number; total: number };
  lastRun?: Date;
}

class ScraperService {
  private isRunning = false;
  private currentStatus: ScrapingStatus = {
    isRunning: false,
    progress: { completed: 0, total: 0 }
  };

  private readonly keywords = [
    'MSP',
    'MSSP', 
    'IT Support',
    'Managed Service Provider',
    'IT Services'
  ];

  async scrapeAllBrokers(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Scraping is already in progress");
    }

    this.isRunning = true;
    const brokers = await storage.getBrokers();
    const activeBrokers = brokers.filter(b => b.isActive);
    
    this.currentStatus = {
      isRunning: true,
      progress: { completed: 0, total: activeBrokers.length },
      lastRun: new Date()
    };

    try {
      for (const broker of activeBrokers) {
        await this.scrapeBroker(broker);
        this.currentStatus.progress.completed++;
      }
    } finally {
      this.isRunning = false;
      this.currentStatus.isRunning = false;
    }
  }

  async scrapeBroker(broker: Broker): Promise<ScrapingResult> {
    const log = await storage.createScrapingLog({
      brokerId: broker.id,
      status: "running"
    });

    this.currentStatus.currentBroker = broker.name;

    try {
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const config = brokerConfigs[broker.name as keyof typeof brokerConfigs];
      if (!config) {
        throw new Error(`No scraping configuration found for broker: ${broker.name}`);
      }

      const result = await this.scrapeWithConfig(page, broker, config);
      
      await browser.close();

      await storage.updateScrapingLog(log.id, {
        status: "completed",
        completedAt: new Date(),
        listingsFound: result.listingsFound,
        newListings: result.newListings
      });

      await storage.updateBroker(broker.id, {
        lastScrapedAt: new Date()
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await storage.updateScrapingLog(log.id, {
        status: "failed",
        completedAt: new Date(),
        errorMessage
      });

      // Log pain point for failed scraping
      await storage.createPainPoint({
        brokerId: broker.id,
        issueType: "Scraping Error",
        description: errorMessage,
        timeLostMin: 5 // Estimate time lost
      });

      throw error;
    } finally {
      this.currentStatus.currentBroker = undefined;
    }
  }

  private async scrapeWithConfig(page: puppeteer.Page, broker: Broker, config: any): Promise<ScrapingResult> {
    await page.goto(config.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Apply filters based on configuration
    if (config.filters) {
      for (const filter of config.filters) {
        await this.applyFilter(page, filter);
        await page.waitForTimeout(1000); // Wait between filter applications
      }
    }

    // Get listings
    const listings = await page.evaluate((selectors, keywords, yesterday) => {
      const listingElements = document.querySelectorAll(selectors.listingContainer);
      const results: any[] = [];

      for (const element of listingElements) {
        try {
          const titleEl = element.querySelector(selectors.title);
          const linkEl = element.querySelector(selectors.link);
          const dateEl = element.querySelector(selectors.date);
          
          if (!titleEl || !linkEl) continue;

          const title = titleEl.textContent?.trim() || '';
          const link = linkEl.getAttribute('href') || '';
          const dateText = dateEl?.textContent?.trim() || '';

          // Check if we've reached yesterday's listings (stop point)
          if (dateText.toLowerCase().includes('yesterday')) {
            break;
          }

          // Apply keyword filter
          const hasKeyword = keywords.some((keyword: string) => 
            title.toLowerCase().includes(keyword.toLowerCase())
          );

          if (hasKeyword) {
            // Extract listing ID from URL
            const urlMatch = link.match(/(\d+)/) || link.match(/([a-zA-Z0-9-_]+)$/);
            const listingId = urlMatch ? urlMatch[1] : `${Date.now()}-${Math.random()}`;

            results.push({
              title,
              link: link.startsWith('http') ? link : new URL(link, window.location.origin).href,
              listingId,
              rawHtml: element.outerHTML
            });
          }
        } catch (error) {
          console.error('Error processing listing element:', error);
        }
      }

      return results;
    }, config.selectors, this.keywords, new Date());

    // Process and save listings
    let newListings = 0;
    const errors: string[] = [];

    for (const listingData of listings) {
      try {
        // Check if listing already exists
        const existing = await storage.getListingByListingId(listingData.listingId);
        if (existing) {
          continue;
        }

        // Extract additional data if available
        const revenue = this.extractRevenue(listingData.rawHtml);
        const ebitda = this.extractEbitda(listingData.rawHtml);

        const newListing: InsertListing = {
          link: listingData.link,
          listingId: listingData.listingId,
          title: listingData.title,
          brokerId: broker.id,
          brokerAttractiveness: broker.tier,
          status: "NEW",
          isActive: true,
          revenue: revenue || undefined,
          ebitda: ebitda || undefined,
          category: this.extractCategory(listingData.title)
        };

        await storage.createListing(newListing);
        newListings++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to save listing ${listingData.listingId}: ${errorMessage}`);
      }
    }

    return {
      listingsFound: listings.length,
      newListings,
      errors
    };
  }

  private async applyFilter(page: puppeteer.Page, filter: any): Promise<void> {
    try {
      switch (filter.type) {
        case 'select':
          await page.select(filter.selector, filter.value);
          break;
        case 'click':
          await page.click(filter.selector);
          break;
        case 'type':
          await page.type(filter.selector, filter.value);
          break;
        case 'wait':
          await page.waitForSelector(filter.selector, { timeout: 10000 });
          break;
      }
    } catch (error) {
      console.warn(`Failed to apply filter ${filter.type}:`, error);
    }
  }

  private extractRevenue(html: string): number | null {
    const revenueRegex = /revenue[:\s]*£?([0-9,.]+)(?:m|million)?/i;
    const match = html.match(revenueRegex);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }

  private extractEbitda(html: string): number | null {
    const ebitdaRegex = /ebitda[:\s]*£?([0-9,.]+)(?:k|m|thousand|million)?/i;
    const match = html.match(ebitdaRegex);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      return html.toLowerCase().includes('k') || html.toLowerCase().includes('thousand') ? value / 1000 : value;
    }
    return null;
  }

  private extractCategory(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('mssp') || lower.includes('security')) return 'MSSP';
    if (lower.includes('cloud')) return 'Cloud';
    if (lower.includes('cyber')) return 'Cyber';
    return 'MSP';
  }

  async getScrapingStatus(): Promise<ScrapingStatus> {
    return { ...this.currentStatus };
  }
}

export const scraperService = new ScraperService();
