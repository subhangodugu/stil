import { create } from 'zustand';

export interface FF {
  id: string;
  localIndex: number;
  globalIndex: number;
}

export interface ScanChain {
  name: string;
  length: number;
  scanIn: string;
  scanOut: string;
  ffs: FF[];
}

export interface Fault {
  channel: string;
  ff: string;
  type: 'ROOT_FAULT' | 'PROPAGATION' | 'SECONDARY';
  faultType: 'STUCK_AT_0' | 'STUCK_AT_1' | 'CHAIN_BREAK' | 'INTERMITTENT';
  confidence: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  failCount: number;
  description?: string;
}

export interface HeatmapEntry {
  heatScore: number;
  color: string;
  faultType: string;
  failCount: number;
}

export interface HeatmapData {
  ffHeatmap: Record<string, HeatmapEntry>;
  channelHeatmap: Record<string, { heatScore: number; color: string }>;
}

export interface ProjectData {
  scanChains: ScanChain[];
  hasEDT: boolean;
  totalFFs: number;
  totalPatterns: number;
  signals: Record<string, string>;
  faults: Fault[];
  localizationMessage?: string;
  heatmap?: HeatmapData;
  schemaVersion?: number;
  topologyFaultMap?: Array<{ chainName: string; mismatchCount: number; severity: string }>;
  localizedFaults?: Array<{ patternId: string; chainName: string; ffPosition: number; expected: string; actual: string }>;
}

interface AppState {
  projectData: ProjectData | null;
  failingFFs: Record<string, number>;
  selectedChain: ScanChain | null;
  loading: boolean;
  error: string | null;
  injectionTargets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
  stilText: string | null;
  generatedLog: string | null;
  generatedJsonOutput: any | null;
  
  viewMode: 'topology' | 'schematic' | 'injection' | 'dashboard' | 'analytics';
  dashboardChips: any[];
  
  analyticsData: {
    yieldTrend: any[];
    hotspots: any[];
    patterns: any[];
    clusters: any[];
  };
  
  setProjectData: (data: ProjectData) => void;
  setFailingFFs: (fails: Record<string, number>) => void;
  setSelectedChain: (chain: ScanChain | null) => void;
  setViewMode: (mode: 'topology' | 'schematic' | 'injection' | 'dashboard' | 'analytics') => void;
  setLoading: (loading: boolean) => void;
  setAnalyticsData: (data: any) => void;
  setError: (error: string | null) => void;
  setInjectionTargets: (targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>) => void;
  setStilText: (stilText: string | null) => void;
  setGeneratedResults: (log: string | null, json: any | null) => void;
  setDashboardChips: (chips: any[]) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  projectData: null,
  failingFFs: {},
  selectedChain: null,
  loading: false,
  error: null,
  injectionTargets: [],
  stilText: null,
  generatedLog: null,
  generatedJsonOutput: null,
  analyticsData: {
    yieldTrend: [],
    hotspots: [],
    patterns: [],
    clusters: [],
  },
  dashboardChips: [],
  
  viewMode: 'dashboard', 
  
  setProjectData: (data) => set({ projectData: data }),
  setFailingFFs: (fails) => set({ failingFFs: fails }),
  setSelectedChain: (chain) => set({ selectedChain: chain }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setLoading: (loading) => set({ loading }),
  setAnalyticsData: (data) => set({ analyticsData: { ...data } }),
  setError: (error) => set({ error }),
  setInjectionTargets: (targets) => set({ injectionTargets: targets }),
  setStilText: (stilText) => set({ stilText }),
  setGeneratedResults: (log, json) => set({ generatedLog: log, generatedJsonOutput: json }),
  setDashboardChips: (chips) => set({ dashboardChips: chips }),
  reset: () => set({ projectData: null, failingFFs: {}, selectedChain: null, error: null, injectionTargets: [], stilText: null, generatedLog: null, generatedJsonOutput: null, viewMode: 'dashboard', dashboardChips: [], analyticsData: { yieldTrend: [], hotspots: [], patterns: [], clusters: [] } }),
}));

