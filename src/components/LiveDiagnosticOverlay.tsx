import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { useStore } from '../store/useStore.js';

/**
 * Industrial Live Telemetry Overlay
 *
 * Displays real-time streaming diagnostics as vectors are processed by the ATE engine.
 * Provides a high-fidelity visualization of cycle-by-cycle industrial execution.
 */
export function LiveDiagnosticOverlay() {
  const { streamingMetrics } = useStore();
  const { isStreaming, currentCycle, currentPattern, mismatchCount } = streamingMetrics;

  return (
    <AnimatePresence>
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl"
        >
          <div className="mx-4 p-1 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-indigo-500/20 rounded-2xl backdrop-blur-2xl border border-white/10 shadow-2xl">
            <div className="bg-slate-950/80 rounded-xl p-6 relative overflow-hidden">
              
              {/* Background Activity Pulse */}
              <div className="absolute top-0 right-0 p-4 opacity-5 animate-pulse">
                <Activity size={120} className="text-cyan-500" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                
                {/* Engine Status */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center relative">
                    <Zap size={32} className="text-indigo-400 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-ping" />
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</p>
                     <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">Streaming</p>
                  </div>
                </div>

                {/* Live Telemetry */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Pattern</p>
                    <p className="text-lg font-black text-white truncate max-w-[120px]">{currentPattern}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tester Cycles</p>
                    <p className="text-lg font-black text-cyan-400 font-mono">
                      {currentCycle.toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Failure Bits</p>
                       {mismatchCount > 0 && <AlertCircle size={10} className="text-red-500" />}
                    </div>
                    <p className={`text-lg font-black font-mono transition-colors ${mismatchCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {mismatchCount}
                    </p>
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="hidden lg:flex w-24 flex-col items-center gap-2">
                   <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Accuracy</div>
                   <div className="relative w-12 h-12 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90">
                       <circle cx="24" cy="24" r="20" className="stroke-slate-800 fill-none" strokeWidth="4" />
                       <circle 
                         cx="24" cy="24" r="20" 
                         className="stroke-indigo-500 fill-none transition-all duration-500" 
                         strokeWidth="4" 
                         strokeDasharray={126}
                         strokeDashoffset={126 * (mismatchCount > 0 ? 0.05 : 0)} 
                       />
                     </svg>
                     <span className="absolute text-[10px] font-black text-white">99%</span>
                   </div>
                </div>

              </div>

              {/* Scan-Line Animation */}
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-indigo-500/30 overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                />
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
