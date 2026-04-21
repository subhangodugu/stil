import { parseSTIL } from "../backend/services/stilParser.js";

const sampleStil = `
STIL 1.0;
Signals {
  "SI" In;
  "SO" Out;
  "CLK" In;
}
ScanStructures {
  ScanChain "chain1" {
    ScanLength 10;
    ScanIn "SI";
    ScanOut "SO";
  }
}
PatternBurst "main" {
  PatList { "p1"; }
}
Pattern "p1" {
  V { "SO" = 10\r 5 0 1; }
}
`;

function test() {
    console.log("🚀 Testing STIL Repeat Parsing...");
    const result = parseSTIL(sampleStil);
    
    // Expected expansion:
    // "1" (1st bit)
    // "0" (2nd bit)
    // "0" repeated 5 times
    // "1" (last bit)
    // Total bits = 1+1+5+1 = 8. Wait, the ScanLength is 10. 
    // In my mock, I have "1", "0", then 5 zeros, then "1". That's 8 bits.
    // Let's see what the parser does.
    
    console.log("Project Data:", JSON.stringify({
        totalFFs: result.totalFFs,
        vectorCount: result.vectorCount,
        patterns: result.patterns.map(p => ({
            id: p.patternId,
            scan: p.vectors[0]?.scan
        }))
    }, null, 2));

    const scanBits = result.patterns[0].vectors[0].scan;
    const expected = "10000001"; 
    
    if (scanBits === expected) {
        console.log("✅ SUCCESS: Repeat expanded correctly to " + expected);
    } else {
        console.log("❌ FAILURE: Expected " + expected + " but got " + scanBits);
    }
}

test();
