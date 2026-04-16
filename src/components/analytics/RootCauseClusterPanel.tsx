import React from 'react';
import { Layers, ShieldCheck, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  clusters: any[];
}

export const RootCauseClusterPanel: React.FC<Props> = ({ clusters }) => {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            Root Cause Clusters
            <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[8px]">Auto-Categorized</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Grouping chips by shared failure signatures</p>
        </div>
        <Layers className="text-indigo-500" size={20} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {clusters.length === 0 ? (
          <div className="col-span-full h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic border border-dashed border-slate-800 rounded-xl px-10 text-center">
            Run more tests to enable pattern-matching clustering...
          </div>
        ) : (
          clusters.map((cluster, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl hover:bg-slate-800/20 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Activity size={16} className="text-indigo-400" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">Group Population</span>
                  <span className="text-sm font-black text-white">{cluster.chipCount} Chips</span>
                </div>
              </div>

              <h4 className="text-xs font-black text-slate-200 uppercase tracking-tighter mb-1 line-clamp-1">
                {cluster.mode} 
              </h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-4">
                Primary Factor: {cluster.primaryChain}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                <span className="text-[10px] text-cyan-400 font-black flex items-center gap-1">
                  <ShieldCheck size={10} /> 94% Correlation
                </span>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      <div className="mt-6 p-4 bg-slate-800/10 border border-slate-800 rounded-xl text-[9px] text-slate-500 font-medium italic leading-relaxed">
        Algorithm: Heuristic clustering applied to top failing scan chains and mismatch logic types.
      </div>
    </div>
  );
};
