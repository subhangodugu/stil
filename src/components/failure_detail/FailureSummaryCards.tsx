import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Hash, Zap, Target } from 'lucide-react';

interface Props {
  chip: any;
  details: any[];
  failedChains: any[];
}

export default function FailureSummaryCards({ chip, details, failedChains }: Props) {
  const worstChain = [...failedChains].sort((a, b) => b.mismatch_count - a.mismatch_count)[0];
  
  const cards = [
    {
      label: 'Worst Chain',
      value: worstChain ? worstChain.chain_name : 'None',
      sub: worstChain ? `${worstChain.mismatch_count} fails` : '0 fails',
      icon: <AlertTriangle className="text-red-500" size={20} />,
      color: 'border-red-500/20'
    },
    {
      label: 'First Fail Pattern',
      value: chip.first_fail_pattern || 'N/A',
      sub: 'Point of intersection',
      icon: <Hash className="text-amber-500" size={20} />,
      color: 'border-amber-500/20'
    },
    {
      label: 'Failing Chains',
      value: failedChains.length.toString(),
      sub: `of ${chip.total_scan_chains} total`,
      icon: <Zap className="text-purple-500" size={20} />,
      color: 'border-purple-500/20'
    },
    {
      label: 'Diagnostic Depth',
      value: chip.total_flip_flops.toLocaleString(),
      sub: 'Total bits analyzed',
      icon: <Target className="text-blue-500" size={20} />,
      color: 'border-blue-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`bg-slate-900/40 border ${card.color} p-5 rounded-2xl flex items-center gap-5`}
        >
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{card.label}</p>
            <p className="text-xl font-black text-white truncate" title={card.value}>{card.value}</p>
            <p className="text-[10px] text-slate-600 font-bold uppercase mt-1 truncate">{card.sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
