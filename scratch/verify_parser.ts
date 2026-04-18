import { parseSTIL } from "../backend/services/stilParser.js";
import fs from "fs";

const sampleStil = `
STIL 1.0;
Signals {
    SI In;
    SO Out;
}
ScanStructures {
    ScanChain "chain1" {
        ScanLength 4;
        ScanIn SI;
        ScanOut SO;
    }
}
PatternBurst "main" {
    PatList { P1 }
}
Pattern "P1" {
    W "default";
    Vector {
        SI = 1111;
        SO = 1X1X;
    }
}
`;

async function testParser() {
    console.log("--- Testing Parser Fidelity ---");
    const parsed = parseSTIL(sampleStil);
    
    console.log("Scan Chains:", JSON.stringify(parsed.scanChains));
    console.log("Expected Values (Patterns[0].Vectors[0].scan):", parsed.patterns[0].vectors[0].scan);
    
    // Check if 'X' is preserved
    const expected = "1X1X";
    const actual = parsed.patterns[0].vectors[0].scan;
    
    if (actual === expected) {
        console.log("✅ SUCCESS: 'X' states preserved and pin-aware extraction worked.");
    } else {
        console.log(`❌ FAILURE: Expected '${expected}', got '${actual}'`);
    }

    // Test 'Vector' keyword support
    if (sampleStil.includes("Vector") && parsed.patterns.length > 0) {
        console.log("✅ SUCCESS: 'Vector' keyword correctly parsed.");
    }
}

testParser().catch(console.error);
