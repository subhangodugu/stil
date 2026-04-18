import { STILUnified } from "./stilParser.js";

export interface FaultSummary {
  faultId: string;
  faultType: 'SA0' | 'SA1';
  affectedChain: string;
  affectedShiftBit: number;
  totalPatterns: number;
  patternsActivated: number;
  patternsFailed: number;
  activationRate: number;
  failRate: number;
  compressionType: string;
  edtChannel: string;
  scanClock: string;
  timingSet: string;
  generatedTime: string;
  warning?: string;
  debugReport?: {
    patternBurstsFound: number;
    proceduresFound: number;
    expandedPatterns: number;
    scanVectorsExtracted: number;
  };
}

let faultCounter = 1;

export function buildFaultSummary(
  stilMetadata: STILUnified,
  userParams: {
    targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
  },
  stats: {
    activated: number;
    failed: number;
  }
): FaultSummary {
  const faultId = `FLT_${faultCounter.toString().padStart(4, '0')}`;
  faultCounter++;

  const activationRate = (stats.activated / stilMetadata.totalPatterns) * 100;
  const failRate = (stats.failed / stilMetadata.totalPatterns) * 100;

  return {
    faultId,
    faultType: [...new Set(userParams.targets.map(t => t.faultType))].join('/') as 'SA0' | 'SA1',
    affectedChain: userParams.targets.map(t => t.chainName).join(', '),
    affectedShiftBit: userParams.targets[0]?.bitPosition || 0,
    totalPatterns: stilMetadata.totalPatterns,
    patternsActivated: stats.activated,
    patternsFailed: stats.failed,
    activationRate: parseFloat(activationRate.toFixed(2)),
    failRate: parseFloat(failRate.toFixed(2)),
    compressionType: stilMetadata.compressionType,
    edtChannel: userParams.targets.map(t => stilMetadata.internalChainMapping[t.chainName] || "N/A").join(', '),
    scanClock: stilMetadata.scanClock,
    timingSet: stilMetadata.timingSetName,
    generatedTime: new Date().toISOString().replace('T', ' ').split('.')[0],
    warning: stilMetadata.warning,
    debugReport: stilMetadata.debugReport
  };
}
