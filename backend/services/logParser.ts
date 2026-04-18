import { ScanChain } from "./stilParser.js";

export interface LogFailure {
  patternId: string;
  testerCycle?: number;
  chainName: string;
  flipFlopPosition: number;
  expected: string;
  actual: string;
}

/**
 * Industrial Log Parser.
 * Resiliently extracts failure events from ATE tester logs.
 */
export function parseLogFile(logText: string, scanChains: ScanChain[]): LogFailure[] {
  const failures: LogFailure[] = [];
  const lines = logText.split('\n');
  const knownChains = new Set(scanChains.map(c => c.name));

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Format 1: Cycle 100 | Pattern PAT_50 | Chain SCAN1 | Bit 25 | Exp 1 | Act 0
    // Format 2: PAT_50 SCAN1 25 1 0
    // Format 3: Chain SCAN1 | ShiftBit 25
    // Format 4: V 1024 SCAN_OUT[4] = 1 Act 0
    
    let match;
    
    // 1. Industrial Full Format (captures Cycle, Pattern, Chain, Bit, Exp, Act)
    if ((match = trimmed.match(/(?:Cycle\s+(\d+).*?)?Pattern\s+([\w-]+).*?Chain\s+([\w-]+).*?Bit\s+(\d+).*?Exp\s+([01]).*?Act\s+([01])/i))) {
      failures.push({
        testerCycle: match[1] ? parseInt(match[1]) : undefined,
        patternId: match[2],
        chainName: match[3],
        flipFlopPosition: parseInt(match[4]),
        expected: match[5],
        actual: match[6]
      });
    } 
    // 2. Tabular Format: PAT_ID CHAIN_NAME BIT_POS EXP_VAL ACT_VAL
    else if ((match = trimmed.match(/^([\w-]+)\s+([\w-]+)\s+(\d+)\s+([01])\s+([01])$/))) {
       if (knownChains.has(match[2])) {
         failures.push({
           patternId: match[1],
           chainName: match[2],
           flipFlopPosition: parseInt(match[3]),
           expected: match[4],
           actual: match[5]
         });
       }
    } 
    // 3. Vector Style: V 1024 CHAIN_NAME[BIT] = EXP Act ACT
    else if ((match = trimmed.match(/V\s+(\d+)\s+([\w-]+)\[(\d+)\]\s*=\s*([01])\s+Act\s+([01])/i))) {
      failures.push({
        testerCycle: parseInt(match[1]),
        patternId: `V_${match[1]}`,
        chainName: match[2],
        flipFlopPosition: parseInt(match[3]),
        expected: match[4],
        actual: match[5]
      });
    }
    // 4. Legacy Minimal Format: Chain SCAN1 | ShiftBit 5
    else if ((match = trimmed.match(/Chain\s+([\w-]+)\s*\|\s*ShiftBit\s*(\d+)/i))) {
      failures.push({
        patternId: "LOG_INFERRED",
        chainName: match[1],
        flipFlopPosition: parseInt(match[2]),
        expected: "1",
        actual: "0"
      });
    }
  });

  return failures;
}
