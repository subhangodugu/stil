import { parseSTIL } from "../backend/services/stilParser.js";
import fs from "fs";
import path from "path";

const sampleFile = "c:/Users/subhan godugu/Downloads/stil-analyzer-pro - Copy/scratch/sample.stil";

async function test() {
  try {
    console.log("Reading sample file...");
    const text = fs.readFileSync(sampleFile, "utf-8");
    
    console.log("Parsing STIL...");
    
    // Debug logical pattern regexes
    const m1 = text.match(/Pattern:(\d+)/);
    const m2 = text.match(/Total\s+Patterns:\s*(\d+)/i);
    const m3 = text.match(/pattern_end\s*=\s*(\d+)/i);
    console.log("Debug Regexes:", { m1, m2, m3 });

    const result = parseSTIL(text);
    
    console.log("\n--- Extraction Results ---");
    console.log(`Scan Chains: ${result.scanChains.length}`);
    console.log(`Signals Found: ${Object.keys(result.signals).length}`);
    console.log(`Physical Patterns: ${result.patternCount}`);
    console.log(`Physical Vectors: ${result.vectorCount}`);
    console.log(`Total FFs: ${result.totalFFs}`);
    console.log(`Logical Patterns: ${result.totalPatterns}`);
    
    if (result.patternCount > 0) {
      console.log("\nSample Pattern Data:");
      console.log(`First Pattern ID: ${result.patterns[0].patternId}`);
      console.log(`Vectors in Pattern 0: ${result.patterns[0].vectors.length}`);
    } else {
      console.warn("\nWARNING: No physical patterns extracted!");
    }

    if (Object.keys(result.signals).length > 0) {
      console.log("\nSample Signals:");
      console.log(Object.keys(result.signals).slice(0, 5).join(", "));
    } else {
      console.warn("\nWARNING: No signals extracted!");
    }

  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
