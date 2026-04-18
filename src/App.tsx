import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { ChainDetailModal } from './components/ChainDetailModal';
import { useStore } from './store/useStore';
import { useStreamingDiagnostic } from './hooks/useStreamingDiagnostic';
import { LiveDiagnosticOverlay } from './components/LiveDiagnosticOverlay';
import { AlertTriangle, Database, Activity, Zap, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TesterDashboard from './pages/TesterDashboard';
import FailureDetailView from './pages/FailureDetailView';
import IntelligenceView from './pages/IntelligenceView';
/** @version 3.0.0 - Streamlined routing — Dashboard-first architecture */

// --- MAIN APP ENTRY ---
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <MainLayout />
    </BrowserRouter>
  );
}

// --- MAIN LAYOUT ---
function MainLayout() {
  const { error, setProjectData, setFailingFFs, setLoading, reset, loading, setViewMode, setDashboardChips, setStilText } = useStore();
  const { startStreaming } = useStreamingDiagnostic();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="max-w-[1700px] mx-auto p-6 lg:p-10">
        <Header onStartStreaming={startStreaming} />
        <ChainDetailModal />
        <LiveDiagnosticOverlay />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertTriangle size={18} />
            <div className="flex flex-col">
              <span className="font-black uppercase tracking-widest text-[10px] opacity-70">Industrial System Error</span>
              <span className="mt-0.5">{error}</span>
            </div>
          </motion.div>
        )}

        <main className="space-y-8">
          <Routes>
            <Route path="/" element={
              <AnimatePresence mode="wait">
                <TesterDashboard key="dashboard" />
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

// --- LANDING PAGE (shown when dashboard has no chips) ---
export function LandingPage() {
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

function FeatureIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-slate-700">{icon}</div>
      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
