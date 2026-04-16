import { db } from "../../config/db.js";

export interface BatchComparison {
  batchA: { id: number; name: string; yield: number; chips: number };
  batchB: { id: number; name: string; yield: number; chips: number };
  delta: number;
  newHotspots: string[];
}

/**
 * Batch-to-Batch Comparator.
 * Identifies significant shifts in yield and failure signatures between two batches.
 */
export async function compareBatches(idA: number, idB: number): Promise<BatchComparison | null> {
  try {
    const fetchBatch = async (id: number) => {
      const [batch] = await db.query("SELECT * FROM upload_batches WHERE id = ?", [id]);
      const [chips] = await db.query("SELECT AVG(yield_percent) as yield, COUNT(id) as count FROM chips WHERE batch_id = ?", [id]);
      return { 
        id, 
        name: (batch as any[])[0]?.batch_name || `Batch_${id}`,
        yield: parseFloat(((chips as any[])[0]?.yield || 0).toFixed(2)),
        chips: (chips as any[])[0]?.count || 0
      };
    };

    const [bA, bB] = await Promise.all([fetchBatch(idA), fetchBatch(idB)]);
    
    // Find hotspots unique to Batch B
    const [hB] = await db.query(`
      SELECT DISTINCT chain_name 
      FROM failed_chains fc
      JOIN chips c ON fc.chip_id = c.id
      WHERE c.batch_id = ? 
      AND chain_name NOT IN (
        SELECT DISTINCT chain_name FROM failed_chains fc2 
        JOIN chips c2 ON fc2.chip_id = c2.id 
        WHERE c2.batch_id = ?
      )
    `, [idB, idA]);

    return {
      batchA: bA,
      batchB: bB,
      delta: parseFloat((bB.yield - bA.yield).toFixed(2)),
      newHotspots: (hB as any[]).map(r => r.chain_name)
    };
  } catch (error) {
    console.error("Batch comparison failed:", error);
    return null;
  }
}
