/**
 * Industrial Fault Terminology Mapping Layer
 * Decouples internal stable technical identifiers (SA0/SA1)
 * from human-readable diagnostic labels (Stuck-at-L/H).
 */

export interface FaultDisplayInfo {
  short: string;
  long: string;
  color: string;
  description: string;
}

export const FaultDisplayMap: Record<string, FaultDisplayInfo> = {
  // SA0 Mappings
  'SA0': {
    short: 'Stuck-at-L',
    long: 'Stuck-at-L (Low)',
    color: 'amber',
    description: 'Silicon node is permanently tied to a logic low state.'
  },
  'STUCK_AT_0': {
    short: 'Stuck-at-L',
    long: 'Stuck-at-L (Low)',
    color: 'amber',
    description: 'Silicon node is permanently tied to a logic low state.'
  },
  
  // SA1 Mappings
  'SA1': {
    short: 'Stuck-at-H',
    long: 'Stuck-at-H (High)',
    color: 'red',
    description: 'Silicon node is permanently tied to a logic high state.'
  },
  'STUCK_AT_1': {
    short: 'Stuck-at-H',
    long: 'Stuck-at-H (High)',
    color: 'red',
    description: 'Silicon node is permanently tied to a logic high state.'
  },
  
  // Generic / Others
  'INTERMITTENT': {
    short: 'Intermittent',
    long: 'Intermittent Fault',
    color: 'purple',
    description: 'Timing-dependent failure that varies across patterns.'
  },
  'CHAIN_BREAK': {
    short: 'Chain Break',
    long: 'Scan Chain Break',
    color: 'rose',
    description: 'Discontinuity in the scan chain infrastructure.'
  },
  'UNKNOWN': {
    short: 'Unknown',
    long: 'Unclassified Fault',
    color: 'slate',
    description: 'Fault signature does not match deterministic stuck-at models.'
  }
};

/**
 * Safely retrieves fault display metadata for any given fault key.
 */
export function getFaultDisplay(type: string | undefined): FaultDisplayInfo {
  if (!type) return FaultDisplayMap['UNKNOWN'];
  return FaultDisplayMap[type] || {
    short: type,
    long: type,
    color: 'slate',
    description: 'Diagnostic classification in progress.'
  };
}
