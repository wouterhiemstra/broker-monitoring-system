import cron from "node-cron";
import { scraperService } from "./scraper";
import { storage } from "../storage";

class SchedulerService {
  private morningJob?: cron.ScheduledTask;
  private afternoonJob?: cron.ScheduledTask;

  start(): void {
    // Morning scan - 9:00 AM on weekdays
    this.morningJob = cron.schedule('0 9 * * 1-5', async () => {
      console.log('Starting scheduled morning scraping...');
      try {
        await scraperService.scrapeAllBrokers();
        console.log('Morning scraping completed successfully');
      } catch (error) {
        console.error('Morning scraping failed:', error);
        
        // Log system pain point
        const brokers = await storage.getBrokers();
        if (brokers.length > 0) {
          await storage.createPainPoint({
            brokerId: brokers[0].id, // Use first broker as system-wide reference
            issueType: "Scheduled Scraping Failure",
            description: `Morning scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timeLostMin: 30
          });
        }
      }
    });

    // Afternoon scan - 2:00 PM on weekdays  
    this.afternoonJob = cron.schedule('0 14 * * 1-5', async () => {
      console.log('Starting scheduled afternoon scraping...');
      try {
        // Focus on high-priority brokers for afternoon scan
        const brokers = await storage.getBrokers();
        const highPriorityBrokers = brokers.filter(b => 
          b.isActive && (b.name === 'Smergers' || b.name === 'Benchmark International')
        );

        for (const broker of highPriorityBrokers) {
          await scraperService.scrapeBroker(broker);
        }
        
        console.log('Afternoon scraping completed successfully');
      } catch (error) {
        console.error('Afternoon scraping failed:', error);
        
        // Log system pain point
        const brokers = await storage.getBrokers();
        if (brokers.length > 0) {
          await storage.createPainPoint({
            brokerId: brokers[0].id,
            issueType: "Scheduled Scraping Failure", 
            description: `Afternoon scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timeLostMin: 15
          });
        }
      }
    });

    console.log('Scraping scheduler started - Morning: 9:00 AM, Afternoon: 2:00 PM (weekdays)');
  }

  stop(): void {
    if (this.morningJob) {
      this.morningJob.stop();
      this.morningJob = undefined;
    }
    
    if (this.afternoonJob) {
      this.afternoonJob.stop();
      this.afternoonJob = undefined;
    }
    
    console.log('Scraping scheduler stopped');
  }

  async runManualScan(): Promise<void> {
    console.log('Starting manual scraping scan...');
    await scraperService.scrapeAllBrokers();
  }

  async runBrokerScan(brokerId: string): Promise<void> {
    console.log(`Starting manual scan for broker ${brokerId}...`);
    const broker = await storage.getBroker(brokerId);
    if (!broker) {
      throw new Error('Broker not found');
    }
    await scraperService.scrapeBroker(broker);
  }
}

export const schedulerService = new SchedulerService();

// Start scheduler when module loads
schedulerService.start();
