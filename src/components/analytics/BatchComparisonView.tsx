import React from 'react';
import { GitCompare, ArrowUpRight, ArrowDownRight, Hash, AlertTriangle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Props {
  comparison: any;
}

export const BatchComparisonView: React.FC<Props> = ({ comparison }) => {
  if (!comparison) return null;

  const { batchA, batchB, delta, newHotspots } = comparison;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            Batch-to-Batch Delta
            <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[8px]">Intelligence Probe</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Compare metrics between two upload sessions</p>
        </div>
        <GitCompare className="text-indigo-500" size={20} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5 border-l border-b border-slate-700 rounded-bl-xl group-hover:opacity-10 transition-opacity">
            <Hash size={40} />
          </div>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">REFERENCE BATCH</span>
          <h4 className="text-[10px] font-black text-white truncate mb-2">{batchA.name}</h4>
          <span className="text-xl font-black text-slate-300">{batchA.yield}%</span>
        </div>
        
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5 border-l border-b border-slate-700 rounded-bl-xl group-hover:opacity-10 transition-opacity">
            <Activity size={40} />
          </div>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">COMPARISON BATCH</span>
          <h4 className="text-[10px] font-black text-white truncate mb-2">{batchB.name}</h4>
          <span className={cn(
            "text-xl font-black",
            delta >= 0 ? "text-emerald-400" : "text-red-400"
          )}>{batchB.yield}%</span>
        </div>
      </div>

      {/* Delta Performance Card */}
      <div className={cn(
        "p-5 rounded-2xl border mb-6 flex items-center justify-between",
        delta >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
      )}>
        <div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Yield Variance</p>
          <p className={cn(
            "text-2xl font-black flex items-center gap-2",
            delta >= 0 ? "text-emerald-500" : "text-red-500"
          )}>
            {delta > 0 ? <ArrowUpRight /> : <ArrowDownRight />}
            {delta > 0 ? `+${delta}` : delta}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Stability Status</p>
          <span className={cn(
            "text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest",
            delta >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          )}>
            {delta >= 0 ? 'OPTIMIZED' : 'REGRESSION'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 pt-4 border-t border-slate-800">
          <AlertTriangle size={12} className="text-amber-500" />
          Shift Discovery ({newHotspots.length})
        </h4>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
          {newHotspots.length === 0 ? (
            <p className="text-[10px] text-slate-600 font-medium italic">No new failure modes detected in this comparison.</p>
          ) : (
            newHotspots.map((h: string, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 bg-slate-900 border border-slate-800 rounded-lg group hover:border-amber-500/30 transition-all">
                <span className="text-[10px] text-slate-300 font-bold uppercase truncate max-w-[140px]">{h}</span>
                <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 font-black">NEW_MODE</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
