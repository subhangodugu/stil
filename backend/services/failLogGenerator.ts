import { FaultSummary } from "./faultSummaryBuilder.js";
import { FailEntry } from "./activationEngine.js";
import { STILUnified } from "./stilParser.js";

const FaultDisplayMap: Record<string, string> = {
  'SA0': 'Stuck-at-L (Low)',
  'SA1': 'Stuck-at-H (High)',
  'STUCK_AT_0': 'Stuck-at-L (Low)',
  'STUCK_AT_1': 'Stuck-at-H (High)'
};

export function generateFailLogText(
  summary: FaultSummary,
  entries: FailEntry[]
): string {
  let log = `========================================================
SYNTHETIC TESTER FAIL LOG
Generated From STIL Fault Injection Engine
========================================================

FAULT SUMMARY
--------------------------------------------------------
Fault ID            : ${summary.faultId}
Fault Type          : ${FaultDisplayMap[summary.faultType] || summary.faultType}
Affected Chain      : ${summary.affectedChain}
Affected Shift Bit  : ${summary.affectedShiftBit}
Total Patterns      : ${summary.totalPatterns}
Patterns Activated  : ${summary.patternsActivated}
Patterns Failed     : ${summary.patternsFailed}
Activation Rate     : ${summary.activationRate}%
Fail Rate           : ${summary.failRate}%
Compression Type    : ${summary.compressionType}
EDT Channel         : ${summary.edtChannel}
Scan Clock          : ${summary.scanClock}
Timing Set          : ${summary.timingSet}
Generated Time      : ${summary.generatedTime}
${summary.warning ? `\nWARNING: ${summary.warning}\n` : ""}
${summary.debugReport ? `
DEBUG PARSER REPORT
--------------------------------------------------------
Pattern Bursts Found : ${summary.debugReport.patternBurstsFound}
Procedures Found     : ${summary.debugReport.proceduresFound}
Expanded Patterns    : ${summary.debugReport.expandedPatterns}
Scan Vectors Found   : ${summary.debugReport.scanVectorsExtracted}
` : ""}

FAIL DETAILS
------------------------------------------------------------------------------------------------
Pattern   EDT_Ch   Scan_Chain   ShiftBit   Fault     Expected   Actual   Cycle   Result
------------------------------------------------------------------------------------------------
`;

  entries.forEach(e => {
    const pattern = (e.pattern ?? 0).toString().padEnd(10);
    const edtCh = (e.edtCh ?? 'N/A').padEnd(9);
    const scanChain = (e.scanChain ?? 'N/A').padEnd(13);
    const shiftBit = (e.shiftBit ?? 0).toString().padEnd(11);
    const fault = (e.faultType ?? 'SA0').padEnd(8);
    const expected = (e.expected ?? 0).toString().padEnd(11);
    const actual = (e.actual ?? 0).toString().padEnd(9);
    const cycle = (e.cycle ?? 0).toString().padEnd(8);
    const result = e.result ?? 'FAIL';
    
    log += `${pattern}${edtCh}${scanChain}${shiftBit}${fault}${expected}${actual}${cycle}${result}\n`;
  });

  return log;
}

export interface GeneratedFailLogJson {
  faultSummary: FaultSummary;
  stilSummary: STILUnified;
  failEntries: FailEntry[];
  heatMap: Record<string, number>;
}

export function generateFailLogJson(
  summary: FaultSummary,
  stilSummary: STILUnified,
  failEntries: FailEntry[],
  heatMap: Record<string, number>
): GeneratedFailLogJson {
  return {
    faultSummary: summary,
    stilSummary,
    failEntries,
    heatMap,
  };
}
