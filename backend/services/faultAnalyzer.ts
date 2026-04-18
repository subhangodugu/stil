import { STILUnified } from "./stilParser.js";
import { LogFailure } from "./logParser.js";

export interface ClassifiedFault {
  patternId: string;
  chainName: string;
  flipFlopPosition: number;
  expected: string;
  actual: string;
  faultType: "STUCK_AT_0" | "STUCK_AT_1" | "INTERMITTENT" | "UNKNOWN";
  mismatchType: string;
}

export interface AnalysisResult {
  status: "PASS" | "FAIL";
  mismatches: number;
  failedChains: Array<{ name: string; mismatchCount: number }>;
  yieldPercent: number;
  firstFailPattern: string | null;
  failureDetails: ClassifiedFault[];
}

/**
 * Industrial deterministic Fault Analyzer.
 * Replaces legacyInference.ts with strict logic-based classification.
 */
export function analyzeFaults(parsedSTIL: STILUnified, logs: LogFailure[]): AnalysisResult {
  const failureDetails: ClassifiedFault[] = [];
  const chainsMap: Record<string, number> = {};
  let firstFailPattern: string | null = null;

  // 1. Logic-based classification (Deterministic ATGP Model)
  if (Array.isArray(logs)) {
    logs.forEach((fail, index) => {
      const exp = fail.expected;
      const act = fail.actual;
      
      let faultType: ClassifiedFault["faultType"] = "UNKNOWN";
      if (exp === "1" && act === "0") faultType = "STUCK_AT_0";
      else if (exp === "0" && act === "1") faultType = "STUCK_AT_1";
      else faultType = "INTERMITTENT";

      const patternId = fail.patternId || `PAT_${100 + index}`;
      if (!firstFailPattern) firstFailPattern = patternId;

      chainsMap[fail.chainName] = (chainsMap[fail.chainName] || 0) + 1;

      failureDetails.push({
        patternId,
        chainName: fail.chainName,
        flipFlopPosition: fail.flipFlopPosition || 0,
        expected: exp,
        actual: act,
        faultType,
        mismatchType: "LOGIC_MISMATCH"
      });
    });
  }

  const mismatches = failureDetails.length;
  const status = mismatches === 0 ? "PASS" : "FAIL";
  const yieldPercent = parseFloat((100 - (mismatches * 0.5)).toFixed(2));

  const failedChains = Object.entries(chainsMap).map(([name, mismatchCount]) => ({
    name,
    mismatchCount
  }));

  return {
    status,
    mismatches,
    failedChains,
    yieldPercent,
    firstFailPattern,
    failureDetails
  };
}
