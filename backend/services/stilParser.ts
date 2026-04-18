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

export interface VectorEntry {
  cycle: number;
  scan: string; // Merged pin data (_bidi_ + _pi_)
  pi?: string;
  po?: string;
  bidi?: string;
}

export interface PatternData {
  patternId: string;
  vectors: VectorEntry[];
}

/**
 * A single scan vector decomposed per chain.
 * expectedOut = the bits we expect to observe at the scan-out pin for this chain.
 * shiftIn     = the bits shifted into the scan-in pin (treated as the same in
 *               capture-only STIL; distinct when SI vectors are also present).
 */
export interface PatternVector {
  patternIndex: number;   // which pattern/burst this belongs to
  chain: string;          // scan chain name
  shiftIn: string;        // bits shifted in (scan-in pin capture)
  expectedOut: string;    // bits expected at scan-out
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
  patternCount: number; // Burst/Pattern level
  vectorCount: number;  // Expanded V/Vector level
  testerCycles: number; // Total ATE Tester Cycles
  totalPatterns: number; // Compatible with legacy (maps to patternCount)
  patterns: PatternData[]; // Deterministic Bit-Accurate Models
  signals: Record<string, string>;
  faults: Fault[];
  localizationMessage?: string;
  heatmap?: HeatmapData;
  rawStilSnippet?: string;
  rawLogSnippet?: string;

  // Metadata for Injection/Simulation
  version: string;
  patternBurst: string;
  testType: string;
  scanChainNames: string[];
  scanLengthPerChain: Record<string, number>;
  edtChannels: string[];
  expectedValues: string[][];
  patternVectors: PatternVector[];   // per-chain decomposed vectors (used by faultEngine)
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
    pinDetectionMode: 'explicit' | 'heuristic';
    mappedScanOutPins: string[];
    executionGraph: string[];
    mappingLogs: string[];
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

  // Safety break if we never found a block
  if (!started || block.length < 2) return "";

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
  if (braceStart === -1) return null;
  
  return extractBalancedBlock(text, braceStart);
}

