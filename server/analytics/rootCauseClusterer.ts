import { db } from "../../config/db.js";

export interface FailureCluster {
  mode: string;
  chipCount: number;
  avgMismatches: number;
  primaryChain: string;
}

/**
 * Root Cause Clusterer.
 * Automatically groups failing chips by their most prominent failure signature.
 * In Phase 3, we cluster by (Primary Failing Chain + Mismatch Type).
 */
export async function getRootCauseClusters(): Promise<FailureCluster[]> {
  try {
    // This query finds the "Primary" (worst) failed chain for each chip and groups chips by this chain
    const [rows] = await db.query(`
      WITH ChipWorstChain AS (
        SELECT 
          fc.chip_id,
          fc.chain_name,
          fd.mismatch_type,
          ROW_NUMBER() OVER(PARTITION BY fc.chip_id ORDER BY fc.mismatch_count DESC) as rank_idx
        FROM failed_chains fc
        LEFT JOIN failure_details fd ON fc.chip_id = fd.chip_id AND fc.chain_name = fd.chain_name
      )
      SELECT 
        chain_name as primaryChain,
        mismatch_type as mode,
        COUNT(DISTINCT chip_id) as chipCount,
        COALESCE(AVG(chip_id), 0) as dummy_avg
      FROM ChipWorstChain
      WHERE rank_idx = 1
      GROUP BY chain_name, mismatch_type
      ORDER BY chipCount DESC
      LIMIT 10
    `);

    return (rows as any[]).map(row => ({
      mode: row.mode || "STUCK_AT_FAULT",
      chipCount: Number(row.chipCount),
      avgMismatches: 0, // Placeholder
      primaryChain: row.primaryChain
    }));
  } catch (error) {
    console.error("Root cause clustering failed:", error);
    return [];
  }
}
