import { describe, it, expect } from 'vitest';
import { parseSTIL } from '../parser.js';

describe('Lexical Parser Engine', () => {
  it('should accurately bypass standard braces inside string blocks without crashing', () => {
    // Malicious STIL test string mimicking an injection flaw via comments/strings
    const mockSTIL = `
      STIL 1.0;
      Signals {
        SCAN_CLK In;
        "COMMENT_BLOCK" In; // This contains "{" and "}" characters.
      }
      ScanStructures {
        ScanChain "EDT_01" {
          ScanLength 3;
          ScanIn "dummy_in";
          ScanOut "dummy_out";
          // We embed a mock malicious payload to attempt parser breaking
          Comment "If the scanner fails, { this } will break the struct";
        }
      }
      PatternBurst "Burst_01" {
        Pattern "Pat_1";
      }
      Pattern "Pat_1" {
        V { "_so"=#011; }
      }
    `;

    const parsed = parseSTIL(mockSTIL);
    
    // Assert Architecture Topology survives
    expect(parsed.totalFFs).toBe(3);
    expect(parsed.scanChains.length).toBe(1);
    expect(parsed.scanChains[0].name).toBe('EDT_01');
    expect(parsed.expectedValues.length).toBe(1);
    // VCD logic drops exact bit sequence
    expect(parsed.expectedValues[0][0]).toBe('011');
  });

  it('should gracefully handle empty arrays and strict boundary STIL failures', () => {
    const brokenSTIL = `
      ScanStructures {
        ScanChain "BAD_CHAN" {
          ScanLength 0;
        }
      }
    `;
    
    expect(() => parseSTIL(brokenSTIL)).toThrowError('Invalid ScanLength');
  });
});
