import React from 'react';
import { 
  ShieldCheck, LayoutGrid, Terminal, Cpu, 
  Layers, ListOrdered, Share2, Activity,
  Search, Info, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function DiagnosticAuditPanel() {
  const { projectData } = useStore();

  if (!projectData) return (
    <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20">
      <Search size={48} className="text-slate-800 mb-4" />
      <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No Diagnostic Metadata Active</p>
    </div>
  );

  const debug = projectData.debugReport;
  const isExplicit = debug?.pinDetectionMode === 'explicit';

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Audit Header & Pin Mapping Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-full bg-emerald-500/5 blur-3xl rounded-full translate-x-32" />
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Signal Integrity & Pin Mapping Audit</h3>
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

        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
             <Activity size={14} /> Expansion Efficiency
           </h4>
           <div className="space-y-4">
              <StatItem label="Bursts Found" value={debug?.patternBurstsFound || 0} />
              <StatItem label="Procedures Resolved" value={debug?.proceduresFound || 0} />
              <StatItem label="Memoization Hits" value="ACTIVE" color="text-emerald-500" />
           </div>
        </div>
      </div>

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
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Test Patterns</p>
                      <p className="text-xl font-black text-white leading-tight">{projectData.patternCount || 0}</p>
                   </div>
                   <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Test Vectors</p>
                      <p className="text-xl font-black text-indigo-400 leading-tight">{projectData.vectorCount || 0}</p>
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
      </div>
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
