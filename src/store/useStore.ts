import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FF {
  id: string;
  localIndex: number;
  globalIndex: number;
  clockDomain?: string;
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
  patternCount: number;
  vectorCount: number;
  testerCycles: number;
  totalPatterns: number;
  signals: Record<string, string>;
  macros?: Record<string, Array<{ signal: string; bitstream: string }>>;
  faults: Fault[];
  localizationMessage?: string;
  heatmap?: HeatmapData;
  rawStilSnippet?: string;
  rawStilTail?: string;
  rawLogSnippet?: string;
  compressionType?: string;
  scanClock?: string;
  timingSetName?: string;
  schemaVersion?: number;
  topologyFaultMap?: Array<{ chainName: string; mismatchCount: number; severity: string }>;
  localizedFaults?: Array<{ patternId: string; chainName: string; ffPosition: number; expected: string; actual: string }>;
  debugReport?: {
    patternBurstsFound: number;
    proceduresFound: number;
    expandedPatterns: number;
    scanVectorsExtracted: number;
    pinDetectionMode: 'explicit' | 'heuristic';
    mappedScanOutPins: string[];
    executionGraph: string[];
    mappingLogs: string[];
  };
  dataSource?: 'ATE_LOG' | 'SIMULATED' | 'INFERRED';
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
  
  streamingMetrics: {
    currentCycle: number;
    totalCycles: number;
    currentPattern: string;
    currentPatternIndex: number;
    totalPatterns: number;
    mismatchCount: number;
    isStreaming: boolean;
  };
  
  analyticsData: {
    yieldTrend: any[];
    hotspots: any[];
    patterns: any[];
    clusters: any[];
  };

  waveformFocus: {
    chainName: string | null;
    bitIndex: number | null;
    zoom: number;
    offset: number;
    autoScroll: boolean;
  };

  aiConfig: {
    apiKey: string | null;
    model: string;
  };

  ingestionProgress: {
    active: boolean;
    files: Record<string, {
      status: 'READING' | 'AI_AUDIT' | 'SIMULATING' | 'PERSISTING' | 'COMPLETE' | 'FAILED';
      details?: any;
    }>;
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
  updateStreamingMetrics: (metrics: Partial<AppState['streamingMetrics']>) => void;
  setAIConfig: (config: Partial<AppState['aiConfig']>) => void;
  setWaveformFocus: (focus: Partial<AppState['waveformFocus']>) => void;
  setIngestionProgress: (filename: string, progress: any) => void;
  clearIngestion: () => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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
      waveformFocus: {
        chainName: null,
        bitIndex: null,
        zoom: 1.0,
        offset: 0,
        autoScroll: true,
      },
      ingestionProgress: {
        active: false,
        files: {},
      },
      dashboardChips: [],
      
      streamingMetrics: {
        currentCycle: 0,
        totalCycles: 0,
        currentPattern: 'Initialization...',
        currentPatternIndex: 0,
        totalPatterns: 0,
        mismatchCount: 0,
        isStreaming: false,
      },

      aiConfig: {
        apiKey: null,
        model: 'llama-3.3-70b-versatile',
      },
      
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
      updateStreamingMetrics: (metrics) => set((state) => ({ 
        streamingMetrics: { ...state.streamingMetrics, ...metrics } 
      })),
      setAIConfig: (config) => set((state) => ({
        aiConfig: { ...state.aiConfig, ...config }
      })),
      reset: () => set({ 
        projectData: null, 
        failingFFs: {}, 
        selectedChain: null, 
        error: null, 
        injectionTargets: [], 
        stilText: null, 
        generatedLog: null, 
        generatedJsonOutput: null, 
        viewMode: 'dashboard', 
        dashboardChips: [], 
        analyticsData: { yieldTrend: [], hotspots: [], patterns: [], clusters: [] }, 
        streamingMetrics: { 
          currentCycle: 0, 
          totalCycles: 0, 
          currentPattern: 'Initialization...', 
          currentPatternIndex: 0,
          totalPatterns: 0,
          mismatchCount: 0, 
          isStreaming: false 
        },
        waveformFocus: { chainName: null, bitIndex: null, zoom: 1.0, offset: 0, autoScroll: true },
        ingestionProgress: { active: false, files: {} }
      }),
      setWaveformFocus: (focus) => set((state) => ({ waveformFocus: { ...state.waveformFocus, ...focus } })),
      setIngestionProgress: (filename, progress) => set((state) => ({
        ingestionProgress: {
          active: true,
          files: {
            ...state.ingestionProgress.files,
            [filename]: progress
          }
        }
      })),
      clearIngestion: () => set({ ingestionProgress: { active: false, files: {} } }),
    }),
    {
      name: 'stil-analyzer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ aiConfig: state.aiConfig }), // Only persist aiConfig
    }
  )
);
