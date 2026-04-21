export type DataSource = 'ATE_LOG' | 'SIMULATED' | 'INFERRED';
export type DeviceStatus = 'PASS' | 'FAIL';
export type FaultType = "STUCK_AT_0" | "STUCK_AT_1" | "INTERMITTENT" | "UNKNOWN" | "STUCK_AT_SIMULATED";

export interface ClassifiedFault {
  patternId: string;
  chainName: string;
  flipFlopPosition: number;
  expected: string;
  actual: string;
  faultType: FaultType;
  mismatchType: string;
}

export interface FailedChain {
  name: string;
  mismatchCount: number;
}

export interface Fault {
  channel: string;
  ff: string;
  type: 'ROOT_FAULT' | 'PROPAGATION' | 'SECONDARY';
  faultType: FaultType;
  confidence: number;
  failCount: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description?: string;
}

export interface AnalysisResult {
  status: DeviceStatus;
  mismatches: number;
  failedChains: FailedChain[];
  yieldPercent: number;
  firstFailPattern: string | null;
  failureDetails: ClassifiedFault[];
  faults: Fault[];
  dataSource: DataSource;
  accuracy: number;
  totalBits: number;
  passedBits: number;
}
