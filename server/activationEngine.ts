import { STILUnified } from "./parser";

export interface FailEntry {
  pattern: number;
  edtCh: string;
  scanChain: string;
  shiftBit: number;
  expected: number;
  actual: number;
  cycle: number;
  faultType: 'SA0' | 'SA1';
  result: "FAIL";
}

export interface ActivationResult {
  failEntries: FailEntry[];
  stats: {
    activated: number;
    failed: number;
  };
  heatMap: Record<string, number>;
}

export function runActivationEngine(
  stilMetadata: STILUnified,
  params: {
    targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
    severity: number;
    intermittentProb?: number;
  }
): ActivationResult {
  const { targets, severity, intermittentProb = 1.0 } = params;
  const failEntries: FailEntry[] = [];
  let activated = 0;
  let failed = 0;
  const heatMap: Record<string, number> = {};

  // Optimize for large STIL files: process in chunks if needed, but here we simulate
  for (let p = 0; p < stilMetadata.totalPatterns; p++) {
    targets.forEach(target => {
      const { chainName, bitPosition, faultType } = target;
      const targetValue = faultType === 'SA0' ? 0 : 1;
      const edtCh = stilMetadata.internalChainMapping[chainName] || "N/A";
      const chainOffset = stilMetadata.chainOffsets[chainName] || 0;

      let expectedValue = Math.random() > 0.5 ? 1 : 0;
      
      const patternExpected = stilMetadata.expectedValues[p];
      if (patternExpected && patternExpected.length > 0) {
        const fullScanStr = patternExpected[0];
        const globalBitPos = chainOffset + bitPosition;
        if (globalBitPos < fullScanStr.length) {
          expectedValue = fullScanStr[globalBitPos] === '1' ? 1 : 0;
        }
      }
      
      const isActivated = (faultType === 'SA0' && expectedValue === 1) || 
                          (faultType === 'SA1' && expectedValue === 0);

      if (isActivated) {
        activated++;
        const isObservable = Math.random() < severity && Math.random() < intermittentProb;

        if (isObservable) {
          failed++;
          
          failEntries.push({
            pattern: p,
            edtCh,
            scanChain: chainName,
            shiftBit: bitPosition,
            expected: expectedValue,
            actual: targetValue,
            cycle: 100 + p * 2 + Math.floor(Math.random() * 5), 
            faultType,
            result: "FAIL"
          });

          const ffId = `FF_${chainName}_${bitPosition}`;
          heatMap[ffId] = (heatMap[ffId] || 0) + 1;
        }
      }
    });
  }

  return {
    failEntries,
    stats: { activated, failed },
    heatMap
  };
}
