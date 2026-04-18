/** @version 2.0.1 - Industrial Drill-Down Analysis */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Activity, AlertTriangle, Shield, 
  BarChart3, LayoutGrid, Terminal, Cpu, Database,
  Share2, Zap, Search, LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

// Sub-components
import FailureSummaryCards from '../components/failure_detail/FailureSummaryCards';
import FailedChainHeatmap from '../components/failure_detail/FailedChainHeatmap';
import MismatchTable from '../components/failure_detail/MismatchTable';
import BitCompareViewer from '../components/failure_detail/BitCompareViewer';
import PatternTimeline from '../components/failure_detail/PatternTimeline';
import InDepthTopologySection from '../components/failure_detail/InDepthTopologySection';
import ArchitectureDataGrid from '../components/failure_detail/ArchitectureDataGrid';

// Intelligence Tab Components (Re-used from Main Analysis)
import { HardwareTopology } from '../components/HardwareTopology';
import { ScanChainVisualizer } from '../components/ScanChainVisualizer';
import { FaultInjectionPanel } from '../components/FaultInjectionPanel';
import { DiagnosticConsole } from '../components/DiagnosticConsole';

type ForensicTab = 'SUMMARY' | 'INTELLIGENCE' | 'IN_DEPTH';

export default function FailureDetailView() {
  const { chipId } = useParams();
  const navigate = useNavigate();
  const { setError, selectedChain, setSelectedChain } = useStore();
  
  const [activeTab, setActiveTab] = useState<ForensicTab>('SUMMARY');
  const [intelMode, setIntelMode] = useState<'topology' | 'schematic' | 'injection'>('topology');
  
  const [data, setData] = useState<{
    chip: any;
    failedChains: any[];
    failureDetails: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/data/batch/${chipId}/details`);
        if (!response.ok) throw new Error('Failed to fetch failure details');
        const result = await response.json();
        setData(result);
        
        // RE-HYDRATION: Reconstruct architecture metadata for In-Depth Analysis
        if (result.chip.project_data) {
          try {
            const archData = typeof result.chip.project_data === 'string' 
              ? JSON.parse(result.chip.project_data) 
              : result.chip.project_data;
            useStore.getState().setProjectData(archData);
          } catch (e) {
            console.error("Hydration failed:", e);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chipId]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <Activity className="text-cyan-500" size={48} />
          </motion.div>
          <span className="text-slate-500 font-black uppercase tracking-widest text-xs">Accessing Diagnostic Buffer...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div>
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-3xl font-black text-white tracking-tight truncate max-w-[400px] xl:max-w-[700px]" title={data.chip.chip_id}>
                {data.chip.chip_id}
              </h2>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                data.chip.status === 'FAIL' 
                  ? "bg-red-500/10 border-red-500/20 text-red-500" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              )}>
                Diagnostic Status: {data.chip.status}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-1 font-black flex items-center gap-2 uppercase tracking-widest">
              <span className="text-slate-700">BATCH:</span> {data.chip.batch_name} 
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full" /> 
              <span className="flex items-center gap-1.5 text-cyan-500/80">
                <Terminal size={12} /> RECORDED: {new Date(data.chip.created_at).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Yield Integrity</p>
            <p className="text-xl font-black text-white">{data.chip.yield_percent}%</p>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Fail Bits</p>
            <p className="text-xl font-black text-red-500">{data.chip.mismatches}</p>
          </div>
        </div>
      </div>

      {/* Forensic Tab Switcher */}
      <div className="flex bg-slate-900/40 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl w-fit">
        {(['SUMMARY', 'INTELLIGENCE', 'IN_DEPTH'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === tab 
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            )}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'SUMMARY' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <FailureSummaryCards chip={data.chip} details={data.failureDetails} failedChains={data.failedChains} />
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 xl:col-span-5">
                <FailedChainHeatmap failedChains={data.failedChains} allChainsCount={data.chip.total_scan_chains} />
              </div>
              <div className="col-span-12 xl:col-span-7">
                <MismatchTable details={data.failureDetails} />
              </div>
            </div>
            <BitCompareViewer details={data.failureDetails} />
            <PatternTimeline details={data.failureDetails} totalPatterns={data.chip.total_patterns} />
          </motion.div>
        )}

        {activeTab === 'INTELLIGENCE' && (
          <motion.div 
            key="intelligence"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-12 gap-8">
              {/* Architecture Details Sidebar */}
              <div className="col-span-3">
                <ArchitectureDataGrid />
              </div>

              {/* Main Analysis Engine */}
              <div className="col-span-9 space-y-6">
                <div className="flex bg-slate-900/40 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl w-fit">
                  <button 
                    onClick={() => setIntelMode('topology')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      intelMode === 'topology' ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <LayoutGrid size={14} className="inline mr-2" /> Architecture Topology
                  </button>
                  <button 
                    onClick={() => setIntelMode('schematic')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      intelMode === 'schematic' ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Share2 size={14} className="inline mr-2" /> FF Chain Schematic
                  </button>
                  <button 
                    onClick={() => setIntelMode('injection')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      intelMode === 'injection' ? "bg-slate-800 text-amber-500 border border-amber-500/30 shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <Zap size={14} className="inline mr-2" /> Fault Injection
                  </button>
                </div>

                <div className="min-h-[600px]">
                  {intelMode === 'topology' && <HardwareTopology />}
                  {intelMode === 'schematic' && (
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
                      {selectedChain ? (
                        <div className="space-y-6">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                             <span className="text-cyan-500">Selected: {selectedChain.name}</span>
                          </h3>
                          <ScanChainVisualizer chain={selectedChain} />
                        </div>
                      ) : (
                        <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20">
                          <Search size={48} className="text-slate-800 mb-4" />
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Select a scan chain from the topology to visualize</p>
                        </div>
                      )}
                    </div>
                  )}
                  {intelMode === 'injection' && <FaultInjectionPanel />}
                </div>

                <DiagnosticConsole />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'IN_DEPTH' && (
          <motion.div 
            key="indepth"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <InDepthTopologySection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="pt-10 border-t border-slate-800/50 flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
        <div className="flex items-center gap-3">
          <Cpu size={14} />
          Silicon Debug Layer 2.0
        </div>
        <div className="flex items-center gap-3">
          <Database size={14} />
          PERSISTENT_DATASTORE_OK
        </div>
      </div>
    </motion.div>
  );
}