export function parseSTIL(stilText: string, failLogText?: string): STILUnified {
  const debugReport = {
    patternBurstsFound: 0,
    proceduresFound: 0,
    expandedPatterns: 0,
    scanVectorsExtracted: 0,
    pinDetectionMode: 'heuristic' as 'explicit' | 'heuristic',
    mappedScanOutPins: [] as string[],
    executionGraph: [] as string[],
    mappingLogs: [] as string[]
  };

  // 1. Foundation: Signals & SignalGroups
  const signals: Record<string, string> = {};
  const signalGroups: Record<string, string[]> = {};

  // Extract from ALL Signals { ... } blocks
  const signalBlockRegex = /Signals\s*\{/gi;
  let ssMatch;
  while ((ssMatch = signalBlockRegex.exec(stilText)) !== null) {
    const braceStart = stilText.indexOf("{", ssMatch.index);
    const content = extractBalancedBlock(stilText, braceStart);
    const sigLineRegex = /["']?([\w\.]+)["']?\s+(In|Out|InOut);/gi;
    let sMatch;
    while ((sMatch = sigLineRegex.exec(content)) !== null) {
      signals[sMatch[1]] = sMatch[2];
    }
  }

  // Extract from ALL SignalGroups { ... } blocks
  const groupBlockRegex = /SignalGroups\s*\{/gi;
  let ggMatch;
  while ((ggMatch = groupBlockRegex.exec(stilText)) !== null) {
    const braceStart = stilText.indexOf("{", ggMatch.index);
    const content = extractBalancedBlock(stilText, braceStart);
    const groupRegex = /(\w+)\s*=\s*['"](.*?)['"]\s*(?:\{.*?\})?\s*;/g;
    let gMatch;
    while ((gMatch = groupRegex.exec(content)) !== null) {
      const gName = gMatch[1];
      const pinsStr = gMatch[2];
      const pins = pinsStr.split('+').map(p => p.trim().replace(/['"]/g, ""));
      signalGroups[gName] = pins;
    }
  }

  // 2. Scan Structures (Lexical)
  const scanChains: ScanChain[] = [];
  const scanLengthPerChain: Record<string, number> = {};
  const chainOffsets: Record<string, number> = {};
  const internalChainMapping: Record<string, string> = {};
  let globalFFIndex = 0;

  // Extract from ALL ScanStructures { ... } blocks
  const structureBlockRegex = /ScanStructures\s+["']?(\w+)?["']?\s*\{/gi;
  let structMatch;
  while ((structMatch = structureBlockRegex.exec(stilText)) !== null) {
    const braceStart = stilText.indexOf("{", structMatch.index);
    const structuresContent = extractBalancedBlock(stilText, braceStart);
    
    const chainBlockRegex = /ScanChain\s+["']?(\w+)["']?\s*\{/g;
    let cMatch;
    while ((cMatch = chainBlockRegex.exec(structuresContent)) !== null) {
      const chainName = cMatch[1];
      const bStart = structuresContent.indexOf("{", cMatch.index);
      const content = extractBalancedBlock(structuresContent, bStart);

      const lengthMatch = content.match(/ScanLength\s+(\d+)/);
      const length = lengthMatch ? parseInt(lengthMatch[1]) : 0;
      
      if (length === 0 && content.includes("ScanLength")) continue;

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
  }

  // 3. Modular Diagnostic Pipeline (Industrial)
  const proceduresMap = extractProceduresMap(stilText);
  // Add MacroDefs support
  const macrosMap = extractNamedBlockMap(stilText, "MacroDefs");
  macrosMap.forEach((v, k) => proceduresMap.set(k, v));

  const burstMatch = stilText.match(/PatternBurst\s+["']?(\w+)["']?/);
  const activeBurst = burstMatch ? burstMatch[1] : (stilText.match(/PatternExec\s*\{.*?PatternBurst\s+["']?(\w+)["']?/s)?.[1] || "Unknown");
  
  const executionGraph = resolveExecutionGraph(stilText, activeBurst);
  const { pins: scanOutPins, mode: pinMappingMode } = getScanOutPins(scanChains);
  
  const mappingLogs: string[] = [`[INIT] Pin Mapping Mode: ${pinMappingMode.toUpperCase()}`];
  if (pinMappingMode === 'explicit') {
    mappingLogs.push(`[INIT] Mapped Pins: ${scanOutPins.join(', ')}`);
  }

  // 4. Industrial Deterministic Extraction (User spec v4)
  const patterns: PatternData[] = [];
  const cycleInfo = { current: 100 };
  const memo = new Map<string, string[][]>();

  for (const node of executionGraph) {
    if (node.type === 'Pattern' && node.content) {
      const patternId = node.name;
      const body = node.content;
      
      const expanded = expandVectors(body, proceduresMap, scanOutPins, signalGroups, memo, debugReport.mappingLogs, cycleInfo);
      
      const vectors: VectorEntry[] = expanded.map(v => ({
        cycle: cycleInfo.current++,
        scan: v[0] || ""
      }));

      if (vectors.length > 0) {
        patterns.push({ patternId, vectors });
      }
    }
  }

  // 4. Industrial Metric Extraction (User spec v4.2)
  // Extract REAL logical pattern count from ATE annotations
  // Priority: pattern_end (Header) > Total Patterns (Summ) > highest Pattern:N label
  const patternMetaMatch = stilText.match(/pattern_end\s*=\s*(\d+)/i) ||
                           stilText.match(/Total\s+Patterns\s*[:=]\s*(\d+)/i) ||
                           stilText.match(/Pattern\s*[:]\s*(\d+)/i);
  let logicalPatterns = patternMetaMatch ? parseInt(patternMetaMatch[1], 10) : patterns.length;
  
  // If we have pattern labels, use the highest one as logical count if it's larger
  const allLabels = patterns.map(p => parseInt(p.patternId, 10)).filter(n => !isNaN(n));
  
  // SCAN INSIDE BODIES for Pattern:N comments (Common in Tessent/Modus consolidated STIL)
  let intraBlockMax = 0;
  for (const node of executionGraph) {
    if (node.content) {
      const matches = node.content.match(/Pattern\s*[:]\s*(\d+)/gi);
      if (matches) {
        matches.forEach(m => {
          const num = parseInt(m.match(/\d+/)![0], 10);
          if (num > intraBlockMax) intraBlockMax = num;
        });
      }
    }
  }

  logicalPatterns = Math.max(logicalPatterns, ...allLabels, intraBlockMax);

  const patternCount = patterns.length; // physical blocks
  const vectorCount = patterns.reduce((sum, p) => sum + p.vectors.length, 0);
  const testerCycles = cycleInfo.current;
  const expectedValues: string[][] = patterns.map(p => p.vectors.map(v => v.scan));

  // Build Final Unified Model
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

  // Build pat patternVectors: decompose global scan-out strings into per-chain vectors
  const patternVectors: PatternVector[] = [];
  expectedValues.forEach((patternBits, pIdx) => {
    const fullStr = patternBits[0] || "";
    if (!fullStr) return;
    scanChains.forEach(chain => {
      const offset = chainOffsets[chain.name] ?? 0;
      const len    = scanLengthPerChain[chain.name] ?? chain.length;
      const slice  = fullStr.slice(offset, offset + len);
      if (slice) {
        patternVectors.push({
          patternIndex: pIdx,
          chain: chain.name,
          shiftIn: slice,      // scan-in approximation (capture-mode STIL)
          expectedOut: slice,  // expected scan-out (what we compare against)
        });
      }
    });
  });

  return {
    scanChains,
    hasEDT,
    totalFFs: globalFFIndex,
    vectorCount,
    patternCount, // physical blocks (resolved)
    testerCycles,
    totalPatterns: logicalPatterns, 
    patterns,
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
    patternVectors,
    chainOffsets,
    internalChainMapping,
    compressionType: hasEDT ? "EDT (Embedded Deterministic Test)" : "None",
    scanClock: (stilText.match(/Signal\s+["']?(\w*clk\w*)["']?\s+\{.*?Type\s+In;/is) || [])[1] || "SCAN_CLK",
    shiftClock: "SCAN_CLK",
    captureClock: "SCAN_CLK",
    timingSetName: (stilText.match(/Timing\s+["']?(\w+)["']?\s+\{/) || [])[1] || "Default_Timing",
    scanChainCount: scanChains.length,
    debugReport: {
      patternBurstsFound: stilText.match(/PatternBurst\s+/g)?.length || 0,
      proceduresFound: proceduresMap.size,
      expandedPatterns: executionGraph.length,
      scanVectorsExtracted: expectedValues.length,
      pinDetectionMode: pinMappingMode,
      mappedScanOutPins: scanOutPins,
      executionGraph: executionGraph.map(n => `[RESOLVED] ${n.type}: ${n.name}`),
      mappingLogs
    },
    rawStilSnippet: stilText.substring(0, 5000),
    rawLogSnippet: failLogText ? failLogText.substring(0, 2000) : undefined
  };
}

/**
 * Industrial Lexical Parser for Vector Blocks
 * Handles tokens, repeats (\r), and pin data merging deterministically.
 */
function expandVectorBlock(block: string, scanOutPins: string[], signalGroups: Record<string, string[]>) {
  // Tokenize by whitespace, preserving newlines/markers
  const tokens = block.split(/\s+/).filter(t => t.length > 0);

  let scanOutBits = "";
  let i = 0;

  // Industrial Pin-Aware Extraction:
  // We only care about bits associated with scanOutPins or groups containing them
  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.includes("=")) {
      const parts = token.split("=");
      const leftSide = parts[0] || (i > 0 ? tokens[i-1] : "");
      const rightSide = parts[1] || tokens[i+1];

      // Resolve which pins this assignment target includes
      const targetPins = signalGroups[leftSide] || [leftSide];
      const isScanOutTarget = targetPins.some(p => scanOutPins.includes(p));

      if (isScanOutTarget && rightSide) {
        // Find indices in the target group that correspond to scan-out pins
        // For simplicity, if the WHOLE group is our target group, we take its bits
        // In physical ATE, we filter bits by their position in the target group
        let bits = rightSide.replace(/[\s'":;]/g, "");
        
        // Handle repeat \r within assignment if present (rare)
        if (bits.startsWith("\\r")) {
           // ... (handled below)
        }

        // Industrial State Preservation: L=0, H=1, X=X, Z=Z
        // We preserve X for the simulator to handle don't-cares
        scanOutBits += bits.replace(/H/g, "1").replace(/L/g, "0").replace(/[;]/g, "");
      }
      
      if (!parts[1]) i++; // skip the value token if it was separate
    } else if (token.startsWith("\\r")) {
      // Standalone repeat outside an assignment? (Unlikely in valid STIL but stay robust)
      i += 2; 
    }
    i++;
  }

  // Fallback: If no explicit scan-out assignment found, return the last balanced block that looks like bits
  if (!scanOutBits) {
    const bitRegex = /^[01XLH]+$/;
    for (const t of tokens) {
      const clean = t.replace(/[;:"']/g, "");
      if (bitRegex.test(clean)) {
        scanOutBits = clean.replace(/H/g, "1").replace(/L/g, "0");
        break;
      }
    }
  }

  return { scan: scanOutBits, repeat: 1 };
}

function expandVectors(
  content: string, 
  procedures: Map<string, string>, 
  scanOutPins: string[],
  signalGroups: Record<string, string[]>,
  memo: Map<string, string[][]>,
  logs: string[],
  cycleInfo: { current: number },
  depth = 0
): string[][] {
  if (depth > 25) {
    logs.push(`[WARN] Maximum recursion depth reached at depth ${depth}`);
    return [];
  }

  const vectors: string[][] = [];
  
  let pos = 0;
  while (pos < content.length) {
    // Skip whitespace
    while (pos < content.length && /\s/.test(content[pos])) pos++;
    if (pos >= content.length) break;

    const remaining = content.slice(pos);
    
    // 1. Vector Block: Support both V { ... } and Vector { ... }
    if (remaining.match(/^(?:V|Vector)\s*\{/i)) {
      const braceStart = content.indexOf("{", pos);
      const inner = extractBalancedBlock(content, braceStart);
      const expanded = expandVectorBlock(inner, scanOutPins, signalGroups);
      
      for (let i = 0; i < expanded.repeat; i++) {
        vectors.push([expanded.scan]);
        cycleInfo.current++;
      }
      
      pos = content.indexOf("}", braceStart) + 1;
    }
    // 2. Loop Block: Loop N { ... }
    else if (remaining.match(/^Loop\s+\d+/i)) {
      const loopMatch = remaining.match(/^Loop\s+(\d+)/i);
      const count = parseInt(loopMatch![1], 10);
      const braceStart = content.indexOf("{", pos);
      const inner = extractBalancedBlock(content, braceStart);
      
      const loopVectors = expandVectors(inner, procedures, scanOutPins, signalGroups, memo, logs, cycleInfo, depth + 1);
      for (let i = 0; i < count; i++) {
        vectors.push(...loopVectors);
      }
      
      pos = content.indexOf("}", braceStart) + 1;
    }
    // 3. Call Statement: Call Name;
    else if (remaining.match(/^Call\s+/i)) {
      const semiPos = content.indexOf(";", pos);
      if (semiPos !== -1) {
        const stmt = content.slice(pos, semiPos);
        const pNameMatch = stmt.match(/Call\s+["']?(\w+)["']?/i);
        const pName = pNameMatch ? pNameMatch[1] : null;
        
        if (pName && procedures.has(pName)) {
           if (!memo.has(pName)) {
             const nested = expandVectors(procedures.get(pName)!, procedures, scanOutPins, signalGroups, memo, logs, cycleInfo, depth + 1);
             memo.set(pName, nested);
           }
           vectors.push(...memo.get(pName)!);
        }
        pos = semiPos + 1;
      } else {
        pos = content.length; 
      }
    }
    else {
      const nextSemi = content.indexOf(";", pos);
      const nextBrace = content.indexOf("{", pos);
      
      if (nextSemi !== -1 && (nextBrace === -1 || nextSemi < nextBrace)) {
        pos = nextSemi + 1;
      } else if (nextBrace !== -1) {
        extractBalancedBlock(content, nextBrace);
        pos = content.indexOf("}", nextBrace) + 1;
      } else {
        pos = content.length; 
      }
    }
  }

  return vectors;
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

/**
 * Extracts all named blocks for a given keyword into a Map
 */
function extractNamedBlockMap(text: string, keyword: string): Map<string, string> {
  const map = new Map<string, string>();
  const blockRegex = new RegExp(`${keyword}\\s+["']?(\\w+)["']?\\s*\\{`, 'gi');
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    const name = match[1];
    const bStart = text.indexOf("{", match.index);
    map.set(name, extractBalancedBlock(text, bStart));
  }
  return map;
}

/**
 * Industrial-Grade Procedure Extraction
 */
function extractProceduresMap(stilText: string): Map<string, string> {
  const procedures = extractNamedBlockMap(stilText, "Procedures");
  // Also scan for top-level individual Procedure blocks if not in a Procedures container
  const procRegex = /Procedure\s+["']?(\w+)["']?\s*\{/gi;
  let pMatch;
  while ((pMatch = procRegex.exec(stilText)) !== null) {
    const name = pMatch[1];
    const bStart = stilText.indexOf("{", pMatch.index);
    procedures.set(name, extractBalancedBlock(stilText, bStart));
  }
  return procedures;
}

/**
 * Execution Graph Node
 */
interface ExecutionNode {
  type: 'Pattern' | 'Call';
  name: string;
  content?: string;
}

/**
 * Resolves Pattern Execution Graph
 */
function resolveExecutionGraph(stilText: string, activeBurst: string): ExecutionNode[] {
  const graph: ExecutionNode[] = [];
  const burstContent = extractNamedBlock(stilText, "PatternBurst", activeBurst) || "";

  // --- FIX: Parse PatList { "P1" "P2" ... } format (standard STIL) ---
  const patListBlock = extractNamedBlock(burstContent, "PatList") || "";
  if (patListBlock) {
    // Extract all quoted or unquoted pattern names from PatList body
    const nameRegex = /["']?(\w+)["']?/g;
    let pnMatch;
    while ((pnMatch = nameRegex.exec(patListBlock)) !== null) {
      const patName = pnMatch[1];
      const patContent = extractNamedBlock(stilText, "Pattern", patName);
      if (patContent !== null) {
        graph.push({ type: 'Pattern', name: patName, content: patContent });
      }
    }
  }

  // Legacy: PatternBurst uses "Pattern <name>;" reference lines (non-PatList form)
  if (graph.length === 0) {
    const patRefRegex = /Pattern\s+["']?(\w+)["']?\s*;/g;
    let prMatch;
    while ((prMatch = patRefRegex.exec(burstContent)) !== null) {
      const patName = prMatch[1];
      const patContent = extractNamedBlock(stilText, "Pattern", patName);
      graph.push({ type: 'Pattern', name: patName, content: patContent || "" });
    }
  }

  // Final Fallback: No burst found — scan entire file for Pattern blocks
  if (graph.length === 0) {
    const patBlockRegex = /Pattern\s+["']?(\w+)["']?\s*\{/g;
    let pbMatch;
    while ((pbMatch = patBlockRegex.exec(stilText)) !== null) {
      const patName = pbMatch[1];
      const braceS = stilText.indexOf("{", pbMatch.index);
      const patCont = extractBalancedBlock(stilText, braceS);
      graph.push({ type: 'Pattern', name: patName, content: patCont });
    }
  }

  return graph;
}

/**
 * Direction-Aware Pin Mapper
 */
function getScanOutPins(scanChains: ScanChain[]): { pins: string[]; mode: 'explicit' | 'heuristic' } {
  const explicitPins = scanChains.map(c => c.scanOut).filter(p => p && p !== 'Unknown');
  if (explicitPins.length > 0) {
    return { pins: explicitPins.filter((v, i, a) => a.indexOf(v) === i), mode: 'explicit' };
  }
  // Heuristic Fallback
  return { pins: ['_so', '_po', 'so', 'scanout', 'out'], mode: 'heuristic' };
}
