import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpRight, ChevronRight, AlertCircle, CheckCircle2, Trash2, BarChart3, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChipTestResult } from '../../types/testerTypes';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

interface ChipGridProps {
  chips: ChipTestResult[];
  onChipClick: (chip: ChipTestResult) => void;
  onRefresh?: () => void;
}

export const ChipGrid: React.FC<ChipGridProps> = ({ chips, onChipClick, onRefresh }) => {
  const { setError } = useStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete record "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/data/purge/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to delete record");
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  const filteredChips = chips.filter(chip => {
    const matchesSearch = chip.chip_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || chip.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <ArrowUpRight className="text-slate-500" size={20} />
          Tester Result Grid
        </h3>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search Chip ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <div className="flex bg-slate-900/50 border border-slate-800 rounded-xl p-1 shrink-0">
            {(['ALL', 'PASS', 'FAIL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  filter === f ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredChips.map((chip, i) => (
            <motion.div
              key={chip.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onChipClick(chip)}
              className={cn(
                "bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-5 cursor-pointer hover:bg-slate-800/60 transition-all group relative overflow-hidden",
                chip.status === 'FAIL' && "hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              )}
            >
              {chip.status === 'FAIL' && (
                <div className="absolute top-0 right-0 p-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping opacity-75" />
                  <div className="w-2 h-2 bg-red-500 rounded-full absolute top-3 right-3 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                </div>
              )}

              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-bold tracking-tight mb-1 group-hover:text-cyan-400 transition-colors truncate" title={chip.chip_id}>
                    {chip.chip_id}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono truncate" title={chip.batch_name || `Batch ID: ${chip.batch_id}`}>
                    {chip.batch_name || `Batch ID: ${chip.batch_id}`}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-slate-600 font-black uppercase tracking-widest shrink-0">
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    REC: {new Date(chip.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={(e) => handleDelete(e, chip.id!, chip.chip_id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/20"
                    title="Purge Record"
                  >
                    <Trash2 size={18} />
                  </button>
                  {chip.status === 'PASS' ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Yield</span>
                  <span className={cn("text-xs font-black", chip.status === 'PASS' ? "text-emerald-400" : "text-red-400")}>
                    {chip.yield_percent}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Mismatches</span>
                  <span className="text-xs font-mono text-white">{chip.mismatches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Patterns</span>
                  <span className="text-xs font-mono text-white">{(chip.total_patterns || chip.resolved_patterns).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Vectors</span>
                  <span className="text-xs font-mono text-indigo-400">{(chip.total_vectors || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Accuracy</span>
                  <span className={`text-xs font-black ${chip.accuracy != null ? (chip.accuracy >= 99 ? 'text-emerald-400' : chip.accuracy >= 95 ? 'text-amber-400' : 'text-red-400') : 'text-slate-600'}`}>
                    {chip.accuracy != null ? `${Number(chip.accuracy).toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                {chip.status === 'FAIL' && chip.first_fail_pattern && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-amber-500/80 uppercase font-bold tracking-widest">First Fail</span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold truncate max-w-[100px]" title={chip.first_fail_pattern}>
                      {chip.first_fail_pattern}
                    </span>
                  </div>
                )}
                {chip.data_source && (
                   <div className="flex justify-between items-center pt-1">
                     <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Source</span>
                     <span className={cn(
                       "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border",
                       chip.data_source === 'ATE_LOG' ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
                       chip.data_source === 'INFERRED' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                       "bg-slate-500/10 border-slate-500/20 text-slate-500"
                     )}>
                       {chip.data_source.replace('_', ' ')}
                     </span>
                   </div>
                )}
              </div>

              {chip.failedChains.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <div className="flex flex-wrap gap-1.5">
                    {chip.failedChains.slice(0, 3).map(chain => (
                      <span key={chain} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[8px] text-red-400 font-bold uppercase truncate max-w-[120px]" title={chain}>
                        {chain}
                      </span>
                    ))}
                    {chip.failedChains.length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[8px] text-slate-400 font-bold uppercase">
                        + {chip.failedChains.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] group-hover:text-cyan-400 transition-colors">
                View Forensic Details
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredChips.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
          <p className="text-slate-500 font-medium">No results found matching your criteria</p>
        </div>
      )}
    </div>
  );
};
