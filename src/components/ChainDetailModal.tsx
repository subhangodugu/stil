import React from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, AlertTriangle, FileText, Search } from 'lucide-react';
import { ScanChainVisualizer } from './ScanChainVisualizer';

export const ChainDetailModal: React.FC = () => {
  const { selectedChain, setSelectedChain, failingFFs, projectData } = useStore();

  if (!selectedChain) return null;

  const failingCount = selectedChain.ffs.filter(ff => failingFFs[ff.id]).length;
  const fault = projectData?.faults?.find(f => f.channel === selectedChain.name);

  return (
    <AnimatePresence>
      {selectedChain && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedChain(null)}
            className="absolute inset-0 bg-[#050a14]/90 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl">
                  <Activity size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Chain Diagnostics: <span className="text-cyan-400">{selectedChain.name}</span>
                  </h2>
                  <div className="flex gap-4 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <FileText size={10} /> {selectedChain.length} Bits
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <AlertTriangle size={10} className={failingCount > 0 ? "text-amber-500" : "text-slate-500"} /> 
                      {failingCount} Failing FFs
                    </span>
                    {fault && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={10} /> Localized {fault.faultType} @ {fault.ff}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedChain(null)}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#0a0f18]/50">
              <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <LegendItem color="bg-slate-800" label="Healthy" />
                  <LegendItem color="bg-cyan-500" label="Low Fail" />
                  <LegendItem color="bg-red-500" label="Critical" />
                  <LegendItem color="bg-[#ff0000]" label="Root Fault" />
                  <LegendItem color="bg-orange-500" label="Propagation" />
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search FF Index..." 
                    className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-cyan-500 transition-all w-48"
                  />
                </div>
              </div>

              <ScanChainVisualizer chain={selectedChain} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedChain(null)}
                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Close Diagnostic
              </button>
              <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-900/20">
                Export Chain Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
