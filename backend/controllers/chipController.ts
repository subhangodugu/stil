import { Request, Response } from "express";
import { db } from "../config/db.js";

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
      
      const result = (chips as any[]).map(chip => ({
        ...chip,
        failedChains: (failedChains as any[])
          .filter(fc => fc.chip_id === chip.id)
          .map(fc => fc.chain_name)
      }));

      return res.json(result);
    } catch (error) {
      console.error("Summary fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch summary" });
    }
  },

  getFailureDetails: async (req: Request, res: Response) => {
    try {
      const { chipId } = req.params;
      const [chips] = await db.query("SELECT * FROM chips WHERE id = ?", [chipId]);
      if ((chips as any[]).length === 0) {
        return res.status(404).json({ error: "Chip not found" });
      }
      const chip = (chips as any[])[0];

      const [details] = await db.query("SELECT * FROM failure_details WHERE chip_id = ?", [chipId]);
      const [chains] = await db.query("SELECT * FROM failed_chains WHERE chip_id = ?", [chipId]);

      return res.json({
        chip,
        failedChains: chains,
        failureDetails: details
      });
    } catch (error) {
      console.error("Failure details fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch failure details" });
    }
  },

  getBatches: async (req: Request, res: Response) => {
    try {
      const [batches] = await db.query("SELECT * FROM upload_batches ORDER BY upload_timestamp DESC");
      return res.json(batches);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch batches" });
    }
  },

  deleteChip: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM chips WHERE id = ?", [id]);
      return res.json({ success: true, message: "Record purged successfully" });
    } catch (error) {
      console.error("Deletion failed:", error);
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
    } catch (error) {
      console.error("Global reset failed:", error);
      return res.status(500).json({ error: "Failed to clear records" });
    }
  }
};
