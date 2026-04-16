import { STILUnified } from "./parser.js";

export interface FailureDetail {
  patternId: string;
  chainName: string;
  flipFlopPosition: number;
  expected: string;
  actual: string;
  mismatchType: string;
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
      const patId = `PAT_${200 + i}`;
      if (!firstFailPattern) firstFailPattern = patId;

      failureDetails.push({
        patternId: patId,
        chainName: f.channel,
        flipFlopPosition: parseInt(f.ff.replace(/\\D/g, '')) || Math.floor(Math.random() * 10),
        expected: '1',
        actual: '0',
        mismatchType: f.faultType
      });
    });

    for (const [name, mismatchCount] of Object.entries(chainsMap)) {
      failedChains.push({ name, mismatchCount });
    }
  } else if (process.env.NODE_ENV !== 'test') {
    // Fallback: Demo UI Simulator
    const rawMismatches = Math.floor(Math.random() * 10);
    mismatches = rawMismatches > 7 ? rawMismatches : (rawMismatches < 3 ? 0 : rawMismatches - 2);

    if (mismatches > 0) {
      if (parsed.scanChains.length > 0) {
        const seed = (parsed.totalFFs + parsed.totalPatterns) % 100;
        const numFailedChains = Math.min(Math.ceil(mismatches / 2), parsed.scanChains.length);
        for (let i = 0; i < numFailedChains; i++) {
          const chainIndex = (seed + i) % parsed.scanChains.length;
          const chainName = parsed.scanChains[chainIndex].name;
          const chainMismatchCount = Math.ceil(mismatches / numFailedChains);

          failedChains.push({
            name: chainName,
            mismatchCount: chainMismatchCount
          });

          for (let j = 0; j < chainMismatchCount; j++) {
            const patternNum = 100 + Math.floor(Math.random() * 50);
            const patternId = `PAT_${patternNum}`;
            if (!firstFailPattern || patternNum < parseInt(firstFailPattern.split('_')[1])) {
              firstFailPattern = patternId;
            }

            const exp = Math.random() > 0.5 ? "1" : "0";
            failureDetails.push({
              patternId,
              chainName,
              flipFlopPosition: Math.floor(Math.random() * (parsed.scanChains[chainIndex].length || 100)),
              expected: exp,
              actual: exp === "1" ? "0" : "1",
              mismatchType: "STUCK_AT_FAULT"
            });
          }
        }
      } else {
        const fallbackChain = "GENERIC_CORE_SCAN_0";
        failedChains.push({ name: fallbackChain, mismatchCount: mismatches });
        for (let i = 0; i < mismatches; i++) {
          const patternId = `PAT_${50 + i * 10}`;
          if (!firstFailPattern) firstFailPattern = patternId;
          failureDetails.push({
            patternId,
            chainName: fallbackChain,
            flipFlopPosition: 10 + i * 100,
            expected: "H",
            actual: "L",
            mismatchType: "MOCK_DIAGNOSTIC"
          });
        }
      }
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
