import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { 
    Activity, CheckCircle2, ChevronRight, 
    Cpu, Database, FileText, Loader2, Brain, AlertCircle 
} from 'lucide-react';
import { cn } from '../lib/utils';

export const IngestionMonitor: React.FC = () => {
    const { ingestionProgress, clearIngestion } = useStore();
    const { active, files } = ingestionProgress;

    if (!active) return null;

    const fileEntries = Object.entries(files);
    const completedCount = fileEntries.filter(([_, f]) => f.status === 'COMPLETE').length;
    const progress = (completedCount / fileEntries.length) * 100;

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-24 right-8 z-[200] w-[400px] bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
        >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Activity className="text-indigo-400" size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Smart Ingestion Monitor</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">AI-Assisted Diagnostic Batch</p>
                        </div>
                    </div>
                    {progress === 100 && (
                        <button onClick={clearIngestion} className="text-[10px] font-black text-slate-500 hover:text-white uppercase transition-colors">Clear</button>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Global Progress</span>
                        <span className="text-indigo-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <AnimatePresence mode="popLayout">
                    {fileEntries.map(([filename, f]) => (
                        <motion.div 
                            key={filename}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={cn(
                                "p-4 rounded-2xl border transition-all duration-500",
                                f.status === 'COMPLETE' ? "bg-emerald-500/5 border-emerald-500/20" : 
                                f.status === 'FAILED' ? "bg-red-500/5 border-red-500/20" :
                                "bg-slate-900/40 border-white/5"
                            )}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={14} className={f.status === 'COMPLETE' ? 'text-emerald-500' : 'text-slate-500'} />
                                    <span className="text-[11px] font-bold text-slate-300 truncate">{filename}</span>
                                </div>
                                {f.status === 'COMPLETE' ? (
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                ) : f.status === 'FAILED' ? (
                                    <AlertCircle size={14} className="text-red-500" />
                                ) : (
                                    <Loader2 size={14} className="text-indigo-500 animate-spin" />
                                )}
                            </div>

                            {/* Step Indicator */}
                            <div className="flex items-center gap-2">
                                <StepIcon status={f.status} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    {f.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* AI Insight Snippet */}
                            {f.details && f.status === 'AI_AUDIT' && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3"
                                >
                                    <Brain className="text-indigo-400 shrink-0" size={14} />
                                    <p className="text-[10px] text-indigo-300 leading-relaxed font-medium">
                                        {f.details.summary?.slice(0, 80)}...
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const StepIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'READING': return <FileText size={10} className="text-slate-600" />;
        case 'AI_AUDIT': return <Brain size={10} className="text-indigo-400 animate-pulse" />;
        case 'SIMULATING': return <Cpu size={10} className="text-cyan-400 animate-spin" />;
        case 'PERSISTING': return <Database size={10} className="text-amber-500" />;
        case 'COMPLETE': return <CheckCircle2 size={10} className="text-emerald-500" />;
        default: return <Activity size={10} className="text-slate-600" />;
    }
};
