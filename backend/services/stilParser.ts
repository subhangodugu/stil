export interface ScanChain {
  name: string;
  length: number;
  scanIn: string;
  scanOut: string;
  ffs: Array<{
    id: string;
    localIndex: number;
    globalIndex: number;
  }>;
}

export interface Fault {
  channel: string;
  ff: string;
  type: 'ROOT_FAULT' | 'PROPAGATION' | 'SECONDARY';
  faultType: 'STUCK_AT_0' | 'STUCK_AT_1' | 'CHAIN_BREAK' | 'INTERMITTENT';
  confidence: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  failCount: number;
  description?: string;
}

export interface HeatmapData {
  ffHeatmap: Record<string, { heatScore: number; color: string; faultType: string; failCount: number }>;
  channelHeatmap: Record<string, { heatScore: number; color: string }>;
}

export interface STILUnified {
  // Common Data
  scanChains: ScanChain[];
  hasEDT: boolean;
  totalFFs: number;
  totalPatterns: number;
  signals: Record<string, string>;
  faults: Fault[];
  localizationMessage?: string;
  heatmap?: HeatmapData;

  // Metadata for Injection/Simulation
  version: string;
  patternBurst: string;
  testType: string;
  scanChainNames: string[];
  scanLengthPerChain: Record<string, number>;
  edtChannels: string[];
  expectedValues: string[][];
  chainOffsets: Record<string, number>;
  internalChainMapping: Record<string, string>;
  compressionType: string;
  scanClock: string;
  shiftClock: string;
  captureClock: string;
  timingSetName: string;
  warning?: string;
  scanChainCount: number;
  debugReport: {
    patternBurstsFound: number;
    proceduresFound: number;
    expandedPatterns: number;
    scanVectorsExtracted: number;
  };
}

/**
 * Industrial-Grade Lexical Helper: Balanced Brace Scanner
 */
function extractBalancedBlock(text: string, startIndex: number): string {
  let braceCount = 0;
  let block = "";
  let started = false;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let inLineComment = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    if (inLineComment) {
      if (char === '\\n' || char === '\\r') {
        inLineComment = false;
      }
      if (started) block += char;
      continue;
    }

    if (char === '"' && text[i-1] !== '\\\\' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && text[i-1] !== '\\\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (!inDoubleQuote && !inSingleQuote && char === '/' && text[i+1] === '/') {
      inLineComment = true;
    }

    if (!inDoubleQuote && !inSingleQuote && !inLineComment) {
      if (char === "{") {
        braceCount++;
        started = true;
      }
      if (char === "}") {
        braceCount--;
      }
    }

    if (started) {
      block += char;
      if (braceCount === 0 && !inDoubleQuote && !inSingleQuote && !inLineComment) break;
    }
  }

  // Return content without outer braces
  return block.length > 2 ? block.slice(1, -1).trim() : "";
}

/**
 * Extracts a block (e.g., Pattern, Procedures) by name using the balanced scanner
 */
function extractNamedBlock(text: string, keyword: string, name?: string): string | null {
  const regexString = name 
    ? `${keyword}\\s+["']?${name}["']?\\s*\\{`
    : `${keyword}\\s*\\{`;
  const regex = new RegExp(regexString, 'i');
  const match = regex.exec(text);

  if (!match) return null;

  const braceStart = text.indexOf("{", match.index);
  return extractBalancedBlock(text, braceStart);
}

