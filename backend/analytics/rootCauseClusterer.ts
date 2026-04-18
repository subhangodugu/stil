import { db } from "../config/db.js";
import { logger } from "../utils/logger.js";

export interface FaultCluster {
  clusterId: string;
  representativeChain: string;
  affectedChips: number;
  patternCoincidence: number;
  confidence: number;
}

/**
 * Root Cause Clusterer.
 * Groups failures that share identical pattern-chain signatures.
 */
export async function getRootCauseClusters(): Promise<FaultCluster[]> {
  try {
    const [rows] = await db.query(`
      SELECT 
        fc.chain_name as representativeChain,
        COUNT(DISTINCT fc.chip_id) as affectedChips,
        COUNT(fd.id) as coincidenceCount
      FROM failed_chains fc
      JOIN failure_details fd ON fc.chip_id = fd.chip_id
      GROUP BY fc.chain_name
      HAVING affectedChips > 1
      ORDER BY coincidenceCount DESC
      LIMIT 10
    `);

    return (rows as { representativeChain: string; affectedChips: number; coincidenceCount: number }[]).map((row, idx) => ({
      clusterId: `CLUSTER_ALPHA_${idx + 1}`,
      representativeChain: row.representativeChain as string,
      affectedChips: row.affectedChips as number,
      patternCoincidence: row.coincidenceCount as number,
      confidence: Math.min(0.99, 0.4 + ((row.affectedChips as number) * 0.1))
    }));
  } catch (error) {
    logger.error("Root cause clustering failed:", error);
    return [];
  }
}
