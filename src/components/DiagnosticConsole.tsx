import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Terminal, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
}

export const DiagnosticConsole: React.FC = () => {
  const { projectData, failingFFs, generatedLog } = useStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info', module: string = 'SYSTEM') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      module,
      message
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  useEffect(() => {
    if (projectData) {
      addLog(`Silicon Map Initialized: ${projectData.totalFFs} flip-flops indexed`, 'success', 'PARSER');
      addLog(`EDT Compression: ${projectData.hasEDT ? 'Active' : 'Bypass'} mode detected`, 'info', 'STIL');
    }
  }, [projectData?.totalFFs]);

  useEffect(() => {
    const count = Object.keys(failingFFs).length;
    if (count > 0) {
      addLog(`Diagnostic correlation complete: ${count} bits localized`, 'success', 'ATE_SYNC');
    }
  }, [failingFFs]);

  useEffect(() => {
    if (generatedLog) {
      addLog(`Synthetic fail log exported (VCD/STDF compatible)`, 'info', 'INJECTION');
    }
  }, [generatedLog]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden h-[300px] flex flex-col font-mono shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative">
      <div className="absolute inset-0 pointer-events-none scanning-line opacity-30 z-0" />
      <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest">Diagnostic Kernel Log</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/20" />
          <div className="w-2 h-2 rounded-full bg-amber-500/20" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] flex gap-3 group"
            >
              <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
              <span className={cn(
                "font-black uppercase shrink-0 transition-all",
                log.type === 'success' ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                log.type === 'error' ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                log.type === 'warn' ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]",
                "group-hover:brightness-125"
              )}>
                {log.module.padEnd(8)}
              </span>
              <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{log.message}</span>
            </motion.div>
          ))}
          {logs.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-700 italic text-[10px]">
              Waiting for kernel telemetry data...
            </div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="px-4 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center gap-4 z-10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={10} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Kernel Secure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
          <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Link: Up</span>
        </div>
      </div>
    </div>
  );
};
