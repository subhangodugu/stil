import { ScanChain } from "./stilParser.js";

export interface LogFailure {
  patternId: string;
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
    
    let match;
    
    // Industrial Format Matcher
    if ((match = trimmed.match(/Pattern\s+([\w-]+).*?Chain\s+([\w-]+).*?Bit\s+(\d+).*?Exp\s+([01]).*?Act\s+([01])/i))) {
      failures.push({
        patternId: match[1],
        chainName: match[2],
        flipFlopPosition: parseInt(match[3]),
        expected: match[4],
        actual: match[5]
      });
    } else if ((match = trimmed.match(/([\w-]+)\s+([\w-]+)\s+(\d+)\s+([01])\s+([01])/))) {
       // Simple tabular format
       if (knownChains.has(match[2])) {
         failures.push({
           patternId: match[1],
           chainName: match[2],
           flipFlopPosition: parseInt(match[3]),
           expected: match[4],
           actual: match[5]
         });
       }
    } else if ((match = trimmed.match(/Chain\s+([\w-]+)\s*\|\s*ShiftBit\s*(\d+)/))) {
      // Legacy basic format (Fallback to default parity)
      failures.push({
        patternId: "PAT_UNKNOWN",
        chainName: match[1],
        flipFlopPosition: parseInt(match[2]),
        expected: "1",
        actual: "0"
      });
    }
  });

  return failures;
}
