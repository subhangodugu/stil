import { db } from "../config/db.js";

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

    return (rows as any[]).map((row, idx) => ({
      clusterId: `CLUSTER_ALPHA_${idx + 1}`,
      representativeChain: row.representativeChain,
      affectedChips: row.affectedChips,
      patternCoincidence: row.coincidenceCount,
      confidence: Math.min(0.99, 0.4 + (row.affectedChips * 0.1))
    }));
  } catch (error) {
    console.error("Root cause clustering failed:", error);
    return [];
  }
}
