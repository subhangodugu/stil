import { Request, Response } from "express";
import { db } from "../config/db.js";
import { logger } from "../utils/logger.js";

interface DatabaseChip {
  id: number;
  batch_id: number;
  chip_id: string;
  status: string;
  mismatches: number;
  yield_percent: number;
  total_scan_chains: number;
  total_flip_flops: number;
  total_patterns: number;
  first_fail_pattern: string | null;
  created_at: string;
  batch_name: string;
  upload_timestamp: string;
}

interface FailedChain {
  chip_id: number;
  chain_name: string;
  mismatch_count: number;
}

export const chipController = {
  getSummary: async (req: Request, res: Response) => {
    try {
      const [chips] = await db.query(`
        SELECT 
          c.id, c.batch_id, c.chip_id, c.status, c.mismatches, 
          c.yield_percent, c.total_scan_chains, c.total_flip_flops, 
          c.total_patterns, c.first_fail_pattern, c.created_at,
          b.batch_name, b.upload_timestamp 
        FROM chips c 
        JOIN upload_batches b ON c.batch_id = b.id 
        ORDER BY b.upload_timestamp DESC, c.id DESC
      `);
      
      const [failedChains] = await db.query("SELECT * FROM failed_chains");
      
      const result = (chips as DatabaseChip[]).map(chip => ({
        ...chip,
        failedChains: (failedChains as FailedChain[])
          .filter(fc => fc.chip_id === chip.id)
          .map(fc => fc.chain_name)
      }));

      return res.json(result);
    } catch (error) {
      logger.error("Summary fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch summary" });
    }
  },

  getFailureDetails: async (req: Request, res: Response) => {
    try {
      const { chipId } = req.params;
      const [chips] = await db.query("SELECT * FROM chips WHERE id = ?", [chipId]);
      if ((chips as DatabaseChip[]).length === 0) {
        return res.status(404).json({ error: "Chip not found" });
      }
      const chip = (chips as DatabaseChip[])[0];

      const [details] = await db.query("SELECT * FROM failure_details WHERE chip_id = ?", [chipId]);
      const [chains] = await db.query("SELECT * FROM failed_chains WHERE chip_id = ?", [chipId]);

      return res.json({
        chip,
        failedChains: chains,
        failureDetails: details
      });
    } catch (error) {
      logger.error("Failure details fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch failure details" });
    }
  },

  getBatches: async (req: Request, res: Response) => {
    try {
      const [batches] = await db.query("SELECT * FROM upload_batches ORDER BY upload_timestamp DESC");
      return res.json(batches);
    } catch {
      return res.status(500).json({ error: "Failed to fetch batches" });
    }
  },

  deleteChip: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM chips WHERE id = ?", [id]);
      return res.json({ success: true, message: "Record purged successfully" });
    } catch {
      logger.error("Deletion failed");
      return res.status(500).json({ error: "Failed to delete diagnostic record" });
    }
  },
 
  resetAll: async (req: Request, res: Response) => {
    try {
      await db.query("DELETE FROM failure_details");
      await db.query("DELETE FROM failed_chains");
      await db.query("DELETE FROM analytics_cache");
      await db.query("DELETE FROM chips");
      await db.query("DELETE FROM upload_batches");
      return res.json({ success: true, message: "All diagnostic data cleared" });
    } catch {
      logger.error("Global reset failed");
      return res.status(500).json({ error: "Failed to clear records" });
    }
  }
};
