import { parseSTIL } from "./parser";
import { runActivationEngine } from "./activationEngine";
import { buildFaultSummary } from "./faultSummaryBuilder";
import { generateFailLogText, generateFailLogJson } from "./failLogGenerator";

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
