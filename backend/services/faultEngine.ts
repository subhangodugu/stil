/**
 * Fault Engine (v1.0 - Industrial)
 *
 * Pure fault simulation: applies stuck-at/intermittent faults to PatternVectors
 * and returns bit-level mismatch records.
 *
 * Separation of concerns:
 *   stilParser   → extracts PatternVector[] from STIL
 *   faultEngine  → applies faults, returns mismatches + accuracy (THIS FILE)
 *   scanSimulator → orchestrates the full no-log simulation using parsed data
 *   pipelineService → wires everything together
 */

import { PatternVector } from "./stilParser.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FaultSpec {
  chainName: string;
  bitPosition: number;
  type: "SA0" | "SA1" | "INTERMITTENT";
  /** 0.0–1.0 probability — only used for INTERMITTENT */
  probability?: number;
}

export interface BitMismatch {
  patternId:       string;
  chain:           string;
  bitPosition:     number;
  expected:        string;
  actual:          string;
  faultType:       "STUCK_AT_0" | "STUCK_AT_1" | "INTERMITTENT" | "NONE";
  mismatchType:    string;
}

export interface FaultEngineResult {
  mismatches:   BitMismatch[];
  totalBits:    number;
  failedBits:   number;
  passedBits:   number;
  accuracy:     number;           // 0–100
  failedChains: Array<{ name: string; mismatchCount: number }>;
  firstFailPattern: string | null;
  status: "PASS" | "FAIL";
}

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Apply a single stuck-at fault to one bit string and return the faulty output.
 * Deterministic (v2.0): All randomness removed.
 */
export function simulateScan(
  shiftIn: string,
  fault?: FaultSpec
): string {
  if (!fault) return shiftIn;

  const arr = shiftIn.split("");
  if (fault.bitPosition >= 0 && fault.bitPosition < arr.length) {
    // Deterministic simulation: apply the fault value to the target bit
    if (fault.type === "SA0") {
      arr[fault.bitPosition] = "0";
    } else if (fault.type === "SA1") {
      arr[fault.bitPosition] = "1";
    } else if (fault.type === "INTERMITTENT") {
      // For deterministic intermittent simulation, we toggle the bit
      arr[fault.bitPosition] = arr[fault.bitPosition] === "1" ? "0" : "1";
    }
  }
  return arr.join("");
}

/**
 * Compute bit-level accuracy from totals.
 */
export function computeAccuracy(totalBits: number, failedBits: number): number {
  if (totalBits === 0) return 100.0;
  return parseFloat((((totalBits - failedBits) / totalBits) * 100).toFixed(4));
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

/**
 * Run full fault simulation across all PatternVectors.
 *
 * Faults are matched to vectors by chainName.
 * If no faults are provided, runs a clean comparison (expected vs expected)
 * which will produce zero mismatches unless the STIL itself encodes failures.
 */
export function runFaultSimulation(
  vectors: PatternVector[],
  faults: FaultSpec[] = []
): FaultEngineResult {
  const mismatches: BitMismatch[] = [];
  const chainsMap: Record<string, number> = {};
  let totalBits = 0;
  let firstFailPattern: string | null = null;

  // Build per-chain fault lookup for O(1) access
  const faultByChain = new Map<string, FaultSpec>();
  faults.forEach(f => {
    if (!faultByChain.has(f.chainName)) {
      faultByChain.set(f.chainName, f);
    }
  });

  for (const vec of vectors) {
    const { chain, shiftIn, expectedOut, patternIndex } = vec;
    totalBits += expectedOut.length;

    const fault = faultByChain.get(chain);
    const actualOut = simulateScan(shiftIn, fault);

    for (let i = 0; i < expectedOut.length; i++) {
      const exp = expectedOut[i] ?? "0";
      const act = actualOut[i] ?? "0";

      if (exp !== act) {
        const patternId = `PAT_${patternIndex}`;
        if (!firstFailPattern) firstFailPattern = patternId;

        chainsMap[chain] = (chainsMap[chain] || 0) + 1;

        let faultType: BitMismatch["faultType"] = "NONE";
        if (fault?.type === "SA0" || (exp === "1" && act === "0")) faultType = "STUCK_AT_0";
        else if (fault?.type === "SA1" || (exp === "0" && act === "1")) faultType = "STUCK_AT_1";
        else if (fault?.type === "INTERMITTENT") faultType = "INTERMITTENT";

        mismatches.push({
          patternId,
          chain,
          bitPosition: i,
          expected: exp,
          actual: act,
          faultType,
          mismatchType: "LOGIC_MISMATCH",
        });
      }
    }
  }

  const failedBits = mismatches.length;
  const passedBits = totalBits - failedBits;
  const accuracy = computeAccuracy(totalBits, failedBits);

  const failedChains = Object.entries(chainsMap).map(([name, mismatchCount]) => ({
    name,
    mismatchCount,
  }));

  return {
    mismatches,
    totalBits,
    failedBits,
    passedBits,
    accuracy,
    failedChains,
    firstFailPattern,
    status: failedBits > 0 ? "FAIL" : "PASS",
  };
}
