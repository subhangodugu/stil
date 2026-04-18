/**
 * Heatmap Engine Module
 * Computes weighted heat intensity for semiconductor scan diagnostics.
 */

export type FaultType = 'ROOT_FAULT' | 'PROPAGATION' | 'SECONDARY';

export interface HeatmapInput {
  ff: string;
  channel: string;
  type: FaultType;
  faultType: string;
  failCount: number;
}

export interface FFHeat {
  heatScore: number;
  color: string;
  faultType: string;
  failCount: number;
}

export interface ChannelHeat {
  heatScore: number;
  color: string;
}

export interface HeatmapOutput {
  ffHeatmap: Record<string, FFHeat>;
  channelHeatmap: Record<string, ChannelHeat>;
}

const WEIGHTS: Record<FaultType, number> = {
  ROOT_FAULT: 1.0,
  PROPAGATION: 0.7,
  SECONDARY: 0.4,
};

/**
 * Maps a heat score (0.0 - 1.0) to a specific hex color.
 */
export function mapHeatToColor(score: number): string {
  if (score <= 0) return '#1e3a8a'; // Blue
  if (score <= 0.20) return '#06b6d4'; // Cyan
  if (score <= 0.40) return '#22c55e'; // Green
  if (score <= 0.60) return '#eab308'; // Yellow
  if (score <= 0.80) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

/**
 * Computes the complete heatmap for flip-flops and channels.
 */
export function computeHeatmap(
  faults: HeatmapInput[],
  scanChains: { name: string; length: number }[]
): HeatmapOutput {
  const ffHeatmap: Record<string, FFHeat> = {};
  const channelHeatmap: Record<string, ChannelHeat> = {};

  if (faults.length === 0) {
    return { ffHeatmap, channelHeatmap };
  }

  // 1. Find Max Fail Count for normalization
  const maxFailCount = Math.max(...faults.map(f => f.failCount), 1);

  // 2. Compute Weighted Heat for each FF
  faults.forEach(f => {
    const weight = WEIGHTS[f.type] || 0.4;
    const rawScore = (f.failCount / maxFailCount) * weight;
    const heatScore = Math.min(Math.max(rawScore, 0), 1); // Clamp 0-1

    ffHeatmap[f.ff] = {
      heatScore,
      color: mapHeatToColor(heatScore),
      faultType: f.faultType,
      failCount: f.failCount,
    };
  });

  // 3. Aggregate Channel Heat
  scanChains.forEach(chain => {
    const chainFaults = faults.filter(f => f.channel === chain.name);
    
    if (chainFaults.length === 0) {
      channelHeatmap[chain.name] = {
        heatScore: 0,
        color: mapHeatToColor(0),
      };
      return;
    }

    // Average heat score of all FFs in the channel that have faults
    // Note: In a real scenario, we might average over ALL FFs in the chain, 
    // but usually, we want to highlight "hot" chains.
    const sumScore = chainFaults.reduce((sum, f) => {
      return sum + (ffHeatmap[f.ff]?.heatScore || 0);
    }, 0);

    const avgScore = sumScore / chainFaults.length;
    const normalizedAvg = Math.min(Math.max(avgScore, 0), 1);

    channelHeatmap[chain.name] = {
      heatScore: normalizedAvg,
      color: mapHeatToColor(normalizedAvg),
    };
  });

  return { ffHeatmap, channelHeatmap };
}
