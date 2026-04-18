/**
 * Unified Diagnostic Pipeline Service (v4 - Industrial Scan Simulator).
 *
 * Decision hierarchy (no-log path):
 *   1. ATE fail log provided  → faultAnalyzer  (real ATE data, highest fidelity)
 *   2. STIL has expectedValues → scanSimulator  (bit-level simulation, real accuracy)
 *   3. Neither               → legacyInference (structural inference, last resort)
 */
import { parseSTIL } from "./stilParser.js";
import { parseLogFile } from "./logParser.js";
import { analyzeFaults, AnalysisResult } from "./faultAnalyzer.js";
import { inferChipResult } from "./legacyInference.js";
import { runScanSimulation } from "./scanSimulator.js";
import { db } from "../config/db.js";
import fs from "fs";

export async function runDiagnosticPipeline(files: Express.Multer.File[], batchName?: string, failLogText?: string) {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const finalBatchName = batchName || `Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const [batchResult] = await connection.execute(
      "INSERT INTO upload_batches(batch_name, total_files) VALUES (?, ?)",
      [finalBatchName, files.length]
    );
    const batchId = (batchResult as { insertId: number }).insertId;
    const results = [];

    for (const file of files) {
      const chipId = file.originalname;
      try {
        let stilText: string;
        if (file.path) {
          stilText = await fs.promises.readFile(file.path, 'utf-8');
          await fs.promises.unlink(file.path).catch(() => {});
        } else {
          stilText = file.buffer.toString('utf-8');
        }
        
        const parsed = parseSTIL(stilText);
        let inference: AnalysisResult;
        let accuracy: number;
        let totalBitsAnalyzed: number;
        let passedBits: number;

        const logs = failLogText ? parseLogFile(failLogText, parsed.scanChains) : [];
        const sim = await runScanSimulation(parsed, logs); 

        inference = {
          status: sim.status,
          mismatches: sim.failedBits,
          failedChains: sim.failedChains,
          yieldPercent: sim.yieldPercent,
          firstFailPattern: sim.firstFailPattern,
          failureDetails: sim.failureDetails,
          dataSource: sim.dataSource
        } as AnalysisResult;

        accuracy = sim.accuracy;
        totalBitsAnalyzed = sim.totalBits;
        passedBits = sim.passedBits;

        // Persist individual Chip results
        const [chipResult] = await connection.execute(
          `INSERT INTO chips 
          (batch_id, chip_id, status, mismatches, yield_percent, accuracy, 
           total_scan_chains, total_flip_flops, total_patterns, total_vectors, 
           tester_cycles, resolved_patterns, first_fail_pattern, project_data, data_source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            batchId, 
            chipId, 
            inference.status, 
            inference.mismatches, 
            inference.yieldPercent,
            accuracy,
            parsed.scanChains.length, 
            parsed.totalFFs, 
            parsed.totalPatterns,          
            parsed.vectorCount || 0,        
            parsed.testerCycles || 0,       
            parsed.patternCount || 0,       
            inference.firstFailPattern,
            JSON.stringify(parsed),
            sim.dataSource
          ]
        );
        const chipInsertId = (chipResult as { insertId: number }).insertId;

        for (const chain of (inference.failedChains || []) as { name: string; mismatchCount: number }[]) {
          await connection.execute(
            "INSERT INTO failed_chains (chip_id, chain_name, mismatch_count) VALUES (?, ?, ?)",
            [chipInsertId, chain.name, chain.mismatchCount]
          );
        }

        for (const detail of (inference.failureDetails || []) as any[]) {
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
          accuracy,
          totalBitsAnalyzed,
          passedBits,
          ...inference
        });
      } catch (fileError) {
        console.error(`[DIAGNOSTIC PIPELINE ERROR] Failed to process chip ${chipId}:`, fileError);
        // Continue to next file in batch
      }
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
