import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Header } from './components/Header';
import { HardwareTopology } from './components/HardwareTopology';
import { ScanChainVisualizer } from './components/ScanChainVisualizer';
import { ChainDetailModal } from './components/ChainDetailModal';
import { HeatmapLegend } from './components/HeatmapLegend';
import { FaultInjectionPanel } from './components/FaultInjectionPanel';
import { DiagnosticConsole } from './components/DiagnosticConsole';
import { useStore } from './store/useStore';
import { 
  Activity, AlertTriangle, FileText, Search, 
  Download, Share2, Database, LayoutGrid, 
  Zap, LayoutDashboard 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import TesterDashboard from './pages/TesterDashboard';
import FailureDetailView from './pages/FailureDetailView';
import IntelligenceView from './pages/IntelligenceView';
/** @version 2.0.1 - Integrated routing */

// --- STAT CARD PROPS ---
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'critical' | 'stable';
  isLive?: boolean;
}

// --- MAIN APP ENTRY ---
export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}

// --- MAIN LAYOUT ---
function MainLayout() {
  const { projectData, failingFFs, error, viewMode, setViewMode } = useStore();
  const navigate = useNavigate();

  const failingCount = Object.keys(failingFFs).length;
  const failRate = projectData?.totalFFs ? ((failingCount / projectData.totalFFs) * 100).toFixed(2) : '0.00';
  
  const logStatus = failingCount > 0 ? "Correlated" : "No Data";
  const logSubValue = failingCount > 0 ? `${failingCount} FFs Failure-Mapped` : "Waiting for ATE Input";

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="max-w-[1700px] mx-auto p-6 lg:p-10">
        <Header />

        <ChainDetailModal />

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertTriangle size={18} />
            {error}
          </motion.div>
        )}

        <main className="space-y-8">
          <Routes>
            <Route path="/" element={
              <AnimatePresence mode="wait">
                {viewMode === 'dashboard' ? (
                  <TesterDashboard key="dashboard" />
                ) : projectData ? (
                  <motion.div 
                    key="analysis"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    <AnalysisView 
                      failRate={failRate} 
                      failingCount={failingCount} 
                      projectData={projectData} 
                      logStatus={logStatus} 
                      logSubValue={logSubValue}
                    />
                  </motion.div>
                ) : (
                  <LandingPage />
                )}
              </AnimatePresence>
            } />
            <Route path="/chip/:chipId" element={<FailureDetailView />} />
            <Route path="/analytics" element={<IntelligenceView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// --- ANALYSIS VIEW ---
function AnalysisView({ failRate, failingCount, projectData, logStatus, logSubValue }: any) {
  const { viewMode, setViewMode, selectedChain, setSelectedChain } = useStore();
  
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          icon={<Activity className="text-cyan-400" size={20} />} 
          label="Failure Rate" 
          value={`${failRate}%`}
          trend={Number(failRate) > 5 ? 'critical' : 'stable'}
          isLive={failingCount > 0}
        />
        <StatCard 
          icon={<AlertTriangle className="text-amber-400" size={20} />} 
          label="Failing FFs" 
          value={failingCount > 0 ? failingCount.toLocaleString() : "0"}
          subValue={projectData.totalFFs ? `of ${projectData.totalFFs.toLocaleString()} bits` : "Processing..."}
          isLive={failingCount > 0}
        />
        <StatCard 
          icon={<FileText className="text-blue-400" size={20} />} 
          label="Scan Chains" 
          value={projectData.scanChains.length.toString()}
          subValue={projectData.hasEDT ? "EDT Active" : "Serial Mode"}
        />
        <StatCard 
          icon={<Download className={cn("transition-all", failingCount > 0 ? "text-emerald-400" : "text-slate-500")} size={20} />} 
          label="ATE Log Status" 
          value={logStatus}
          subValue={logSubValue}
          trend={failingCount > 0 ? 'stable' : undefined}
          isLive={failingCount > 0}
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 space-y-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between bg-slate-900/40 backdrop-blur-md border border-slate-800 p-2 rounded-xl">
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode('topology')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'topology' ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                )}
              >
                <LayoutGrid size={14} /> Architecture Topology
              </button>
              <button 
                onClick={() => setViewMode('schematic')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'schematic' ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                )}
              >
                <Share2 size={14} className="inline mr-2" /> FF Chain Schematic
              </button>
              <button 
                onClick={() => setViewMode('injection')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'injection' ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                )}
              >
                <Zap size={14} className="inline mr-2" /> Fault Injection
              </button>
            </div>
            {selectedChain && (
              <div className="flex items-center gap-4 px-4">
                <span className="text-xs font-mono text-cyan-400 font-bold">{selectedChain.name} Selected</span>
                <button onClick={() => setSelectedChain(null)} className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-bold">Clear Selection</button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'topology' ? (
              <motion.div
                key="topology"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <HardwareTopology />
              </motion.div>
            ) : viewMode === 'schematic' ? (
              <motion.div
                key="schematic"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      {selectedChain ? (
                        <>
                          <span className="text-cyan-500">CH {(projectData.scanChains.findIndex((c: any) => c.name === selectedChain.name) + 1).toString().padStart(2, '0')}</span>
                          <span className="text-slate-400">/</span>
                          {selectedChain.name}
                        </>
                      ) : 'Global Heatmap Overview'}
                      {selectedChain && <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-400">{selectedChain.length} bits</span>}
                    </h3>
                  </div>
                </div>
                {selectedChain ? (
                  <ScanChainVisualizer chain={selectedChain} />
                ) : (
                  <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20">
                    <Search size={48} className="text-slate-800 mb-4" />
                    <p className="text-slate-500 font-medium">Select a scan chain from the topology to visualize</p>
                  </div>
                )}
              </motion.div>
            ) : viewMode === 'injection' ? (
              <motion.div
                key="injection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <FaultInjectionPanel />
              </motion.div>
            ) : null}
          </AnimatePresence>
          
          <div className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <HeatmapLegend />
            </div>
            <div className="md:col-span-3">
              <DiagnosticConsole />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- LANDING PAGE ---
function LandingPage() {
  return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-1000">
      <div className="w-24 h-24 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center justify-center mb-4">
        <Database size={48} className="text-cyan-500" />
      </div>
      <div>
        <h2 className="text-4xl font-black text-white mb-4">Ready for Analysis</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Upload your STIL architecture file and optional ATE failure logs to generate a full diagnostic report and silicon heatmap.
        </p>
      </div>
      <div className="flex gap-12 items-center justify-center pt-8 border-t border-white/5 w-full max-w-2xl">
        <FeatureIcon icon={<Activity size={24} />} label="Heatmap" />
        <FeatureIcon icon={<AlertTriangle size={24} />} label="Faults" />
        <FeatureIcon icon={<Download size={24} />} label="Reports" />
        <FeatureIcon icon={<Zap size={24} />} label="Simulation" />
      </div>
    </div>
  );
}

// --- HELPERS ---
function StatCard({ icon, label, value, subValue, trend, isLive }: StatCardProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-5 rounded-2xl flex items-center gap-5 group hover:border-slate-700 transition-all relative overflow-hidden">
      {isLive && (
        <div className="absolute top-0 right-0 p-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
      )}
      <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <motion.p 
            key={value}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-black text-white tracking-tight"
          >
            {value}
          </motion.p>
          {trend && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
              trend === 'critical' ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
            )}>
              {trend}
            </span>
          )}
        </div>
        {subValue && <p className="text-[10px] text-slate-600 font-medium mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)}></div>
      <span className="text-[10px] text-slate-500 font-bold uppercase">{label}</span>
    </div>
  );
}

function FeatureIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-slate-700">{icon}</div>
      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
