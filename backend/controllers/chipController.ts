import { Request, Response } from "express";
import { db, query } from "../config/db.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

interface DatabaseChip { id: number; chip_id: string; status: string; mismatches: number; yield_percent: number; created_at: string; batch_name: string; project_data: any; data_source: string; }
interface FailedChain { chip_id: number; chain_name: string; mismatch_count: number; }

export const chipController = {
  getSummary: asyncHandler(async (req, res) => {
    const chips = await query<DatabaseChip>(`
      SELECT c.id, c.chip_id, c.status, c.mismatches, c.yield_percent, c.accuracy, 
             c.total_patterns, c.total_vectors, c.tester_cycles, c.created_at, c.data_source, 
             b.batch_name, b.upload_timestamp 
      FROM chips c JOIN upload_batches b ON c.batch_id = b.id 
      ORDER BY b.id DESC`);
    
    const chains = await query<FailedChain>("SELECT * FROM failed_chains");
    
    return res.json(chips.map(chip => ({
      ...chip,
      failedChains: chains.filter(fc => fc.chip_id === chip.id).map(fc => fc.chain_name)
    })));
  }),

  getFailureDetails: asyncHandler(async (req, res) => {
    const [chip] = await query<DatabaseChip>("SELECT c.*, b.batch_name FROM chips c LEFT JOIN upload_batches b ON c.batch_id = b.id WHERE c.id = ?", [req.params.chipId]);
    if (!chip) return res.status(404).json({ error: "Chip not found" });

    const details = await query("SELECT * FROM failure_details WHERE chip_id = ? ORDER BY id ASC", [chip.id]);
    const chains = await query("SELECT * FROM failed_chains WHERE chip_id = ? ORDER BY mismatch_count DESC", [chip.id]);

    return res.json({ chip, failedChains: chains, failureDetails: details });
  }),

  getBatches: asyncHandler(async (req, res) => res.json(await query("SELECT * FROM upload_batches ORDER BY id DESC"))),

  deleteChip: asyncHandler(async (req, res) => {
    await db.query("DELETE FROM chips WHERE id = ?", [req.params.id]);
    return res.json({ success: true, message: "Record purged successfully" });
  }),
 
  resetAll: asyncHandler(async (req, res) => {
    const tables = ["failure_details", "failed_chains", "analytics_cache", "chips", "upload_batches"];
    for (const table of tables) await db.query(`DELETE FROM ${table}`);
    return res.json({ success: true, message: "All diagnostic data cleared" });
  })
};
