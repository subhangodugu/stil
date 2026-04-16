import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Activity, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  hotspots: any[];
}

export const FailureHotspotHeatmap: React.FC<Props> = ({ hotspots }) => {
  const maxMismatches = Math.max(...hotspots.map(h => h.totalMismatches), 1);

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          Global Failure Hotspots
          <span className="text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 text-[8px]">Intensity mapping</span>
        </h3>
        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Identifying repeating failure sites across all batches</p>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
        {hotspots.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">
            Initializing Intelligence Data...
          </div>
        ) : (
          hotspots.map((hotspot, i) => {
            const intensity = hotspot.totalMismatches / maxMismatches;
            
            return (
              <motion.div
                key={hotspot.chainName}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group p-3 bg-slate-950/30 border border-slate-800/50 rounded-xl hover:border-slate-700 transition-all"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className={cn(
                      intensity > 0.7 ? "text-red-500" : (intensity > 0.4 ? "text-amber-500" : "text-cyan-500")
                    )} />
                    <span className="text-xs font-black text-slate-300 truncate max-w-[150px]" title={hotspot.chainName}>
                      {hotspot.chainName}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-500">
                    {hotspot.chipCount} CHIPS IMPACTED
                  </span>
                </div>
                
                <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${intensity * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)]",
                      intensity > 0.7 ? "bg-gradient-to-r from-red-600 to-red-400" : (intensity > 0.4 ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-cyan-600 to-blue-500")
                    )}
                  />
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Global Persistence</span>
                  <span className={cn(
                    "text-[10px] font-black",
                    intensity > 0.7 ? "text-red-500" : "text-slate-400"
                  )}>
                    {hotspot.totalMismatches.toLocaleString()} MISMATCHES
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] border-t border-slate-800 pt-4">
        <Info size={10} />
        Heatmap intensity based on multi-chip cross-correlation
      </div>
    </div>
  );
};
