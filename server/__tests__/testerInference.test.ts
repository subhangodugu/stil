import { describe, it, expect } from 'vitest';
import { inferChipResult } from '../testerInference.js';
import type { STILUnified } from '../parser.js';

describe('Diagnostic Inference Engine', () => {
  it('should evaluate a clean silicon map as 100% yield PASS', () => {
    const mockCleanStil: STILUnified = {
      scanChains: [
        { name: 'EDT_1', length: 10, scanIn: '', scanOut: '', ffs: [] }
      ],
      hasEDT: true,
      totalFFs: 10,
      totalPatterns: 1,
      signals: {},
      faults: [], // Empty faults represents completely clean silicon
      version: '1.0',
      patternBurst: '',
      testType: '',
      scanChainNames: ['EDT_1'],
      scanLengthPerChain: { EDT_1: 10 },
      edtChannels: ['EDT_1'],
      expectedValues: [],
      chainOffsets: {},
      internalChainMapping: {},
      compressionType: '',
      scanClock: '',
      shiftClock: '',
      captureClock: '',
      timingSetName: '',
      scanChainCount: 1,
      debugReport: { patternBurstsFound: 0, proceduresFound: 0, expandedPatterns: 0, scanVectorsExtracted: 0}
    };

    const inference = inferChipResult(mockCleanStil);
    expect(inference.status).toBe('PASS');
    expect(inference.yieldPercent).toBe(100);
    expect(inference.mismatches).toBe(0);
    expect(inference.failedChains.length).toBe(0);
  });

  it('should correctly classify a catastrophic failure chain break', () => {
    const mockFailStil: STILUnified = {
      scanChains: [
        { name: 'EDT_1', length: 100, scanIn: '', scanOut: '', ffs: [] }
      ],
      hasEDT: true,
      totalFFs: 100,
      totalPatterns: 10,
      signals: {},
      faults: [
        // 20 faults localized simulates a physical trace breakdown
        { channel: 'EDT_1', ff: 'FF_50', type: 'ROOT_FAULT', faultType: 'CHAIN_BREAK', confidence: 95, severity: 'CRITICAL', failCount: 20 }
      ],
      version: '1.0',
      patternBurst: '',
      testType: '',
      scanChainNames: ['EDT_1'],
      scanLengthPerChain: { EDT_1: 100 },
      edtChannels: ['EDT_1'],
      expectedValues: [],
      chainOffsets: {},
      internalChainMapping: {},
      compressionType: '',
      scanClock: '',
      shiftClock: '',
      captureClock: '',
      timingSetName: '',
      scanChainCount: 1,
      debugReport: { patternBurstsFound: 0, proceduresFound: 0, expandedPatterns: 0, scanVectorsExtracted: 0}
    };

    const inference = inferChipResult(mockFailStil);
    
    // We expect the chip to fail outright
    expect(inference.status).toBe('FAIL');
    expect(inference.mismatches).toBeGreaterThan(0);
    expect(inference.failedChains[0].name).toBe('EDT_1');
    expect(inference.failedChains[0].mismatchCount).toBe(20);
    // Yield must naturally decay below 100
    expect(inference.yieldPercent).toBeLessThan(100);
  });
});
