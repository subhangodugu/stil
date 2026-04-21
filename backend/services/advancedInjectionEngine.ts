import { parseSTIL, STILUnified } from "./stilParser.js";
import { runActivationEngine } from "./activationEngine.js";
import { buildFaultSummary } from "./faultSummaryBuilder.js";
import { generateFailLogText, generateFailLogJson } from "./failLogGenerator.js";
import { IndustrialError } from "../utils/IndustrialError.js";

/**
 * Industrial Advanced Injection Engine.
 * Simulates fault injection into silicon architecture based on STIL metadata.
 */
export function runAdvancedInjection(
  stilText: string,
  params: {
    targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
    severity: number;
    clusterSize: number;
    intermittentProb?: number;
  }
) {
  // Step 1: Parse STIL (Unified Lexical Scanner)
  const stilMetadata = parseSTIL(stilText);

  if (!stilMetadata.patterns || stilMetadata.patterns.length === 0) {
    throw new IndustrialError("SIMULATION_DATA_MISSING", "Critical Simulation Failure: STIL design contains no vector blocks for fault activation.", 422);
  }

  // Step 2: Expand targets based on clusterSize
  const expandedTargets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }> = [];
  params.targets.forEach(t => {
    if (!t.chainName) return; // Skip invalid targets
    
    const chainLen = stilMetadata.scanLengthPerChain[t.chainName];
    if (chainLen == null) {
      throw new Error(`Critical Simulation Error: Specified scan chain "${t.chainName}" does not exist in the design.`);
    }
    for (let i = 0; i < params.clusterSize; i++) {
      const bit = t.bitPosition + i;
      if (bit < chainLen) {
        expandedTargets.push({ chainName: t.chainName, bitPosition: bit, faultType: t.faultType });
      }
    }
  });

  // Step 3 & 4: Run Activation Engine
  const activationResult = runActivationEngine(stilMetadata, {
    ...params,
    targets: expandedTargets
  });

  // Step 4: Build Fault Summary
  const faultSummary = buildFaultSummary(stilMetadata, params, activationResult.stats);

  // Step 5: Generate Outputs
  const logText = generateFailLogText(faultSummary, activationResult.failEntries);
  const jsonOutput = generateFailLogJson(
    faultSummary,
    stilMetadata,
    activationResult.failEntries,
    activationResult.heatMap
  );

  return {
    logText,
    jsonOutput,
    summary: {
      totalFails: activationResult.stats.failed,
      affectedPatterns: [...new Set(activationResult.failEntries.map(e => e.pattern))],
      targets: params.targets,
      failHeatMapData: activationResult.heatMap
    }
  };
}

/**
 * Runs the injection engine directly from a pre-parsed STILUnified JSON object
 * (stored as project_data in the DB). Skips STIL parsing entirely.
 */
export function runAdvancedInjectionFromProjectData(
  stilMetadata: STILUnified,
  params: {
    targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
    severity: number;
    clusterSize: number;
    intermittentProb?: number;
  }
) {
  if (!stilMetadata.patterns || stilMetadata.patterns.length === 0) {
    throw new IndustrialError("SIMULATION_DATA_MISSING", "Industrial Error: High-fidelity simulation requires the original STIL pattern bitstream which is missing from this chip record.", 422);
  }

  // Expand targets based on clusterSize
  const expandedTargets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }> = [];
  params.targets.forEach(t => {
    if (!t.chainName) return;
    const chainLen = stilMetadata.scanLengthPerChain[t.chainName];
    if (chainLen == null) {
      throw new Error(`Critical Simulation Error: Specified scan chain "${t.chainName}" does not exist in the design.`);
    }
    for (let i = 0; i < params.clusterSize; i++) {
      const bit = t.bitPosition + i;
      if (bit < chainLen) {
        expandedTargets.push({ chainName: t.chainName, bitPosition: bit, faultType: t.faultType });
      }
    }
  });

  const activationResult = runActivationEngine(stilMetadata, { ...params, targets: expandedTargets });
  const faultSummary = buildFaultSummary(stilMetadata, params, activationResult.stats);
  const logText = generateFailLogText(faultSummary, activationResult.failEntries);
  const jsonOutput = generateFailLogJson(faultSummary, stilMetadata, activationResult.failEntries, activationResult.heatMap);

  return {
    logText,
    jsonOutput,
    summary: {
      totalFails: activationResult.stats.failed,
      affectedPatterns: [...new Set(activationResult.failEntries.map(e => e.pattern))],
      targets: params.targets,
      failHeatMapData: activationResult.heatMap
    }
  };
}
