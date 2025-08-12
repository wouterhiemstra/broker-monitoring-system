import { Router } from "express";
import { db } from "../db";
import { brokers } from "../../shared/schema";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(brokers);
    res.json(rows);
  } catch (e: any) {
    console.error("GET /api/brokers error:", e);
    res.status(500).json({ error: "failed_to_fetch_brokers", detail: String(e?.message || e) });
  }
});

export default router;
