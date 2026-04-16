import { db } from "../../config/db.js";

export interface YieldTrendPoint {
  batchId: number;
  batchName: string;
  avgYield: number;
  chipCount: number;
  timestamp: string;
}

/**
 * Historical Yield Trend Analyzer.
 * Aggregates yield data across chronological upload batches.
 */
export async function getHistoricalYieldTrend(): Promise<YieldTrendPoint[]> {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.id as batchId,
        b.batch_name as batchName,
        AVG(c.yield_percent) as avgYield,
        COUNT(c.id) as chipCount,
        b.upload_timestamp as timestamp
      FROM upload_batches b
      JOIN chips c ON b.id = c.batch_id
      GROUP BY b.id
      ORDER BY b.upload_timestamp ASC
      LIMIT 20
    `);

    return (rows as any[]).map(row => ({
      ...row,
      avgYield: parseFloat(row.avgYield.toFixed(2))
    }));
  } catch (error) {
    console.error("Historical yield analysis failed:", error);
    return [];
  }
}
