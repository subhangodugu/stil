export interface ChipTestResult {
  id: number;
  batch_id: number;
  chip_id: string;
  status: "PASS" | "FAIL";
  mismatches: number;
  yield_percent: number;
  total_scan_chains: number;
  total_flip_flops: number;
  total_patterns: number;
  first_fail_pattern: string | null;
  created_at: string;
  batch_name?: string;
  upload_timestamp?: string;
  failedChains: string[];
}

export interface TesterSummary {
  totalChips: number;
  passedChips: number;
  failedChips: number;
  overallYield: number;
  avgMismatches: number;
}
