import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Brain, Activity, 
  RefreshCcw, ShieldAlert, Database,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../store/useStore';

// Components
import { YieldTrendChart } from '../components/analytics/YieldTrendChart';
import { FailureHotspotHeatmap } from '../components/analytics/FailureHotspotHeatmap';
import { RootCauseClusterPanel } from '../components/analytics/RootCauseClusterPanel';
import { PatternWeaknessChart } from '../components/analytics/PatternWeaknessChart';
import { PredictiveAlertBanner } from '../components/analytics/PredictiveAlertBanner';
import { BatchComparisonView } from '../components/analytics/BatchComparisonView';

export default function IntelligenceView() {
  const { analyticsData, setAnalyticsData, setError } = useStore();
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [trendResp, hotspotResp, causeResp] = await Promise.all([
        fetch('/api/analytics/yield-trend'),
        fetch('/api/analytics/hotspots'),
        fetch('/api/analytics/root-causes')
      ]);

      if (!trendResp.ok || !hotspotResp.ok || !causeResp.ok) {
        throw new Error("Some intelligence data failed to synchronize.");
      }

      const trend = await trendResp.json();
      const hotspotsData = await hotspotResp.json();
      const clusters = await causeResp.json();

      setAnalyticsData({
        yieldTrend: trend,
        hotspots: hotspotsData.hotspots,
        patterns: hotspotsData.patterns,
        clusters: clusters
      });

      // Fetch comparison for latest 2 batches
      if (trend.length >= 2) {
        const idA = trend[trend.length - 2].batchId;
        const idB = trend[trend.length - 1].batchId;
        const compResp = await fetch(`/api/analytics/compare/${idA}/${idB}`);
        if (compResp.ok) {
          const compData = await compResp.json();
          setComparison(compData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const alerts = [];
  if (analyticsData.yieldTrend.length > 1) {
    const latest = analyticsData.yieldTrend[analyticsData.yieldTrend.length - 1];
    const prev = analyticsData.yieldTrend[analyticsData.yieldTrend.length - 2];
    if (latest.avgYield < prev.avgYield - 2) {
      alerts.push({ 
        title: `Systemic Yield Regression: ${latest.batchName} dropped by ${(prev.avgYield - latest.avgYield).toFixed(1)}% compared to baseline.` 
      });
    }
  }
  if (analyticsData.hotspots.some(h => h.chipCount > 5)) {
    const worst = analyticsData.hotspots.sort((a,b) => b.chipCount - a.chipCount)[0];
    alerts.push({ 
      title: `Systemic Hotspot Detected: Chain "${worst.chainName}" failing in multiple chips across batches.` 
    });
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="w-16 h-16 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 flex items-center justify-center text-indigo-400"
        >
          <Brain size={32} />
        </motion.div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] animate-pulse">Running Root-Cause Analytics Engine...</p>
          <p className="text-xs text-slate-600 mt-2 font-medium italic">Synchronizing cross-batch failure signatures</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20"
    >
      {/* Header Info */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
            <span className="p-2 bg-indigo-600 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <BarChart3 className="text-white" size={24} />
            </span>
            Advanced Tester Intelligence
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Auto-Clustering & Predictive Root-Cause Analysis (Build 2.0-PHASE-3)</p>
        </div>

        <button 
          onClick={fetchAnalytics}
          className="group flex items-center gap-3 px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-600 transition-all shadow-xl"
        >
          <RefreshCcw size={16} className="text-slate-500 group-hover:text-indigo-400 group-hover:rotate-180 transition-all duration-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Refresh Analytics</span>
        </button>
      </div>

      <PredictiveAlertBanner alerts={alerts} />

      {/* Grid Layer 1: Trend & Hotspots */}
      <div className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 xl:col-span-8">
          <YieldTrendChart data={analyticsData.yieldTrend} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <BatchComparisonView comparison={comparison} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 xl:col-span-8">
          <RootCauseClusterPanel clusters={analyticsData.clusters} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <FailureHotspotHeatmap hotspots={analyticsData.hotspots} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12">
          <PatternWeaknessChart patterns={analyticsData.patterns} />
        </div>
      </div>

      {/* Footer Industrial Decoration */}
      <div className="mt-16 pt-10 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer hover:text-indigo-400 transition-colors">
            <Database size={14} /> PERSISTENT_RECORDS: {analyticsData.yieldTrend.length} BATCHES
          </div>
          <span className="w-1 h-1 bg-slate-800 rounded-full" />
          <div className="flex items-center gap-2 group cursor-pointer hover:text-indigo-400 transition-colors">
            <Brain size={14} /> INFERENCE_ENGINE: STABLE
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
          <span className="text-slate-500">Cross-Batch Delta:</span>
          <span className="text-emerald-500 flex items-center gap-1">
            +0.4% Improvement <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
