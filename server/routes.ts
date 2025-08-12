import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertBrokerSchema, ListingStatus } from "@shared/schema";
import { scraperService } from "./services/scraper";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // KPI Dashboard endpoint
  app.get("/api/kpis", async (req, res) => {
    try {
      const kpis = await storage.getKPIs();
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  // Brokers endpoints
  app.get("/api/brokers", async (req, res) => {
    try {
      const brokers = await storage.getBrokers();
      res.json(brokers);
    } catch (error) {
      console.error("Error fetching brokers:", error);
      res.status(500).json({ message: "Failed to fetch brokers" });
    }
  });

  app.post("/api/brokers", async (req, res) => {
    try {
      const brokerData = insertBrokerSchema.parse(req.body);
      const broker = await storage.createBroker(brokerData);
      res.status(201).json(broker);
    } catch (error) {
      console.error("Error creating broker:", error);
      res.status(400).json({ message: "Failed to create broker" });
    }
  });

  app.patch("/api/brokers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const broker = await storage.updateBroker(id, updates);
      if (!broker) {
        return res.status(404).json({ message: "Broker not found" });
      }
      res.json(broker);
    } catch (error) {
      console.error("Error updating broker:", error);
      res.status(400).json({ message: "Failed to update broker" });
    }
  });

  // Listings endpoints
  app.get("/api/listings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      
      let listings = await storage.getListingsWithBrokers(limit, offset);
      
      if (status && status !== "All Statuses") {
        listings = listings.filter(listing => listing.status === status);
      }
      
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/recent", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const listings = await storage.getRecentListings(days);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching recent listings:", error);
      res.status(500).json({ message: "Failed to fetch recent listings" });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const listing = await storage.getListing(id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      const listingData = insertListingSchema.parse(req.body);
      
      // Check for duplicate listing ID
      const existingListing = await storage.getListingByListingId(listingData.listingId);
      if (existingListing) {
        return res.status(409).json({ message: "Listing ID already exists" });
      }
      
      const listing = await storage.createListing(listingData);
      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(400).json({ message: "Failed to create listing" });
    }
  });

  app.patch("/api/listings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.status && !ListingStatus.safeParse(updates.status).success) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const listing = await storage.updateListing(id, updates);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(400).json({ message: "Failed to update listing" });
    }
  });

  // Scraping endpoints
  app.get("/api/scraping/logs", async (req, res) => {
    try {
      const brokerId = req.query.brokerId as string;
      const logs = await storage.getScrapingLogs(brokerId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching scraping logs:", error);
      res.status(500).json({ message: "Failed to fetch scraping logs" });
    }
  });

  app.post("/api/scraping/start", async (req, res) => {
    try {
      const { brokerId } = req.body;
      
      if (brokerId) {
        const broker = await storage.getBroker(brokerId);
        if (!broker) {
          return res.status(404).json({ message: "Broker not found" });
        }
        await scraperService.scrapeBroker(broker);
      } else {
        await scraperService.scrapeAllBrokers();
      }
      
      res.json({ message: "Scraping started successfully" });
    } catch (error) {
      console.error("Error starting scraping:", error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  app.get("/api/scraping/status", async (req, res) => {
    try {
      const status = await scraperService.getScrapingStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching scraping status:", error);
      res.status(500).json({ message: "Failed to fetch scraping status" });
    }
  });

  // File upload endpoint
  app.post("/api/files/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileExtension = path.extname(req.file.originalname);
      const newFilename = `${req.file.filename}${fileExtension}`;
      const newPath = path.join('uploads', newFilename);
      
      fs.renameSync(req.file.path, newPath);

      res.json({
        filename: newFilename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/api/files/${newFilename}`
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/files/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const filepath = path.join('uploads', filename);
      
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.sendFile(path.resolve(filepath));
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Export endpoint
  app.get("/api/export/excel", async (req, res) => {
    try {
      const listings = await storage.getListingsWithBrokers(1000); // Get all listings for export
      
      // Format data for CSV export (Excel compatible)
      const csvHeaders = [
        'Date_Added', 'Link', 'Listing_ID', 'Active?', 'Status', 'Broker_Attractiveness',
        'Broker', 'Contact_Person', 'Revenue (£m)', 'EBITDA (£m)', 'FTEs',
        'Recurring_Rev_%', 'Category', 'Notes', 'Evidence_Link'
      ];
      
      const csvRows = listings.map(listing => [
        listing.dateAdded?.toISOString().split('T')[0] || '',
        listing.link,
        listing.listingId,
        listing.isActive ? 'YES' : 'NO',
        listing.status,
        listing.brokerAttractiveness,
        listing.broker.name,
        listing.contactPerson || '',
        listing.revenue || '',
        listing.ebitda || '',
        listing.ftes || '',
        listing.recurringRevPercent || '',
        listing.category || '',
        listing.notes || '',
        listing.evidenceLink || ''
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=broker_listings.csv');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Pain points endpoint
  app.post("/api/pain-points", async (req, res) => {
    try {
      const painPoint = await storage.createPainPoint(req.body);
      res.status(201).json(painPoint);
    } catch (error) {
      console.error("Error creating pain point:", error);
      res.status(400).json({ message: "Failed to create pain point" });
    }
  });

  app.get("/api/pain-points", async (req, res) => {
    try {
      const brokerId = req.query.brokerId as string;
      const painPoints = await storage.getPainPoints(brokerId);
      res.json(painPoints);
    } catch (error) {
      console.error("Error fetching pain points:", error);
      res.status(500).json({ message: "Failed to fetch pain points" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
