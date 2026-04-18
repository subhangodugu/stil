/** @version 2.0.2 - AI-Integrated Drill-Down Analysis */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Activity, AlertTriangle,
  BarChart3, LayoutGrid, Terminal, Cpu, Database,
  Zap, LayoutDashboard, Brain, RefreshCw, CheckCircle, ShieldAlert
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
import { FaultInjectionPanel } from '../components/FaultInjectionPanel';
import { DiagnosticConsole } from '../components/DiagnosticConsole';

type ForensicTab = 'SUMMARY' | 'INTELLIGENCE' | 'IN_DEPTH';

export default function FailureDetailView() {
  const { chipId } = useParams();
  const navigate = useNavigate();
  const { setError, setStilText } = useStore();
  
  const [activeTab, setActiveTab] = useState<ForensicTab>('SUMMARY');
  const [intelMode, setIntelMode] = useState<'topology' | 'injection'>('topology');
  
  const [data, setData] = useState<{
    chip: any;
    failedChains: any[];
    failureDetails: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/data/batch/${chipId}/details`);
        if (!response.ok) throw new Error('Failed to fetch failure details');
        const result = await response.json();
        setData(result);
        
        // RE-HYDRATION: Reconstruct architecture metadata for In-Depth Analysis
        // Also clear stilText so FaultInjectionPanel uses projectDataJson Mode A
        if (result.chip.project_data) {
          try {
            const archData = typeof result.chip.project_data === 'string' 
              ? JSON.parse(result.chip.project_data) 
              : result.chip.project_data;
            
            // Inject dataSource from DB directly into store
            useStore.getState().setProjectData({
              ...archData,
              dataSource: result.chip.data_source
            });
            useStore.getState().setStilText(null); // Clear stale STIL text — inject will use projectDataJson
          } catch (e) {
            console.error("Hydration failed:", e);
          }
          // Trigger AI insight after hydration
          fetchAIInsight(result.chip, result.failedChains, result.failureDetails, 
            (() => { try { return typeof result.chip.project_data === 'string' ? JSON.parse(result.chip.project_data) : result.chip.project_data; } catch { return null; } })()
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chipId]);

  const fetchAIInsight = async (chip: any, failedChains: any[], failureDetails: any[], projectData: any) => {
    if (chip.status !== 'FAIL') return; // Only analyze failures
    setAiLoading(true);
    try {
      const failingFFs = failureDetails
        .slice(0, 20) // Cap to avoid huge prompts
        .map((d: any) => `${d.chain_name}:FF_${d.flip_flop_position}`);
      
      const resp = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipId: chip.id,
          data: {
            chipId: chip.chip_id,
            totalChains: chip.total_scan_chains,
            totalFFs: chip.total_flip_flops ?? 0,
            hasEDT: projectData?.hasEDT ?? false,
            failingCount: failedChains.length,
            totalFails: chip.mismatches,
            selectedChain: failedChains[0]?.chain_name ?? 'Unknown',
            failingFFs,
            rawStilSnippet: projectData?.rawStilSnippet ?? ''
          }
        })
      });
      if (!resp.ok) throw new Error('AI insight failed');
      const result = await resp.json();
      const parsed = typeof result.insight === 'string' ? JSON.parse(result.insight) : result.insight;
      setAiInsight({ ...parsed, source: result.source });
    } catch (e) {
      console.warn('AI insight unavailable:', e);
    } finally {
      setAiLoading(false);
    }
  };

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
                Status: {data.chip.status}
              </span>
              {data.chip.data_source && (
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                  data.chip.data_source === 'ATE_LOG' ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                  data.chip.data_source === 'INFERRED' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                  "bg-slate-500/10 border-slate-500/20 text-slate-500"
                )}>
                  <Database size={10} /> {data.chip.data_source.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-1 font-black flex items-center gap-2 uppercase tracking-widest">
              <span className="text-slate-700">BATCH:</span> {data.chip.batch_name ?? `Batch #${data.chip.batch_id}`}
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full" /> 
              <span className="flex items-center gap-1.5 text-cyan-500/80">
                <Terminal size={12} /> RECORDED: {data.chip.created_at ? new Date(data.chip.created_at).toLocaleString() : '—'}
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

            {/* AI Diagnostic Intelligence Panel */}
            {data.chip.status === 'FAIL' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 border border-indigo-500/20 rounded-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-indigo-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <Brain className="text-indigo-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        AI Diagnostic Intelligence
                        {aiInsight?.source && (
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest",
                            aiInsight.source === 'cache'
                              ? "bg-slate-800 text-slate-400 border-slate-700"
                              : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                          )}>
                            {aiInsight.source === 'cache' ? 'Cached' : 'Live AI'}
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">Groq LLM · llama-3.3-70b-versatile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchAIInsight(data.chip, data.failedChains, data.failureDetails,
                      (() => { try { return typeof data.chip.project_data === 'string' ? JSON.parse(data.chip.project_data) : data.chip.project_data; } catch { return null; } })()
                    )}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-lg transition-all disabled:opacity-40"
                  >
                    <RefreshCw size={12} className={cn(aiLoading && "animate-spin")} />
                    {aiLoading ? 'Analyzing...' : 'Re-analyze'}
                  </button>
                </div>

                <div className="p-6">
                  {aiLoading && !aiInsight && (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-4 bg-slate-800 rounded w-1/2" />
                      <div className="h-4 bg-slate-800 rounded w-5/6" />
                    </div>
                  )}

                  {!aiLoading && !aiInsight && (
                    <div className="flex items-center justify-center py-8 gap-3 text-slate-600">
                      <Brain size={20} />
                      <span className="text-xs font-black uppercase tracking-widest">AI analysis unavailable — check GROQ_API_KEY</span>
                    </div>
                  )}

                  {aiInsight && (
                    <div className="space-y-5">
                      {/* Summary */}
                      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                        <p className="text-xs text-slate-300 leading-relaxed">{aiInsight.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Root Cause */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert size={12} className="text-red-400" /> Root Cause</p>
                          <p className="text-sm font-bold text-red-300">{aiInsight.rootCause}</p>
                        </div>

                        {/* Confidence */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-400" /> Confidence</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${aiInsight.confidence ?? 0}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                            <span className="text-sm font-black text-white">{aiInsight.confidence}%</span>
                          </div>
                        </div>
                      </div>

                      {/* STIL Evidence */}
                      {aiInsight.stilEvidence && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5"><Terminal size={12} className="text-cyan-400" /> STIL Evidence</p>
                          <pre className="text-[10px] font-mono text-cyan-300 bg-slate-950 border border-slate-800 p-3 rounded-lg overflow-x-auto custom-scrollbar">
                            {aiInsight.stilEvidence}
                          </pre>
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {aiInsight.recommendedAction?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5"><Zap size={12} className="text-amber-400" /> Recommended Actions</p>
                          <ul className="space-y-1.5">
                            {aiInsight.recommendedAction.map((action: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-amber-500 font-black mt-0.5">→</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
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
    </motion.div>
  );
}
