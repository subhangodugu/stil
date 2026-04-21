import React, { useState } from 'react';
import { 
  ShieldCheck, LayoutGrid, Terminal, Cpu, 
  Layers, ListOrdered, Share2, Activity,
  Search, Info, AlertCircle, CheckCircle2,
  Brain, Wand2, Bot, Sparkles, MessageSquare,
  Settings, Code
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { AIConfigModal } from '../AIConfigModal';
import { BitstreamHighlighter } from './BitstreamHighlighter';

export default function DiagnosticAuditPanel() {
  const { projectData, aiConfig } = useStore();
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  if (!projectData) return (
    <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20">
      <Search size={48} className="text-slate-800 mb-4" />
      <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No Diagnostic Metadata Active</p>
    </div>
  );

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stilContent: projectData.rawStilSnippet,
          aiConfig: {
            apiKey: aiConfig.apiKey,
            model: aiConfig.model
          }
        })
      });
      const data = await response.json();
      setAuditResult(data);
    } catch (err) {
      console.error("Audit failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const debug = projectData.debugReport;
  const isExplicit = debug?.pinDetectionMode === 'explicit';

  return (
    <div className="space-y-8 pb-10">
      <AIConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

      {/* 1. Audit Header & AI Auditor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-full bg-emerald-500/5 blur-3xl rounded-full translate-x-32" />
           <div className="relative z-10">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                    Signal Integrity & Pin Mapping Audit
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsConfigOpen(true)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 rounded-xl border border-slate-700 transition-all"
                    title="AI Configuration"
                  >
                    <Settings size={14} />
                  </button>
                  <button 
                    onClick={handleRunAudit}
                    disabled={isAuditing}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 border border-indigo-400/20"
                  >
                    {isAuditing ? <Sparkles className="animate-spin" size={14} /> : <Brain size={14} />}
                    {isAuditing ? 'Auditing Architecture...' : 'Run AI STIL Audit'}
                  </button>
                </div>
             </div>
             <p className="text-sm text-slate-400 max-w-xl">
               The Industrial STIL Engine has performed a direction-aware signal sweep to identify deterministic scan-out pins.
             </p>
             
             <div className="mt-6 flex flex-wrap gap-4">
                <div className={cn(
                  "px-4 py-2 rounded-xl flex items-center gap-3 border transition-all",
                  isExplicit 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                )}>
                  {isExplicit ? <CheckCircle2 size={16} /> : <Info size={16} />}
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Mapping Mode</p>
                    <p className="text-xs font-black uppercase tracking-widest">{isExplicit ? 'Explicit (ScanStructures Verified)' : 'Heuristic (Signature Match)'}</p>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-400 flex items-center gap-3">
                  <Cpu size={16} />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Detected Signals</p>
                    <p className="text-xs font-black uppercase tracking-widest">{Object.keys(projectData.signals || {}).length} Base Pins</p>
                  </div>
                </div>
             </div>
           </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center">
           <AnimatePresence mode="wait">
             {!auditResult ? (
               <motion.div 
                 key="placeholder"
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="text-center"
               >
                 <Bot size={32} className="text-slate-700 mx-auto mb-3" />
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Auditor Pipeline Standby</p>
                 <p className="text-[9px] text-slate-600 mt-1">Ready to solve STIL architecture complexities</p>
               </motion.div>
             ) : (
               <motion.div 
                 key="result"
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                 className="space-y-4"
               >
                 <div className="flex items-center gap-2 text-indigo-400 mb-2">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Architectural Audit Complete</span>
                 </div>
                 <div className="space-y-3">
                    <AuditItem label="Architecture" value={auditResult.architecture} />
                    <AuditItem label="Test Mode" value={auditResult.testType} />
                    <AuditItem label="Compression" value={auditResult.compression} />
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {auditResult && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1 space-y-4">
                 <div>
                   <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Internal Procedure Intelligence</h4>
                   <p className="text-sm text-slate-400 leading-relaxed italic">
                     "{auditResult.procedureAnalysis}"
                   </p>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {auditResult.complianceFlags?.map((flag: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-slate-900 border border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest rounded-full">
                        {flag}
                      </span>
                    ))}
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 2. Execution Graph */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/20">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Terminal size={14} className="text-indigo-400" /> Deterministic Execution Graph
            </h4>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Serialized Order</span>
          </div>
          <div className="p-6 max-h-[400px] overflow-y-auto font-mono text-[11px] space-y-2 custom-scrollbar">
             {debug?.executionGraph?.length ? debug.executionGraph.map((log, i) => (
                <div key={i} className="flex gap-4 group">
                  <span className="text-slate-700 w-8 select-none">{(i+1).toString().padStart(3, '0')}</span>
                  <span className="text-slate-400 group-hover:text-white transition-colors capitalize">{log}</span>
                </div>
             )) : (
               <div className="text-slate-600 italic">No execution trace available for this batch.</div>
             )}
          </div>
        </div>

        {/* 3. Vector Breakdown */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl border-l-4 border-l-indigo-500">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Industrial Scalability Stats</h4>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-black text-white">Pattern Density</span>
                    <span className="text-[10px] text-slate-500">1:{(projectData.vectorCount / (projectData.patternCount || 1)).toFixed(0)} Vectors/Pat</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)]" style={{ width: '70%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-colors">
                       <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1.5">Test Patterns</p>
                       <p className="text-2xl font-black text-white leading-tight">{projectData.patternCount || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-colors">
                       <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1.5">Test Vectors</p>
                       <p className="text-2xl font-black text-indigo-400 leading-tight">{projectData.vectorCount || 0}</p>
                    </div>
                </div>
              </div>
           </div>

           <div className="bg-slate-900/40 border border-slate-800 rounded-2xl">
              <div className="p-4 border-b border-slate-800/50 font-black text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Search size={12} /> Mapping Engine Logs
              </div>
              <div className="p-4 h-[180px] overflow-y-auto font-mono text-[9px] space-y-2 opacity-60 custom-scrollbar">
                 {debug?.mappingLogs?.map((log, i) => (
                   <div key={i} className={cn(
                     "flex gap-2",
                     log.includes('ERROR') ? "text-red-400" : log.includes('WARN') ? "text-amber-400" : "text-slate-400"
                   )}>
                     <span className="shrink-0">›</span>
                     <span>{log}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>      {/* 4. Industrial Macro Registry - CONSOLIDATED TO MacroRegistryPanel.tsx */}
    </div>
  );
}

function StatItem({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest group-hover:text-slate-400 transition-colors">{label}</span>
      <span className={cn("text-xs font-black font-mono", color)}>{value}</span>
    </div>
  );
}

function AuditItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-[11px] font-bold text-white leading-snug">{value}</p>
    </div>
  );
}