export function parseSTIL(stilText: string, failLogText?: string): STILUnified {
  // 1. Foundation
  const signals: Record<string, string> = {};
  const debugReport = {
    patternBurstsFound: 0,
    proceduresFound: 0,
    expandedPatterns: 0,
    scanVectorsExtracted: 0
  };
  const signalRegex = /Signal\s+(\w+)\s+\{\s+Type\s+(\w+);/g;
  let sMatch;
  while ((sMatch = signalRegex.exec(stilText)) !== null) {
    signals[sMatch[1]] = sMatch[2];
  }

  // 2. Scan Structures (Lexical)
  const scanChains: ScanChain[] = [];
  const scanLengthPerChain: Record<string, number> = {};
  const chainOffsets: Record<string, number> = {};
  const internalChainMapping: Record<string, string> = {};
  let globalFFIndex = 0;

  const structuresContent = extractNamedBlock(stilText, "ScanStructures") || stilText;
  const chainBlockRegex = /ScanChain\s+["']?(\w+)["']?\s*\{/g;
  let cMatch;

  while ((cMatch = chainBlockRegex.exec(structuresContent)) !== null) {
    const chainName = cMatch[1];
    const braceStart = structuresContent.indexOf("{", cMatch.index);
    const content = extractBalancedBlock(structuresContent, braceStart);

    const lengthMatch = content.match(/ScanLength\s+(\d+)/);
    const length = lengthMatch ? parseInt(lengthMatch[1]) : 0;
    
    // Strict Validation
    if (length === 0 && content.includes("ScanLength")) {
       throw new Error(`Invalid ScanLength in chain: ${chainName}`);
    }

    const scanInMatch = content.match(/ScanIn\s+["']?(\w+)["']?/);
    const scanOutMatch = content.match(/ScanOut\s+["']?(\w+)["']?/);

    const ffs = Array.from({ length }, (_, i) => ({
      id: `FF_${globalFFIndex + i}`,
      localIndex: i,
      globalIndex: globalFFIndex + i,
    }));

    scanChains.push({ 
      name: chainName, 
      length, 
      scanIn: scanInMatch ? scanInMatch[1] : 'Unknown', 
      scanOut: scanOutMatch ? scanOutMatch[1] : 'Unknown', 
      ffs 
    });
    
    scanLengthPerChain[chainName] = length;
    chainOffsets[chainName] = globalFFIndex;
    
    if (chainName.toLowerCase().includes("channel") || chainName.toLowerCase().includes("edt")) {
      internalChainMapping[chainName] = `EDT_${chainName.replace(/\D/g, "")}`;
    }
    
    globalFFIndex += length;
  }

  // 3. Procedures & Patterns (Procedural Expansion)
  const procedures: Record<string, string> = {};
  const procBlock = extractNamedBlock(stilText, "Procedures");
  if (procBlock) {
    debugReport.proceduresFound++;
    const procRegex = /(\w+)\s*\{/g;
    let pMatch;
    while ((pMatch = procRegex.exec(procBlock)) !== null) {
      const name = pMatch[1];
      const bStart = procBlock.indexOf("{", pMatch.index);
      procedures[name] = extractBalancedBlock(procBlock, bStart);
    }
  }

  const expectedValues: string[][] = [];
  const burstMatch = stilText.match(/PatternBurst\s+["']?(\w+)["']?/);
  const activeBurst = burstMatch ? burstMatch[1] : null;

  if (activeBurst) {
    debugReport.patternBurstsFound++;
    const burstContent = extractNamedBlock(stilText, "PatternBurst", activeBurst) || "";
    const patRefRegex = /Pattern\s+["']?(\w+)["']?;/g;
    let prMatch;
    while ((prMatch = patRefRegex.exec(burstContent)) !== null) {
      const patContent = extractNamedBlock(stilText, "Pattern", prMatch[1]);
      if (patContent) expandContent(patContent, procedures, expectedValues);
    }
  }

  // Fallback: Direct Pattern parsing if burst expansion failed
  if (expectedValues.length === 0) {
    const patBlockRegex = /Pattern\s+["']?(\w+)["']?\s*\{/g;
    let pbMatch;
    while ((pbMatch = patBlockRegex.exec(stilText)) !== null) {
      const braceS = stilText.indexOf("{", pbMatch.index);
      const patCont = extractBalancedBlock(stilText, braceS);
      expandContent(patCont, procedures, expectedValues);
    }
  }

  // 4. Pattern Count - Resilient Validation
  let totalPatterns = expectedValues.length;
  if (totalPatterns === 0) {
    const annMatch = stilText.match(/Ann\s+\{\*\s+Total\s+Patterns:\s*(\d+)\s*\*}/i);
    if (annMatch) {
      totalPatterns = parseInt(annMatch[1]);
    } else {
      const vMatch = stilText.match(/V\s*\{/g);
      totalPatterns = vMatch ? vMatch.length : 0;
    }
  }

  // 5. Build Final Unified Model
  const hasEDT = stilText.toLowerCase().includes("edt") || 
                 stilText.toLowerCase().includes("compression") ||
                 stilText.toLowerCase().includes("decompressor");

  const faults: Fault[] = [];
  let localizationMessage = "";

  if (failLogText) {
    const failures = parseFailLog(failLogText, scanChains);
    scanChains.forEach(chain => {
      const chainFailures = chain.ffs.filter(ff => failures[ff.id]).sort((a,b) => a.localIndex - b.localIndex);
      if (chainFailures.length > 0) {
        const firstFail = chainFailures[0];
        const downstreamThreshold = (chain.length - firstFail.localIndex) * 0.7;
        const isChainBreak = chainFailures.length > downstreamThreshold;

        faults.push({
          channel: chain.name,
          ff: firstFail.id,
          type: 'ROOT_FAULT',
          faultType: isChainBreak ? 'CHAIN_BREAK' : (failures[firstFail.id] > 5 ? 'STUCK_AT_0' : 'INTERMITTENT'),
          confidence: 90,
          severity: isChainBreak ? 'CRITICAL' : 'MAJOR',
          failCount: failures[firstFail.id],
          description: isChainBreak ? `Chain break at ${firstFail.id}.` : `Localized fault at ${firstFail.id}.`
        });
      }
    });
  } else {
    localizationMessage = "No direct fault localization possible. Upload ATE log for diagnosis.";
  }

  return {
    scanChains,
    hasEDT,
    totalFFs: globalFFIndex,
    totalPatterns,
    signals,
    faults,
    localizationMessage,
    version: (stilText.match(/STIL\s+(\d+\.\d+);/) || [])[1] || "1.0",
    patternBurst: activeBurst || "Unknown",
    testType: (stilText.match(/Ann\s+\{\*\s+Test\s+Type:\s*(\w+)\s*\*}/i) || [])[1] || "FullScan",
    scanChainNames: scanChains.map(c => c.name),
    scanLengthPerChain,
    edtChannels: scanChains.map(c => c.name).filter(n => n.toLowerCase().includes("edt") || n.toLowerCase().includes("channel")),
    expectedValues,
    chainOffsets,
    internalChainMapping,
    compressionType: hasEDT ? "EDT (Embedded Deterministic Test)" : "None",
    scanClock: (stilText.match(/Signal\s+["']?(\w*clk\w*)["']?\s+\{.*?Type\s+In;/is) || [])[1] || "SCAN_CLK",
    shiftClock: "SCAN_CLK",
    captureClock: "SCAN_CLK",
    timingSetName: (stilText.match(/Timing\s+["']?(\w+)["']?\s+\{/) || [])[1] || "Default_Timing",
    scanChainCount: scanChains.length,
    debugReport
  };
}

function expandContent(content: string, procedures: Record<string,string>, expectedValues: string[][], depth = 0) {
  if (depth > 20) return;
  const lines = content.split(';');
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('V')) {
      const soMatch = trimmed.match(/["']?(_so|_po)["']?=#([01LHX]+)/i);
      if (soMatch) {
         expectedValues.push([soMatch[2].replace(/H/g,'1').replace(/L/g,'0').replace(/X/g,'0')]);
      }
    } else if (trimmed.startsWith('Call')) {
      const pName = (trimmed.match(/Call\s+["']?(\w+)["']?/) || [])[1];
      if (pName && procedures[pName]) expandContent(procedures[pName], procedures, expectedValues, depth + 1);
    }
  }
}

export function parseFailLog(logText: string, scanChains: ScanChain[]) {
  const failures: Record<string, number> = {};
  const lines = logText.split('\n');
  const knownChains = new Set(scanChains.map(c => c.name));

  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
       if (knownChains.has(parts[i])) {
         const bitPos = parseInt(parts[i+1]);
         if (!isNaN(bitPos)) {
            const chain = scanChains.find(c => c.name === parts[i]);
            if (chain && chain.ffs[bitPos]) {
              const id = chain.ffs[bitPos].id;
              failures[id] = (failures[id] || 0) + 1;
            }
         }
       }
    }
    
    // Fallback for previous formats
    const synthMatch = line.match(/Chain\s+([\w-]+)\s*\|\s*ShiftBit\s*(\d+)/);
    if (synthMatch) {
      const chainName = synthMatch[1];
      const bitPos = parseInt(synthMatch[2]);
      const chain = scanChains.find(c => c.name === chainName);
      if (chain && chain.ffs[bitPos]) {
        const ffId = chain.ffs[bitPos].id;
        failures[ffId] = (failures[ffId] || 0) + 1;
      }
    }
  });
  return failures;
}
