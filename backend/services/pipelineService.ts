import { parseSTIL } from "./stilParser.js";
import { parseLogFile } from "./logParser.js";
import { analyzeFaults, AnalysisResult } from "./faultAnalyzer.js";
import { inferChipResult } from "./legacyInference.js";
import { db } from "../config/db.js";
import fs from "fs";

/**
 * Unified Diagnostic Pipeline Service (v3 - Industrial).
 */
export async function runDiagnosticPipeline(files: Express.Multer.File[], batchName?: string, failLogText?: string) {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const finalBatchName = batchName || `Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const [batchResult] = await connection.execute(
      "INSERT INTO upload_batches(batch_name, total_files) VALUES (?, ?)",
      [finalBatchName, files.length]
    );
    const batchId = (batchResult as any).insertId;
    const results = [];

    for (const file of files) {
      let stilText: string;
      if (file.path) {
        stilText = await fs.promises.readFile(file.path, 'utf-8');
        await fs.promises.unlink(file.path).catch(() => {});
      } else {
        stilText = file.buffer.toString('utf-8');
      }
      
      const parsed = parseSTIL(stilText);
      let inference: AnalysisResult;

      // Industrial Decision Logic
      if (failLogText) {
        const logs = parseLogFile(failLogText, parsed.scanChains);
        inference = analyzeFaults(parsed, logs);
      } else {
        // Fallback to legacy inference if no log provided
        const legacy = inferChipResult(parsed);
        inference = {
           ...legacy,
           failureDetails: legacy.failureDetails.map(d => ({ ...d, faultType: "UNKNOWN" }))
        } as AnalysisResult;
      }

      const chipId = file.originalname;

      // Persist individual Chip results
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
          JSON.stringify(parsed)
        ]
      );
      const chipInsertId = (chipResult as any).insertId;

      for (const chain of inference.failedChains as any[]) {
        await connection.execute(
          "INSERT INTO failed_chains (chip_id, chain_name, mismatch_count) VALUES (?, ?, ?)",
          [chipInsertId, chain.name, chain.mismatchCount]
        );
      }

      for (const detail of inference.failureDetails as any[]) {
        await connection.execute(
          `INSERT INTO failure_details 
          (chip_id, pattern_id, chain_name, flip_flop_position, expected_value, actual_value, mismatch_type, fault_type) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            chipInsertId,
            detail.patternId,
            detail.chainName,
            detail.flipFlopPosition,
            detail.expected,
            detail.actual,
            detail.mismatchType || "LOGIC_MISMATCH",
            detail.faultType
          ]
        );
      }

      results.push({
        id: chipInsertId,
        chipId,
        ...inference
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
