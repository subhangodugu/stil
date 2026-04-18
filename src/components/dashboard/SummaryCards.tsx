import React from 'react';
import { Activity, CheckCircle2, XCircle, Percent, Hash, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChipTestResult } from '../../types/testerTypes';

interface SummaryCardsProps {
  chips: ChipTestResult[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ chips }) => {
  const total = chips.length;
  const passed = chips.filter(c => c.status === 'PASS').length;
  const failed = chips.filter(c => c.status === 'FAIL').length;
  const yieldPercent = total > 0 ? ((passed / total) * 100).toFixed(2) : '0';
  const avgMismatches = total > 0 ? (chips.reduce((acc, c) => acc + c.mismatches, 0) / total).toFixed(1) : '0';

  // Accuracy: average over all chips, defaulting to 100 for PASS results without specific metrics
  const avgAccuracy = total > 0
    ? (chips.reduce((sum, c) => sum + (c.accuracy ?? 100), 0) / total).toFixed(2)
    : '0.00';

  const stats = [
    { label: 'Total Tested', value: total, icon: Hash, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Passed', value: passed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Failed', value: failed, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Yield', value: `${yieldPercent}%`, icon: Percent, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Avg Accuracy', value: avgAccuracy ? `${avgAccuracy}%` : 'N/A', icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Avg Mismatches', value: avgMismatches, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-5 rounded-2xl group hover:border-slate-700 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
