import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AIInsightPanel: React.FC = () => {
  const { projectData, failingFFs, selectedChain } = useStore();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      const failingCount = Object.keys(failingFFs).length;
      const totalFails = Object.values(failingFFs).reduce((a, b) => a + b, 0);
      
      const prompt = `
        You are an expert Semiconductor Diagnostic Engineer. 
        Analyze the following scan diagnostic data and provide a professional insight.
        
        DATA:
        - Total Scan Chains: ${projectData.scanChains.length}
        - Total Flip-Flops: ${projectData.totalFFs}
        - Compression (EDT): ${projectData.hasEDT ? 'Enabled' : 'Disabled'}
        - Failing Flip-Flops: ${failingCount}
        - Total Failure Events: ${totalFails}
        - Targeted Chain: ${selectedChain?.name || 'Global'}
        - Failing FF IDs: ${Object.keys(failingFFs).slice(0, 20).join(', ')}${failingCount > 20 ? '...' : ''}
        
        TASK:
        1. Identify the most probable root cause (Stuck-at-0, Stuck-at-1, Chain Break, or Intermittent).
        2. Suggest physical failure sources (e.g., metal short, via open).
        3. Provide a confidence score (0-100%).
        4. Give a repair/debug recommendation.
        
        Format the output as a clean, structured report with professional EDA terminology.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      setInsight(response.text || "Unable to generate insight.");
    } catch (error) {
      console.error("AI Insight Error:", error);
      setInsight("Error generating AI insights. Please check your API configuration.");
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
          ) : insight ? (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-invert prose-sm max-w-none"
            >
              <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                {insight}
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
