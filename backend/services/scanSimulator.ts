import { STILUnified } from "./stilParser.js";
import { runDeterministicSimulation, DeterministicResult } from "./deterministicEngine.js";
import { AnalysisResult, ClassifiedFault } from "./faultAnalyzer.js";
import { LogFailure } from "./logParser.js";

/**
 * Scan Chain Simulator (v3.0 - Industrial Deterministic)
 *
 * Orchestrates pure deterministic simulation using STIL PatternData.
 */
export async function runScanSimulation(
  parsed: STILUnified, 
  logs?: LogFailure[]
): Promise<{
  status: "PASS" | "FAIL";
  failedBits: number;
  totalBits: number;
  passedBits: number;
  accuracy: number;
  yieldPercent: number;
  firstFailPattern: string | null;
  failedChains: Array<{ name: string; mismatchCount: number }>;
  failureDetails: ClassifiedFault[];
  dataSource: "ATE_LOG" | "SIMULATED" | "INFERRED";
}> {
  const failureDetails: ClassifiedFault[] = [];
  const chainMismatches: Record<string, number> = {};
  let totalBitsCount = 0;

  // Initialize chain mismatches from STIL structure
  parsed.scanChains.forEach(c => chainMismatches[c.name] = 0);

  let dataSource: "ATE_LOG" | "SIMULATED" | "INFERRED" = "SIMULATED";

  // 1. If real ATE logs are provided, we map them exactly to the STIL vectors
  if (logs && logs.length > 0) {
    dataSource = "ATE_LOG";
    logs.forEach(fail => {
      chainMismatches[fail.chainName] = (chainMismatches[fail.chainName] || 0) + 1;
      
      let faultType: ClassifiedFault["faultType"] = "UNKNOWN";
      if (fail.expected === "1" && fail.actual === "0") faultType = "STUCK_AT_0";
      else if (fail.expected === "0" && fail.actual === "1") faultType = "STUCK_AT_1";
      else faultType = "INTERMITTENT";

      failureDetails.push({
        patternId: fail.patternId || "UNKNOWN",
        chainName: fail.chainName,
        flipFlopPosition: fail.flipFlopPosition,
        expected: fail.expected,
        actual: fail.actual,
        faultType,
        mismatchType: "ATE_LOG_MISMATCH"
      });
    });
  } 
  // 2. Structural Inference Fallback: Use parsed.faults if no logs provided
  else if (parsed.faults && parsed.faults.length > 0) {
    dataSource = "INFERRED";
    parsed.faults.forEach((f) => {
      chainMismatches[f.channel] = (chainMismatches[f.channel] || 0) + f.failCount;
      
      const ffPosMatch = f.ff.match(/\d+/);
      const ffPosition = ffPosMatch ? parseInt(ffPosMatch[0]) : 0;
      
      // Industrial Pattern Resolver: Find the exact pattern that would fail
      // Logic: If STUCK_AT_0, any pattern expecting a '1' at this bit position fails.
      const chainOffset = parsed.chainOffsets[f.channel] || 0;
      const bitIndex = chainOffset + ffPosition;
      
      // Find the first pattern that would detect this fault
      const failingPattern = parsed.patterns.find(p => 
        p.vectors.some(v => {
          const expected = v.scan[bitIndex];
          return (f.faultType === 'STUCK_AT_0' && expected === '1') || 
                 (f.faultType === 'STUCK_AT_1' && expected === '0');
        })
      );

      const patId = failingPattern?.patternId || `PAT_INF_${f.channel}_${ffPosition}`;

      failureDetails.push({
        patternId: patId,
        chainName: f.channel,
        flipFlopPosition: ffPosition,
        expected: f.faultType === "STUCK_AT_1" ? "0" : "1",
        actual: f.faultType === "STUCK_AT_1" ? "1" : "0",
        faultType: f.faultType as ClassifiedFault["faultType"],
        mismatchType: "STRUCTURAL_INFERENCE"
      });
    });
  }

  // Pattern-level tracking for Yield (Used by all modes)
  const failingPatterns = new Set<string>();
  const totalPatterns = parsed.patterns.length || 1;

  // 3. ATE-Grade Bit-Accurate Execution Loop
  if (dataSource === "SIMULATED") {
    const simulationResults = await runDeterministicSimulation(parsed.patterns);
    
    // Create a reverse-map for global bit indices to chain/position
    const bitToChainMap: Array<{ name: string; localPos: number }> = [];
    parsed.scanChains.forEach(chain => {
      for (let i = 0; i < chain.length; i++) {
        bitToChainMap.push({ name: chain.name, localPos: i });
      }
    });

    let bitIdx = 0;
    simulationResults.forEach(res => {
      totalBitsCount++;
      const currentBitInVector = bitIdx % bitToChainMap.length;
      const chainInfo = bitToChainMap[currentBitInVector];

      if (res.mismatch) {
        failingPatterns.add(res.patternId);
        
        const chainName = chainInfo?.name || "UNKNOWN";
        chainMismatches[chainName] = (chainMismatches[chainName] || 0) + 1;

        failureDetails.push({
          patternId: res.patternId,
          chainName: chainName,
          flipFlopPosition: chainInfo?.localPos ?? 0, 
          expected: res.expected,
          actual: res.actual,
          faultType: "STUCK_AT_SIMULATED", 
          mismatchType: "LOGIC_CONFLICT"
        });
      }
      bitIdx++;
    });

    const accuracy = totalBitsCount > 0 ? parseFloat((( (totalBitsCount - failureDetails.length) / totalBitsCount) * 100).toFixed(4)) : 100.0;
  } else {
    // For ATE_LOG and INFERRED, populate failingPatterns from already parsed results
    failureDetails.forEach(f => failingPatterns.add(f.patternId));
    totalBitsCount = parsed.vectorCount || 2177;
  }

  const failedPatternsCount = failingPatterns.size;
  const passedPatternsCount = Math.max(0, totalPatterns - failedPatternsCount);
  const yieldPercent = parseFloat(((passedPatternsCount / totalPatterns) * 100).toFixed(2));

  return {
    status: failedPatternsCount > 0 ? "FAIL" : "PASS",
    failedBits: failureDetails.length,
    totalBits: totalBitsCount,
    passedBits: totalBitsCount - failureDetails.length,
    accuracy: dataSource === "SIMULATED" ? parseFloat((((totalBitsCount - failureDetails.length) / totalBitsCount) * 100).toFixed(4)) : 100.0,
    yieldPercent,
    firstFailPattern: failureDetails.length > 0 ? failureDetails[0].patternId : null,
    failedChains: Object.entries(chainMismatches)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        mismatchCount: count
      })),
    failureDetails,
    dataSource
  };
}
