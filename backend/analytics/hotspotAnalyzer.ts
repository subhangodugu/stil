import { db } from "../config/db.js";
import { logger } from "../utils/logger.js";

export interface HotspotPoint {
  chainName: string;
  totalMismatches: number;
  chipCount: number;
  avgPosition?: number;
}

export interface PatternWeakness {
  patternId: string;
  failCount: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Global Hotspot Analyzer.
 * Detects the most frequently failing scan chains across the entire database.
 */
export async function getGlobalHotspots(): Promise<HotspotPoint[]> {
  try {
    const [rows] = await db.query(`
      SELECT 
        chain_name as chainName,
        SUM(mismatch_count) as totalMismatches,
        COUNT(DISTINCT chip_id) as chipCount
      FROM failed_chains
      GROUP BY chain_name
      ORDER BY totalMismatches DESC
      LIMIT 10
    `);

    return (rows as HotspotPoint[]).map(row => ({
      ...row,
      totalMismatches: Number(row.totalMismatches)
    }));
  } catch (error) {
    logger.error("Hotspot analysis failed:", error);
    return [];
  }
}

/**
 * Weak Pattern Analyzer.
 * Identifies patterns that cause the most mismatches across all failing chips.
 */
export async function getWeakPatterns(): Promise<PatternWeakness[]> {
  try {
    const [rows] = await db.query(`
      SELECT 
        pattern_id as patternId,
        COUNT(id) as failCount
      FROM failure_details
      GROUP BY pattern_id
      ORDER BY failCount DESC
      LIMIT 10
    `);

    return (rows as unknown[]).map((row: Record<string, unknown>) => {
      const count = Number(row.failCount);
      let severity: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (count > 50) severity = "HIGH";
      else if (count > 20) severity = "MEDIUM";
      
      return { 
        patternId: row.patternId, 
        failCount: count,
        severity 
      };
    });
  } catch (error) {
    logger.error("Pattern weakness analysis failed:", error);
    return [];
  }
}
