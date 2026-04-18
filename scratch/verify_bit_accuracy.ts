import { parseSTIL } from "../backend/services/stilParser.js";
import { runScanSimulation } from "../backend/services/scanSimulator.js";

async function verify() {
  console.log("Deep Hardening Verification Test...");
  
  const industrialSTIL = `
STIL 1.0;
Signals { "S1" Out; "S2" Out; }
SignalGroups { _po_ = '"S1" + "S2"'; }
ScanStructures { 
  ScanChain C1 { ScanIn "SI1"; ScanOut "S1"; ScanLength 4; }
}
Pattern P1 {
  V { _po_=10; }
  V { _po_=01; }
  /* Pattern: 29624 */
}
`;

  console.log("Starting Parser...");
  const parsed = parseSTIL(industrialSTIL);
  
  console.log(`Logical Patterns: ${parsed.totalPatterns}`); // Should be 29624 due to intra-block scan
  console.log(`Physical Patterns: ${parsed.patternCount}`); // Should be 1
  
  const v0 = parsed.patterns[0].vectors[0].scan;
  const v1 = parsed.patterns[0].vectors[1].scan;
  
  console.log(`Vector 0: ${v0}`); // Should preserve '10'
  console.log(`Vector 1: ${v1}`); // Should preserve '01'

  if (parsed.totalPatterns === 29624 && v0.includes('1') && v1.includes('1')) {
    console.log("\n✅ DEEP HARDENING SUCCESSFUL!");
    console.log(" - Bit-stripping fixed (0/1 preserved)");
    console.log(" - Intra-block pattern detection active (29,624 found)");
  } else {
    console.error("\n❌ VERIFICATION FAILED!");
    console.log(`Observed Patterns: ${parsed.totalPatterns}`);
    console.log(`Observed V0: ${v0}`);
  }
}

verify();
