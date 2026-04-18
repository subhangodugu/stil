import { db } from "../config/db.js";

export interface BatchComparison {
  batchId: number;
  batchName: string;
  avgYield: number;
  mismatchCount: number;
  topFailingChain: string;
}

/**
 * Industrial Batch Comparator.
 * Compares diagnostic metrics across different upload sessions.
 */
export async function compareBatches(): Promise<BatchComparison[]> {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.id as batchId,
        b.batch_name as batchName,
        AVG(c.yield_percent) as avgYield,
        SUM(c.mismatches) as mismatchCount,
        (
          SELECT chain_name 
          FROM failed_chains fc 
          JOIN chips c2 ON fc.chip_id = c2.id 
          WHERE c2.batch_id = b.id 
          GROUP BY chain_name 
          ORDER BY SUM(mismatch_count) DESC 
          LIMIT 1
        ) as topFailingChain
      FROM upload_batches b
      LEFT JOIN chips c ON b.id = c.batch_id
      GROUP BY b.id
      ORDER BY b.upload_timestamp DESC
      LIMIT 5
    `);

    return (rows as any[]).map(row => ({
      ...row,
      avgYield: parseFloat((row.avgYield || 0).toFixed(2)),
      mismatchCount: Number(row.mismatchCount || 0),
      topFailingChain: row.topFailingChain || "None"
    }));
  } catch (error) {
    console.error("Batch comparison failed:", error);
    return [];
  }
}
