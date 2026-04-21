import { STILUnified } from "./stilParser.js";
import { LogFailure } from "./logParser.js";
import { AnalysisResult, ClassifiedFault, Fault } from "../types/diagnostic.js";

/**
 * Advanced Defect Correlation: Converts raw mismatches into physical fault candidates.
 */
export function correlateMismatchesToFaults(failureDetails: ClassifiedFault[]): Fault[] {
  const candidates = new Map<string, { count: number; types: Set<string>; details: ClassifiedFault }>;
  
  failureDetails.forEach(f => {
    const key = `${f.chainName}@${f.flipFlopPosition}`;
    const existing = candidates.get(key) || { count: 0, types: new Set(), details: f };
    existing.count += 1;
    existing.types.add(f.faultType || "UNKNOWN");
    candidates.set(key, existing);
  });

  return Array.from(candidates.entries()).map(([key, data]) => {
    const [channel, pos] = key.split('@');
    // High failure rate (> 0) at a specific bit pos usually indicates a defect
    return {
      channel,
      ff: `FF_${pos}`,
      type: 'ROOT_FAULT',
      faultType: data.types.has('STUCK_AT_0') ? 'STUCK_AT_0' : (data.types.has('STUCK_AT_1') ? 'STUCK_AT_1' : 'INTERMITTENT'),
      confidence: Math.min(90 + data.count, 99), // Confidence scales with failure observations
      failCount: data.count,
      severity: data.count > 10 ? 'CRITICAL' : 'MAJOR',
      description: `Localized silicon defect detected via pattern correlation at chain position ${pos}.`
    } as Fault;
  });
}

export function analyzeFaults(parsed: STILUnified, logs: LogFailure[]): AnalysisResult {
  const chains: Record<string, number> = {};
  const failureDetails: ClassifiedFault[] = (logs || []).map((f, i) => {
    chains[f.chainName] = (chains[f.chainName] || 0) + 1;
    return {
      patternId: f.patternId || `PAT_${100 + i}`, chainName: f.chainName, flipFlopPosition: f.flipFlopPosition || 0,
      expected: f.expected, actual: f.actual, mismatchType: "ATE_LOG_MISMATCH",
      faultType: f.expected === "1" ? "STUCK_AT_0" : (f.expected === "0" ? "STUCK_AT_1" : "INTERMITTENT")
    };
  });

  // THE KEY ADDITION: Correlate mismatches into localized faults
  const faults = correlateMismatchesToFaults(failureDetails);

  const m = failureDetails.length;
  const bits = parsed.vectorCount || 0;
  return {
    status: m ? "FAIL" : "PASS", mismatches: m,
    failedChains: Object.entries(chains).map(([name, mismatchCount]) => ({ name, mismatchCount })),
    yieldPercent: parseFloat((100 - (m * 0.5)).toFixed(2)),
    firstFailPattern: m ? failureDetails[0].patternId : null,
    failureDetails, 
    faults, // Surfacing the localized faults
    dataSource: logs?.length ? "ATE_LOG" : "SIMULATED",
    accuracy: m ? parseFloat((((bits - m) / Math.max(1, bits)) * 100).toFixed(4)) : 100,
    totalBits: bits, passedBits: bits - m
  };
}
