import { parseSTIL } from "../parser.js";
import { inferChipResult } from "../testerInference.js";
import { db } from "../../config/db.js";
import fs from "fs";

/**
 * Unified Diagnostic Pipeline Service.
 * Ensures that every processed STIL file is persisted to the database
 * for immediate synchronization with Dashboard, Intelligence, and Drill-down views.
 */
export async function runDiagnosticPipeline(files: Express.Multer.File[], batchName?: string) {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Create the Batch record
    const finalBatchName = batchName || `Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const [batchResult] = await connection.execute(
      "INSERT INTO upload_batches(batch_name, total_files) VALUES (?, ?)",
      [finalBatchName, files.length]
    );
    const batchId = (batchResult as any).insertId;

    const results = [];

    // 2. Process each file in the batch
    for (const file of files) {
      let stilText: string;
      if (file.path) {
        stilText = await fs.promises.readFile(file.path, 'utf-8');
        await fs.promises.unlink(file.path).catch(() => {});
      } else {
        stilText = file.buffer.toString('utf-8');
      }
      
      // Industrial Parsing & Inference
      const parsed = parseSTIL(stilText);
      const inference = inferChipResult(parsed);
      const chipId = file.originalname;

      // 3. Persist individual Chip results with full architecture recall support (v2)
      const projectDataMetadata = {
        schemaVersion: 2, // Architecture schema versioning (Upgraded for topology localization)
        scanChains: parsed.scanChains,
        totalFFs: parsed.totalFFs,
        totalPatterns: parsed.totalPatterns,
        hasEDT: parsed.hasEDT,
        signals: parsed.signals,
        topologyFaultMap: inference.failedChains.map(chain => ({
          chainName: chain.name,
          mismatchCount: chain.mismatchCount,
          severity: chain.mismatchCount > 5 ? "HIGH" : (chain.mismatchCount > 2 ? "MEDIUM" : "LOW")
        })),
        localizedFaults: inference.failureDetails.map(detail => ({
          patternId: detail.patternId,
          chainName: detail.chainName,
          ffPosition: detail.flipFlopPosition,
          expected: detail.expected,
          actual: detail.actual
        }))
      };

      const [chipResult] = await connection.execute(
        `INSERT INTO chips 
        (batch_id, chip_id, status, mismatches, yield_percent, total_scan_chains, total_flip_flops, total_patterns, first_fail_pattern, project_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batchId, 
          chipId, 
          inference.status, 
          inference.mismatches, 
          inference.yieldPercent, 
          parsed.scanChains.length, 
          parsed.totalFFs, 
          parsed.totalPatterns, 
          inference.firstFailPattern,
          JSON.stringify(projectDataMetadata)
        ]
      );
      const chipInsertId = (chipResult as any).insertId;

      // 4. Persist failing chain metadata
      for (const chain of inference.failedChains) {
        await connection.execute(
          "INSERT INTO failed_chains (chip_id, chain_name, mismatch_count) VALUES (?, ?, ?)",
          [chipInsertId, chain.name, chain.mismatchCount]
        );
      }

      // 5. Persist failure details (bit-table) for drill-down
      for (const detail of inference.failureDetails) {
        await connection.execute(
          `INSERT INTO failure_details 
          (chip_id, pattern_id, chain_name, flip_flop_position, expected_value, actual_value, mismatch_type) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            chipInsertId,
            detail.patternId,
            detail.chainName,
            detail.flipFlopPosition,
            detail.expected,
            detail.actual,
            detail.mismatchType
          ]
        );
      }

      results.push({
        id: chipInsertId,
        chipId,
        ...inference,
        totalFFs: parsed.totalFFs,
        totalPatterns: parsed.totalPatterns,
        projectData: parsed // Keep parsed data for immediate frontend return
      });
    }

    await connection.commit();
    return { batchId, results };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
