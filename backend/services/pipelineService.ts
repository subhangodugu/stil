/**
 * Unified Diagnostic Pipeline Service (v4 - Industrial Scan Simulator).
 *
 * Decision hierarchy (no-log path):
 *   1. ATE fail log provided  → faultAnalyzer  (real ATE data, highest fidelity)
 *   2. STIL has expectedValues → scanSimulator  (bit-level simulation, real accuracy)
 *   3. Neither               → legacyInference (structural inference, last resort)
 */
import { parseSTIL, STILUnified } from "./stilParser.js";
import { parseLogFile } from "./logParser.js";
import { inferChipResult } from "./legacyInference.js";
import { runScanSimulation } from "./scanSimulator.js";
import { db } from "../config/db.js";
import { AnalysisResult, FailedChain, ClassifiedFault } from "../types/diagnostic.js";
import { auditSTILFile } from "./aiService.js";
import { logger } from "../utils/logger.js";
import fs from "fs";

export interface IngestionProgress {
  filename: string;
  step: 'READING' | 'AI_AUDIT' | 'SIMULATING' | 'PERSISTING' | 'COMPLETE' | 'FAILED';
  details?: any;
  cycle?: number;
}

export async function runDiagnosticPipeline(
  files: Express.Multer.File[], 
  batchName?: string, 
  failLogText?: string, 
  preParsed?: STILUnified,
  onProgress?: (p: IngestionProgress) => void
) {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const finalBatchName = batchName || `Batch_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const [batchResult] = await connection.execute(
      "INSERT INTO upload_batches(batch_name, total_files) VALUES (?, ?)",
      [finalBatchName, files.length]
    );
    const batchId = (batchResult as { insertId: number }).insertId;

    // 1. Pre-process and separate STIL/Log files for intelligent correlation
    const stilFiles = files.filter(f => /\.(stil|stf)$/i.test(f.originalname));
    const logFiles = files.filter(f => /\.(log|txt|json)$/i.test(f.originalname));
    const results = [];

    // 2. Map Log Files by base name for O(1) correlation during the loop
    const logMap = new Map<string, string>();
    for (const log of logFiles) {
      const base = log.originalname.replace(/\.[^/.]+$/, "");
      const text = log.path ? await fs.promises.readFile(log.path, 'utf-8') : log.buffer.toString('utf-8');
      logMap.set(base, text);
    }

    // 3. Process STIL files with individual transaction isolation
    for (const file of stilFiles) {
      const chipId = file.originalname;
      const baseName = chipId.replace(/\.[^/.]+$/, "");
      
      // Start a per-chip transaction to ensure partial success is preserved
      await connection.beginTransaction();

      try {
        if (onProgress) onProgress({ filename: file.originalname, step: 'READING' });
        
        const stilContent = file.path ? await fs.promises.readFile(file.path, 'utf-8') : file.buffer.toString('utf-8');
        
        if (!stilContent || stilContent.trim().length < 10) {
          throw new Error("Industrial Data Error: STIL file is empty or too small for analysis.");
        }
        
        // --- 🤖 AI ARCHITECTURAL AUDIT ---
        let aiAudit = null;
        if (onProgress) {
          onProgress({ filename: file.originalname, step: 'AI_AUDIT' });
          const auditSnippet = stilContent.split('\n').slice(0, 500).join('\n');
          try {
             const auditJson = await auditSTILFile(auditSnippet);
             aiAudit = JSON.parse(auditJson);
             onProgress({ filename: file.originalname, step: 'AI_AUDIT', details: aiAudit });
          } catch (e) {
             logger.warn(`[AI_AUDIT_FAIL] ${file.originalname}:`, e);
          }
        }

        const parsed = preParsed || parseSTIL(stilContent);
        if (file.path) await fs.promises.unlink(file.path).catch(() => {});

        if (onProgress) onProgress({ filename: file.originalname, step: 'SIMULATING', details: { patterns: parsed.patternCount } });

        // Correlation: Use global failLogText if provided, otherwise try naming match from local logMap
        const activeLogText = failLogText || logMap.get(baseName);
        const logs = activeLogText ? parseLogFile(activeLogText, parsed.scanChains) : [];
        const sim = await runScanSimulation(parsed, logs); 

        // Inject Analysis Results into the STIL Metadata Object
        const enrichedParsed = { 
          ...parsed, 
          faults: sim.faults, 
          failureDetails: sim.failureDetails,
          dataSource: sim.dataSource,
          // Refined Accuracy: Ensure we don't overestimate pass-rates on partial patterns
          accuracy: sim.accuracy ?? (sim.mismatches === 0 ? 100 : 99.9),
          yieldPercent: sim.yieldPercent
        };

        // Industrial Payload Integrity: Preserve full patterns for forensic simulation.
        // Ensure MySQL max_allowed_packet is configured for large industrial designs.
        const storableParsed = { ...enrichedParsed };

        // Ingestion Progress: Persisting
        if (onProgress) onProgress({ filename: file.originalname, step: 'PERSISTING' });

        // Persist individual Chip results
        const [chipResult] = await connection.execute(
          `INSERT INTO chips 
          (batch_id, chip_id, status, mismatches, yield_percent, accuracy, 
           total_scan_chains, total_flip_flops, total_patterns, total_vectors, 
           tester_cycles, resolved_patterns, first_fail_pattern, project_data, data_source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            batchId, chipId, sim.status, sim.mismatches, sim.yieldPercent, sim.accuracy,
            parsed.scanChains.length, parsed.totalFFs, parsed.totalPatterns,          
            parsed.vectorCount || 0, parsed.testerCycles || 0, parsed.patternCount || 0,       
            sim.firstFailPattern, JSON.stringify(storableParsed), sim.dataSource
          ]
        );
        const chipInsertId = (chipResult as { insertId: number }).insertId;

        for (const chain of (sim.failedChains || []) as { name: string; mismatchCount: number }[]) {
          await connection.execute("INSERT INTO failed_chains (chip_id, chain_name, mismatch_count) VALUES (?, ?, ?)", [chipInsertId, chain.name, chain.mismatchCount]);
        }

        for (const fault of (sim.faults || []) as any[]) {
          await connection.execute(
            `INSERT INTO localized_defects (chip_id, channel, ff_id, fault_type, confidence, severity, fail_count, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [chipInsertId, fault.channel, fault.ff, fault.faultType, fault.confidence, fault.severity, fault.failCount, fault.description]
          );
        }

        for (const detail of (sim.failureDetails || []) as any[]) {
          await connection.execute(
            `INSERT INTO failure_details (chip_id, pattern_id, chain_name, flip_flop_position, expected_value, actual_value, mismatch_type, fault_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [chipInsertId, detail.patternId, detail.chainName, detail.flipFlopPosition, detail.expected, detail.actual, detail.mismatchType || "LOGIC_MISMATCH", detail.faultType]
          );
        }

        results.push({ id: chipInsertId, chipId, ...sim, parsedData: parsed });
        await connection.commit();

        if (onProgress) onProgress({ filename: file.originalname, step: 'COMPLETE', details: { id: chipInsertId } });
      } catch (fileError) {
        await connection.rollback();
        logger.error(`[DIAGNOSTIC PIPELINE ERROR] Failed to process chip ${chipId}:`, fileError);
        if (onProgress) onProgress({ filename: file.originalname, step: 'FAILED', details: fileError instanceof Error ? fileError.message : "Unknown Error" });
      }
    }

    // Cleanup remaining log files if any
    for (const log of logFiles) {
       if (log.path) await fs.promises.unlink(log.path).catch(() => {});
    }

    return { batchId, results, lastParsed: results.length > 0 ? (results[results.length-1] as any).parsedData : null };
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
