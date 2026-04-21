import { runDeterministicSimulation } from "./deterministicEngine.js";
import { AnalysisResult, ClassifiedFault } from "../types/diagnostic.js";
import { LogFailure } from "./logParser.js";
import { correlateMismatchesToFaults } from "./faultAnalyzer.js";
import { STILUnified, ScanChain } from "./stilParser.js";

export async function runScanSimulation(parsed: STILUnified, logs?: LogFailure[]): Promise<AnalysisResult> {
  let failureDetails: ClassifiedFault[] = [];
  const chains = Object.fromEntries(parsed.scanChains.map((c: ScanChain) => [c.name, 0]));
  let type: AnalysisResult["dataSource"] = logs?.length ? "ATE_LOG" : (parsed.faults?.length ? "INFERRED" : "SIMULATED");

  if (type === "ATE_LOG") {
    failureDetails = logs!.map(f => {
      chains[f.chainName]++;
      return { patternId: f.patternId || "UNKNOWN", chainName: f.chainName, flipFlopPosition: f.flipFlopPosition, expected: f.expected, actual: f.actual, faultType: f.expected === "1" ? "STUCK_AT_0" : "STUCK_AT_1", mismatchType: "ATE_LOG_MISMATCH" };
    });
  } else if (type === "INFERRED") {
    failureDetails = parsed.faults!.map((f: any) => {
      chains[f.channel] += f.failCount;
      const pos = parseInt(f.ff.match(/\d+/)?.[0] || "0");
      const bid = (parsed.chainOffsets[f.channel] || 0) + pos;
      const pat = parsed.patterns.find((p: any) => p.vectors.some((v: any) => v.scan[bid] === (f.faultType === 'STUCK_AT_0' ? '1' : '0')))?.patternId || `INF_${f.channel}_${pos}`;
      return { patternId: pat as any, chainName: f.channel, flipFlopPosition: pos, expected: f.faultType === "STUCK_AT_1" ? "0" : "1", actual: f.faultType === "STUCK_AT_1" ? "1" : "0", faultType: f.faultType as any, mismatchType: "STRUCTURAL_INFERENCE" };
    });
  } else {
    const results = await runDeterministicSimulation(parsed.patterns);
    const map = parsed.scanChains.flatMap((c: ScanChain) => Array.from({ length: c.length }, (_, i) => ({ n: c.name, p: i })));
    results.forEach((r: any, i: number) => {
      if (r.mismatch) {
        const info = map[i % map.length];
        chains[info.n]++;
        failureDetails.push({ patternId: r.patternId, chainName: info.n, flipFlopPosition: info.p, expected: r.expected, actual: r.actual, faultType: "STUCK_AT_SIMULATED", mismatchType: "LOGIC_CONFLICT" });
      }
    });
  }

  const mismatch = failureDetails.length;
  const totalBits = type === "SIMULATED" ? (parsed.patterns.length * parsed.scanChains.reduce((a: number, b: ScanChain) => a + b.length, 0)) : (parsed.vectorCount || (parsed.patterns.length * 100));
  const failingPats = new Set(failureDetails.map(f => f.patternId));
  const faults = correlateMismatchesToFaults(failureDetails);

  return {
    status: failingPats.size ? "FAIL" : "PASS",
    mismatches: mismatch,
    totalBits,
    passedBits: totalBits - mismatch,
    accuracy: totalBits ? parseFloat((((totalBits - mismatch) / totalBits) * 100).toFixed(4)) : 100,
    yieldPercent: parseFloat((((parsed.patterns.length - failingPats.size) / Math.max(1, parsed.patterns.length)) * 100).toFixed(2)),
    firstFailPattern: mismatch ? failureDetails[0].patternId : null,
    failedChains: Object.entries(chains).filter(([_, v]) => v > 0).map(([name, mismatchCount]) => ({ name, mismatchCount })),
    failureDetails,
    faults,
    dataSource: type
  };
}
