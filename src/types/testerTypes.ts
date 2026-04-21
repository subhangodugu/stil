export interface ChipTestResult {
  id: number;
  batch_id: number;
  chip_id: string;
  status: "PASS" | "FAIL";
  mismatches: number;
  yield_percent: number;
  accuracy?: number | null;       // vector-level accuracy %
  total_scan_chains: number;
  total_flip_flops: number;
  total_patterns: number;
  total_vectors?: number;
  tester_cycles?: number;
  resolved_patterns?: number;
  first_fail_pattern: string | null;
  created_at: string;
  batch_name?: string;
  upload_timestamp?: string;
  failedChains: string[];
  data_source?: string;
}

export interface TesterSummary {
  totalChips: number;
  passedChips: number;
  failedChips: number;
  overallYield: number;
  avgMismatches: number;
}
