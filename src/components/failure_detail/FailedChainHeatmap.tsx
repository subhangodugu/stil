import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  failedChains: any[];
  allChainsCount: number;
}

export default function FailedChainHeatmap({ failedChains, allChainsCount }: Props) {
  // We'll render a grid of squares representing all chains.
  // Failed ones will be red, healthy ones will be green/blue.
  
  // 1. Map existing failures by their name
  const failedMap = new Map<string, number>();
  failedChains.forEach(fc => failedMap.set(fc.name, fc.mismatchCount));
  
  // 2. Identify all failed chains (the ones passed in)
  const failedList = failedChains.map(fc => ({
    name: fc.name,
    failCount: fc.mismatchCount
  }));

  // 3. Fill the rest with healthy chains up to total count
  const healthyCount = Math.max(0, allChainsCount - failedList.length);
  const healthyList = Array.from({ length: healthyCount }, (_, i) => ({
    name: `Chain_${failedList.length + i}`,
    failCount: 0
  }));

  const chains = [...failedList, ...healthyList];

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <LayoutGrid className="text-red-500" size={16} />
          Failed Chain Heatmap
        </h3>
        <span className="text-[10px] text-slate-500 font-bold uppercase">{allChainsCount} Total Chains</span>
      </div>

      <div className="grid grid-cols-10 gap-2">
        {chains.map((chain, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.005 }}
            className={cn(
              "aspect-square rounded shadow-sm relative group",
              chain.failCount > 0 
                ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" 
                : "bg-slate-800/50 border border-slate-800"
            )}
            title={`${chain.name}: ${chain.failCount} fails`}
          >
            {chain.failCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 rounded">
                <span className="text-[8px] font-black text-white">{chain.failCount}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-800/50 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-800" />
          <span className="text-[8px] text-slate-500 font-black uppercase">Functional</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[8px] text-slate-500 font-black uppercase">Failing</span>
        </div>
      </div>
    </div>
  );
}
