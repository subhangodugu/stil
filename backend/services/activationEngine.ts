import { STILUnified } from "./stilParser.js";

export interface FailEntry {
  pattern: number;
  scanChain: string;
  shiftBit: number;
  expected: number;
  actual: number;
  cycle: number;
  faultType: 'SA0' | 'SA1';
  edtCh?: string;
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

/**
 * ✅ FULLY DETERMINISTIC ACTIVATION ENGINE (v4 - industrial)
 * - NO randomness
 * - Uses STIL expected scan data
 * - Bit-accurate fault injection
 * - Linked to exact tester cycles
 */
export function runActivationEngine(
  stilMetadata: STILUnified,
  params: {
    targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
  }
): ActivationResult {

  const failEntries: FailEntry[] = [];
  const heatMap: Record<string, number> = {};

  let activated = 0;
  let failed = 0;

  const patterns = stilMetadata.patterns; 

  for (let p = 0; p < patterns.length; p++) {
    const pattern = patterns[p];

    for (const vec of pattern.vectors) {
      const scanData = vec.scan; // merged pin data (_bidi_ + _pi_)

      params.targets.forEach(target => {
        const { chainName, bitPosition, faultType } = target;

        const chainOffset = stilMetadata.chainOffsets[chainName] || 0;
        const globalBit = chainOffset + bitPosition;

        // Safety check for vector length
        if (globalBit >= scanData.length) return;

        const expectedBit = scanData[globalBit] === '1' ? 1 : 0;
        const stuckValue = faultType === 'SA0' ? 0 : 1;

        // ✅ Deterministic Fault Calculation
        // Normal stuck-at behavior: use stuckValue
        // Intermittent behavior (v4): periodic toggling
        let actualValue = stuckValue;
        const INTERMITTENT_PERIOD = 4;
        
        if (faultType as string === 'INTERMITTENT') {
          actualValue = (vec.cycle % INTERMITTENT_PERIOD === 0) ? (expectedBit ^ 1) : expectedBit;
        }

        // ✅ Check if the current cycle produces a mismatch
        if (expectedBit !== actualValue) {
          failed++;
          
          failEntries.push({
            pattern: p,
            scanChain: chainName,
            shiftBit: bitPosition,
            expected: expectedBit,
            actual: actualValue,
            cycle: vec.cycle, 
            faultType,
            edtCh: stilMetadata.internalChainMapping[chainName] || "N/A",
            result: "FAIL"
          });

          const ffId = `FF_${chainName}_${bitPosition}`;
          heatMap[ffId] = (heatMap[ffId] || 0) + 1;
        }
      });
    }
  }

  return {
    failEntries,
    stats: { activated, failed },
    heatMap
  };
}
