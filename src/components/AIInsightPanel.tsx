import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, Loader2, AlertCircle, Clock, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export interface ParsedInsight {
  summary?: string;
  rootCause?: string;
  confidence?: number;
  stilEvidence?: string;
  recommendedAction?: string[];
}

export const AIInsightPanel: React.FC = () => {
  const { projectData, failingFFs, selectedChain } = useStore();
  const [insightData, setInsightData] = useState<ParsedInsight | null>(null);
  const [rawInsight, setRawInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<{ source: string; generatedAt: string | null }>({ source: '', generatedAt: null });

  useEffect(() => {
    if (!projectData) return;
    
    const timer = setTimeout(() => {
      generateInsight();
    }, 400);

    return () => clearTimeout(timer);
  }, [projectData?.totalFFs, selectedChain?.name, Object.keys(failingFFs).length]);

  const generateInsight = async () => {
    if (!projectData) return;
    
    setLoading(true);
    try {
      const failingCount = Object.keys(failingFFs).length;
      const totalFails = Object.values(failingFFs).reduce((a, b) => a + b, 0);
      
      const diagnosticData = {
        chipId: projectData.scanChains?.[0]?.name || "UNKNOWN_UNIT", // Simplified ID for insight correlation
        totalChains: projectData.scanChains.length,
        totalFFs: projectData.totalFFs,
        hasEDT: projectData.hasEDT,
        failingCount,
        totalFails,
        selectedChain: selectedChain?.name || 'Global',
        failingFFs: Object.keys(failingFFs).slice(0, 50),
        rawStilSnippet: (projectData as any).rawStilSnippet,
        rawLogSnippet: (projectData as any).rawLogSnippet
      };

      const response = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chipId: diagnosticData.chipId,
          data: diagnosticData
        }),
      });

      if (!response.ok) throw new Error("AI Engine unreachable");

      const result = await response.json();
      
      try {
        const parsed = JSON.parse(result.insight);
        setInsightData(parsed);
        setRawInsight(null);
      } catch (e) {
        setRawInsight(result.insight || "Unable to parse AI Insight.");
        setInsightData(null);
      }
      
      setMetadata({ 
        source: result.source, 
        generatedAt: result.generatedAt ? new Date(result.generatedAt).toLocaleString() : null 
      });
    } catch (error) {
      console.error("AI Insight Error:", error);
      setRawInsight("Error generating AI insights. The diagnostic engine may be offline.");
      setInsightData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!projectData) return null;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-cyan-400">
          <Sparkles size={20} /> AI Diagnostic Insights
        </h3>
        <button 
          onClick={generateInsight}
          disabled={loading}
          className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-full border border-cyan-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Regenerate'}
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-slate-500 gap-4"
            >
              <Loader2 size={32} className="animate-spin text-cyan-500" />
              <p className="text-sm animate-pulse">Analyzing silicon failure patterns...</p>
            </motion.div>
          ) : insightData || rawInsight ? (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {insightData ? (
                 <div className="space-y-4">
                    <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                       <h4 className="text-cyan-400 font-medium mb-1">Root Cause Diagnosis (Conf: {insightData.confidence || 0}%)</h4>
                       <p className="text-slate-200 text-sm font-semibold">{insightData.rootCause}</p>
                       <p className="text-slate-400 text-xs mt-2">{insightData.summary}</p>
                    </div>
                    {insightData.stilEvidence && (
                       <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400 custom-scrollbar">
                          <div className="text-slate-500 mb-2 uppercase tracking-widest text-[10px] font-sans font-bold">Context Evidence</div>
                          <pre className="whitespace-pre-wrap break-all">{insightData.stilEvidence}</pre>
                       </div>
                    )}
                    {insightData.recommendedAction && insightData.recommendedAction.length > 0 && (
                       <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                          <h4 className="text-cyan-400 text-sm font-medium mb-2">Recommended FA Action</h4>
                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                             {insightData.recommendedAction.map((act, i) => <li key={i}>{act}</li>)}
                          </ul>
                       </div>
                    )}
                 </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                    {rawInsight}
                  </div>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                  metadata.source === 'cache' ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  {metadata.source === 'cache' ? <Database size={10} /> : <Sparkles size={10} />}
                  {metadata.source === 'cache' ? 'Cached Diagnostic' : 'Fresh Analysis'}
                </div>
                {metadata.generatedAt && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={10} />
                    {metadata.generatedAt}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center px-4">
              <AlertCircle size={40} className="mb-4 opacity-20" />
              <p className="text-sm">Click regenerate to trigger AI-powered failure analysis based on current scan data.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
