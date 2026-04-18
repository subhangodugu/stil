import { STILUnified } from "./stilParser.js";

export interface FailureDetail {
  patternId: string;
  chainName: string;
  flipFlopPosition: number;
  expected: string;
  actual: string;
  mismatchType: string;
  faultType: string;
}

export interface ChipTestResult {
  status: "PASS" | "FAIL";
  mismatches: number;
  failedChains: Array<{ name: string; mismatchCount: number }>;
  yieldPercent: number;
  firstFailPattern: string | null;
  failureDetails: FailureDetail[];
}

/**
 * Higher-fidelity Tester Inference Engine.
 * In a real scenario, this would compare ATE logs with STIL expected values.
 * For Phase 2, we simulate detailed pattern-level mismatches.
 */
export function inferChipResult(parsed: STILUnified): ChipTestResult {
  let mismatches = 0;
  const failedChains: Array<{ name: string; mismatchCount: number }> = [];
  const failureDetails: FailureDetail[] = [];
  let firstFailPattern: string | null = null;

  if (parsed.faults && parsed.faults.length > 0) {
    // Deterministic Industrial Computation
    mismatches = parsed.faults.reduce((sum, f) => sum + f.failCount, 0);
    
    const chainsMap: Record<string, number> = {};
    parsed.faults.forEach((f, i) => {
      chainsMap[f.channel] = (chainsMap[f.channel] || 0) + f.failCount;
      
      // Extract position from FF ID (e.g., "FF_42" -> 42)
      const ffPosMatch = f.ff.match(/\d+/);
      const ffPosition = ffPosMatch ? parseInt(ffPosMatch[0]) : 0;

      // Map Fault type to DB-compatible fault_type
      const faultTypeMap: Record<string, string> = {
        'STUCK_AT_0': 'STUCK_AT_0',
        'STUCK_AT_1': 'STUCK_AT_1',
        'CHAIN_BREAK': 'STUCK_AT_0',
        'INTERMITTENT': 'INTERMITTENT',
      };
      const faultType = faultTypeMap[f.faultType] || 'UNKNOWN';
      
      // Determine a realistic Pattern ID using the pattern count or actual patterns
      const patIndex = Math.min(i, parsed.patterns.length - 1);
      const patId = parsed.patterns[patIndex]?.patternId || `PAT_INF_${i.toString().padStart(3, '0')}`;
      if (!firstFailPattern) firstFailPattern = patId;

      failureDetails.push({
        patternId: patId,
        chainName: f.channel,
        flipFlopPosition: ffPosition,
        expected: faultType === 'STUCK_AT_1' ? '0' : '1',
        actual:   faultType === 'STUCK_AT_1' ? '1' : '0',
        mismatchType: f.faultType,
        faultType,
      });
    });

    for (const [name, mismatchCount] of Object.entries(chainsMap)) {
      failedChains.push({ name, mismatchCount });
    }
  }


  const status = mismatches === 0 ? "PASS" : "FAIL";
  const yieldPercent = parseFloat((100 - (mismatches * 0.5)).toFixed(2));

  return {
    status,
    mismatches,
    failedChains,
    yieldPercent,
    firstFailPattern,
    failureDetails
  };
}
