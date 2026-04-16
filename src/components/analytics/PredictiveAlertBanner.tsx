import React from 'react';
import { ShieldAlert, Bell, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  alerts: any[];
}

export const PredictiveAlertBanner: React.FC<Props> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      <AnimatePresence>
        {alerts.map((alert, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-2xl p-4 overflow-hidden"
          >
            {/* Pulsing Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-full bg-[#ef4444]/10 blur-3xl rounded-full translate-x-10 animate-pulse" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80">Predictive Intelligence Alert</span>
                    <span className="w-1 h-1 bg-red-500/50 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 line-clamp-1">SYSTEM_HEALTH_MONITOR</span>
                  </div>
                  <h4 className="text-sm font-black text-white mt-0.5 tracking-tight group-hover:text-red-400 transition-colors">
                    {alert.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Confidence</span>
                  <span className="text-xs font-black text-red-500">92.4%</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-400 transition-all shadow-lg shadow-red-900/20">
                  Execute Audit <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
