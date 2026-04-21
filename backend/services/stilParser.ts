export interface ScanChain {
  name: string;
  length: number;
  scanIn: string;
  scanOut: string;
  ffs: Array<{
    id: string;
    localIndex: number;
    globalIndex: number;
    clockDomain?: string;
    type?: string;
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

export interface MacroMapping {
  signal: string;
  bitstream: string;
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
  macros: Record<string, MacroMapping[]>;
  faults: Fault[];
  localizationMessage?: string;
  heatmap?: HeatmapData;
  rawStilSnippet?: string;
  rawStilTail?: string;
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
function extractSubBlocks(t: string, k: string, m: Map<string, string>) {
  [...t.matchAll(new RegExp(`${k}\\s+["']?(\\w+)["']?\\s*\\{`, 'gi'))].forEach(x => m.set(x[1], extractBalancedBlock(t, t.indexOf("{", x.index))));
}

interface ExecutionNode { type: 'Pattern' | 'Call'; name: string; content?: string; }

const extractBlocks = (text: string, kw: string, map = new Map<string, string>()) => {
  const reg = new RegExp(`${kw}(?:Defs)?\\s*(?:["']?\\w+["']?\\s*)?\\{`, 'gi');
  let m; while ((m = reg.exec(text))) {
    const s = text.indexOf("{", m.index);
    const content = extractBalancedBlock(text, s);
    if (!m[0].includes('"') && !m[0].includes("'")) { // Container
      extractSubBlocks(content, kw === "Macro" ? "Macro" : "Procedure", map);
    } else { // Single named block
      const name = m[0].match(/["']?(\w+)["']?/)?.[1] || "Unknown";
      if (content) map.set(name, content);
    }
  }
  return map;
};

export function parseSTIL(stilText: string, failLogText?: string): STILUnified {
  const debugReport = { 
    patternBurstsFound: 0, 
    proceduresFound: 0, 
    expandedPatterns: 0, 
    scanVectorsExtracted: 0, 
    pinDetectionMode: 'heuristic' as any, 
    mappedScanOutPins: [], 
    executionGraph: [], 
    mappingLogs: [] 
  };
  const signals: Record<string, string> = {};
  const signalGroups: Record<string, string[]> = {};

  // 1. Foundation: Extract Signals & Groups
  const sigMatch = stilText.matchAll(/Signals\s*\{([\s\S]*?)\}/gi);
  for (const m of sigMatch) {
    [...m[1].matchAll(/["']?([\w\.-]+)["']?\s+(In|Out|InOut);/gi)].forEach(s => signals[s[1]] = s[2]);
  }

  const groupMatch = stilText.matchAll(/SignalGroups\s*\{([\s\S]*?)\}/gi);
  for (const m of groupMatch) {
    [...m[1].matchAll(/(\w+)\s*=\s*['"](.*?)['"]\s*;/g)].forEach(g => signalGroups[g[1]] = g[2].split('+').map(p => p.trim().replace(/['"]/g, "")));
  }

  // 2. Scan Structures (Lexical Discovery Engine)
  const scanChains: ScanChain[] = [];
  const scanLengthPerChain: Record<string, number> = {};
  const chainOffsets: Record<string, number> = {};
  const internalChainMapping: Record<string, string> = {};
  let globalFFIndex = 0;

  const structuresContent = extractNamedBlock(stilText, "ScanStructures") || stilText;
  const chainBlockRegex = /ScanChain\s+["']?([\w\d\.\[\]-]+)["']?\s*\{/g;
  let cMatch;

  while ((cMatch = chainBlockRegex.exec(structuresContent)) !== null) {
    const chainName = cMatch[1];
    const braceStart = structuresContent.indexOf("{", cMatch.index);
    const content = extractBalancedBlock(structuresContent, braceStart);

    const lengthMatch = content.match(/ScanLength\s+(\d+)/);
    const length = lengthMatch ? parseInt(lengthMatch[1]) : 0;
    if (length === 0) continue;

    const scanInMatch = content.match(/ScanIn\s+["']?([\w\d\.\[\]-]+)["']?/);
    const scanOutMatch = content.match(/ScanOut\s+["']?([\w\d\.\[\]-]+)["']?/);
    
    // Industrial Clock Attribution
    const clockDomain = stilText.match(/ScanClock\s+["']?(\w+)["']?/)?.[1] || "GlobalClock";

    const ffs = Array.from({ length }, (_, i) => ({
      id: `FF_${globalFFIndex + i}`,
      localIndex: i,
      globalIndex: globalFFIndex + i,
      clockDomain: clockDomain
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
    if (/channel|edt/i.test(chainName)) internalChainMapping[chainName] = `EDT_${chainName.replace(/\D/g, "")}`;
    globalFFIndex += length;
  }

  // 3. Modular Diagnostic Pipeline: Procedures & Macros
  const proceduresMap = extractBlocks(stilText, "Procedure");
  const macrosMap = extractBlocks(stilText, "Macro");
  const macros: Record<string, MacroMapping[]> = {};
  
  macrosMap.forEach((c, n) => {
    macros[n] = c.split(';').filter(l => l.includes('=')).map(l => ({ signal: l.split('=')[0].trim().replace(/['"]/g, ""), bitstream: l.split('=')[1].trim() }));
    // Industrial Bridge: Macros double as diagnostic procedures in complex cycles
    if (!proceduresMap.has(n)) proceduresMap.set(n, c);
  });

  // 4. Execution Graph Discovery
  const activeBurst = stilText.match(/PatternBurst\s+["']?(\w+)["']?/)?.[1] || "Unknown";
  const { pins: scanOutPins, mode: pinMappingMode } = getScanOutPins(scanChains);
  console.log(`[STIL] Detected ScanOut Pins: ${scanOutPins.join(', ')} (Mode: ${pinMappingMode})`);
  const executionGraph = resolveExecutionGraph(stilText, activeBurst);

  // 5. Industrial Deterministic Expansion (Pattern Level)
  const patterns: PatternData[] = [];
  const cycleInfo = { current: 0 };
  const memo = new Map<string, string[][]>();

  for (const node of executionGraph) {
    if (node.type === 'Pattern' && node.content) {
      // Industrial Sync: Extract specific pattern ID if the content starts with a label "pattern X":
      const labelMatch = node.content.match(/^"pattern\s+(\d+)"\s*:/i);
      const effectiveId = labelMatch ? `Pattern_${labelMatch[1]}` : node.name;

      const expanded = expandVectors(node.content, proceduresMap, scanOutPins, signalGroups, memo, debugReport.mappingLogs, cycleInfo);
      const vectors: VectorEntry[] = expanded.map(v => ({
        cycle: cycleInfo.current++,
        scan: v[0] || ""
      }));
      if (vectors.length > 0) patterns.push({ patternId: effectiveId, vectors });
    }
  }

  const expectedValues = patterns.map(p => p.vectors.map(v => v.scan));
  const faults: Fault[] = [];

  if (failLogText) {
    const failures = parseFailLog(failLogText, scanChains);
    scanChains.forEach(chain => {
      const cFail = chain.ffs.filter(ff => failures[ff.id]).sort((a,b) => a.localIndex - b.localIndex);
      if (cFail.length) {
        const first = cFail[0];
        const isBreak = cFail.length > (chain.length - first.localIndex) * 0.7;
        faults.push({ 
          channel: chain.name, 
          ff: first.id, 
          type: 'ROOT_FAULT', 
          faultType: isBreak ? 'CHAIN_BREAK' : (failures[first.id] > 5 ? 'STUCK_AT_0' : 'INTERMITTENT'), 
          confidence: 90, 
          severity: isBreak ? 'CRITICAL' : 'MAJOR', 
          failCount: failures[first.id], 
          description: `${isBreak ? 'Break' : 'Fault'} at ${first.id}` 
        });
      }
    });
  }

  // Decompose vectors per-chain for the Fault Engine
  const patternVectors = expectedValues.flatMap((bits, pIdx) => {
    const s = bits[0] || "";
    return scanChains.map(c => ({ 
      patternIndex: pIdx, 
      chain: c.name, 
      shiftIn: s.slice(chainOffsets[c.name]||0, (chainOffsets[c.name]||0) + c.length), 
      expectedOut: s.slice(chainOffsets[c.name]||0, (chainOffsets[c.name]||0) + c.length) 
    })).filter(v => v.shiftIn);
  });

  const hasEDT = /edt|compression|decompressor/i.test(stilText);

  return {
    scanChains,
    hasEDT,
    totalFFs: globalFFIndex,
    vectorCount: patterns.reduce((s, p) => s + p.vectors.length, 0),
    patternCount: patterns.length,
    testerCycles: cycleInfo.current,
    
    // Industrial Pattern Identification (v5)
    // 1. Scan for annotations like Ann {* Pattern:29623 *} or //Pattern:29623
    // 2. Fallback to patterns.length if no annotations are found.
    totalPatterns: (() => {
      const annMatches = [...stilText.matchAll(/Pattern:?\s*(\d+)/gi)];
      if (annMatches.length > 0) {
        const maxIdx = Math.max(...annMatches.map(m => parseInt(m[1])));
        return maxIdx + 1; // 0-indexed adjustment
      }
      return patterns.length;
    })(),
    patterns,
    signals,
    macros,
    faults,
    localizationMessage: failLogText ? "" : "No diagnostic possible. Upload log.",
    version: (stilText.match(/STIL\s+(\d+\.\d+);/) || [])[1] || "1.0",
    patternBurst: activeBurst,
    scanChainNames: scanChains.map(c => c.name),
    scanLengthPerChain,
    expectedValues,
    patternVectors,
    chainOffsets,
    internalChainMapping,
    scanChainCount: scanChains.length,
    
    // Industrial Forensic Metadata (Interface Sync)
    testType: (stilText.match(/Ann\s+\{\*\s+Test\s+Type:\s*([\w ]+)\s*\*}/i) || [])[1] || "Industrial FullScan",
    edtChannels: scanChains.map(c => c.name).filter(n => /channel|edt/i.test(n)),
    compressionType: hasEDT ? "EDT (Embedded Deterministic Test)" : "Standard Bypass",
    scanClock: (stilText.match(/Signal\s+["']?(\w*clk\w*)["']?\s+\{.*?Type\s+In;/is) || [])[1] || "SCAN_CLK",
    shiftClock: "SCAN_CLK",
    captureClock: "SCAN_CLK",
    timingSetName: (stilText.match(/Timing\s+["']?(\w+)["']?\s+\{/) || [])[1] || "Default_Industrial_Timing",

    debugReport: { 
      patternBurstsFound: (stilText.match(/PatternBurst\s+/g)||[]).length, 
      proceduresFound: proceduresMap.size, 
      expandedPatterns: patterns.length, 
      scanVectorsExtracted: expectedValues.length, 
      pinDetectionMode: pinMappingMode, 
      mappedScanOutPins: scanOutPins, 
      executionGraph: executionGraph.map(n => `[RESOLVED] ${n.type}: ${n.name}`), 
      mappingLogs: debugReport.mappingLogs 
    },
    rawStilSnippet: stilText.substring(0, 5000),
    rawStilTail: stilText.slice(-5000),
    rawLogSnippet: failLogText?.substring(0, 2000)
  } as STILUnified;
}

function extractNamedBlock(text: string, keyword: string, name?: string): string | null {
  const regexString = name ? `${keyword}\\s+["']?${name}["']?\\s*\\{` : `${keyword}\\s*\\{`;
  const match = new RegExp(regexString, 'i').exec(text);
  return match ? extractBalancedBlock(text, text.indexOf("{", match.index)) : null;
}

/**
 * Industrial Lexical Parser for Vector Blocks
 * Handles tokens, repeats (\r), and pin data merging deterministically.
 */
function expandVectorBlock(block: string, scanOutPins: string[], signalGroups: Record<string, string[]>) {
  // Industrial Tokenizer: Ensure \r, =, and ; are treated as distinct tokens even if attached to bits
  const tokens = block
    .replace(/\\r/g, " \\r ")
    .replace(/=/g, " = ")
    .replace(/;/g, " ; ")
    .split(/\s+/)
    .filter(t => t.length > 0);

  let scanOutBits = "";
  let i = 0;
  let blockRepeat = 1;

  while (i < tokens.length) {
    const token = tokens[i];
    
    // 1. Check for standalone repeat (Repeat of the whole vector block)
    if (token === '\\r') {
      blockRepeat = parseInt(tokens[i+1]) || 1;
      i += 2;
      continue;
    }

    // 2. Check for Signal Assignment
    if (token.includes("=") || (tokens[i+1] === "=")) {
      let leftSide: string;
      let valStartIdx: number;

      if (token.includes("=")) {
        const parts = token.split("=");
        leftSide = parts[0] || (i > 0 ? tokens[i-1] : "");
        valStartIdx = parts[1] ? i : i + 1;
      } else {
        leftSide = token.replace(/['"]/g, "");
        valStartIdx = i + 2;
      }

      const targetPins = signalGroups[leftSide] || [leftSide];
      const isScanOutTarget = targetPins.some(p => scanOutPins.includes(p));
      console.log(`[STIL] Found Assignment: ${leftSide} = ... (isScanOut: ${isScanOutTarget})`);

      if (isScanOutTarget) {
        // Parse the value which might contain repeats: e.g. "01\r 5 X 1"
        let j = valStartIdx;
        let assignmentTerminated = false;
        
        while (j < tokens.length && !assignmentTerminated) {
          let currentValToken = tokens[j];
          if (j === valStartIdx && tokens[j-1] === "=" && currentValToken.includes("=")) {
              // already handled
          }
          
          if (!currentValToken || currentValToken === ";") {
            assignmentTerminated = true;
            break;
          }

          if (currentValToken === "\\r") {
            const count = parseInt(tokens[j+1]);
            let bit = tokens[j+2] || "0";
            bit = bit.replace(/H/g, "1").replace(/L/g, "0").replace(/[;'"]/g, "");
            
            const safeCount = Math.min(count, 100000); 
            scanOutBits += bit.repeat(safeCount);
            j += 3;
          } else {
            if (currentValToken.endsWith(";")) {
               assignmentTerminated = true;
            }
            const cleanBits = currentValToken.replace(/H/g, "1").replace(/L/g, "0").replace(/[;'"]/g, "");
            scanOutBits += cleanBits;
            j++;
          }
        }
        i = j;
        continue;
      }
    }
    i++;
  }

  // Fallback: If no explicit scan-out assignment found, return the last bits token
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

  return { scan: scanOutBits, repeat: blockRepeat };
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
  const V_REGEX = /^(?:V|Vector)\s*\{/i;
  const LOOP_REGEX = /^Loop\s+(\d+)/i;
  const CALL_REGEX = /^Call\s+["']?(\w+)["']?/i;

  while (pos < content.length) {
    // Fast skip whitespace
    while (pos < content.length && (content[pos] === ' ' || content[pos] === '\t' || content[pos] === '\n' || content[pos] === '\r')) pos++;
    if (pos >= content.length) break;

    const char = content[pos];
    const remaining = content.slice(pos, pos + 100); // Only slice a small window for prefix matching
    
    // 1. Vector Block: Support both V { ... } and Vector { ... }
    if (char === 'V' || char === 'v') {
      const vMatch = remaining.match(V_REGEX);
      if (vMatch) {
        const braceStart = content.indexOf("{", pos);
        const inner = extractBalancedBlock(content, braceStart);
        const expanded = expandVectorBlock(inner, scanOutPins, signalGroups);
        
        for (let i = 0; i < expanded.repeat; i++) {
          vectors.push([expanded.scan]);
          cycleInfo.current++;
        }
        pos = content.indexOf("}", braceStart) + 1;
        continue;
      }
    }

    // 2. Loop Block: Loop N { ... }
    if (char === 'L' || char === 'l') {
      const loopMatch = remaining.match(LOOP_REGEX);
      if (loopMatch) {
        const count = parseInt(loopMatch[1], 10);
        const braceStart = content.indexOf("{", pos);
        const inner = extractBalancedBlock(content, braceStart);
        
        const loopVectors = expandVectors(inner, procedures, scanOutPins, signalGroups, memo, logs, cycleInfo, depth + 1);
        for (let i = 0; i < count; i++) {
          vectors.push(...loopVectors);
        }
        pos = content.indexOf("}", braceStart) + 1;
        continue;
      }
    }

    // 3. Call Statement: Call Name;
    if (char === 'C' || char === 'c') {
      const callMatch = remaining.match(CALL_REGEX);
      if (callMatch) {
        const semiPos = content.indexOf(";", pos);
        if (semiPos !== -1) {
          const pName = callMatch[1];
          if (pName && procedures.has(pName)) {
             if (!memo.has(pName)) {
               const nested = expandVectors(procedures.get(pName)!, procedures, scanOutPins, signalGroups, memo, logs, cycleInfo, depth + 1);
               memo.set(pName, nested);
             }
             const cached = memo.get(pName)!;
             for(let i=0; i<cached.length; i++) vectors.push(cached[i]);
          }
          pos = semiPos + 1;
          continue;
        }
      }
    }

    // Fallback: Skip to next separator
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

function resolveExecutionGraph(stilText: string, activeBurst: string): ExecutionNode[] {
  const graph: ExecutionNode[] = [];
  const burstContent = extractBlocks(stilText, "PatternBurst", new Map()).get(activeBurst) || "";
  const patList = extractBlocks(burstContent, "PatList", new Map()).get("") || "";

  if (patList) {
    [...patList.matchAll(/["']?(\w+)["']?/g)].forEach(m => {
      const c = extractBlocks(stilText, "Pattern", new Map()).get(m[1]);
      if (c) graph.push({ type: 'Pattern', name: m[1], content: c });
    });
  }

  if (!graph.length) {
    [...burstContent.matchAll(/Pattern\s+["']?(\w+)["']?\s*;/g)].forEach(m => {
      const c = extractBlocks(stilText, "Pattern", new Map()).get(m[1]);
      graph.push({ type: 'Pattern', name: m[1], content: c || "" });
    });
  }

  if (!graph.length) {
    [...stilText.matchAll(/Pattern\s+["']?(\w+)["']?\s*\{/g)].forEach(m => {
      graph.push({ type: 'Pattern', name: m[1], content: extractBalancedBlock(stilText, stilText.indexOf("{", m.index)) });
    });
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
