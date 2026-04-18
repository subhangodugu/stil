import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { PassFailDonut } from '../components/dashboard/PassFailDonut';
import { MismatchBarChart } from '../components/dashboard/MismatchBarChart';
import { ChipGrid } from '../components/dashboard/ChipGrid';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { RefreshCcw, LayoutGrid, Terminal } from 'lucide-react';
import { ChipTestResult } from '../types/testerTypes';

export default function TesterDashboard() {
  const { dashboardChips, setDashboardChips, setLoading, setError, setViewMode, setProjectData, setFailingFFs } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchSummary = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/data/summary');
      if (!response.ok) throw new Error('Failed to fetch tester summary');
      const data = await response.json();
      setDashboardChips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleChipClick = async (chip: ChipTestResult) => {
    // Navigate to failure detail page for the specific chip
    navigate(`/chip/${chip.id}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <LayoutGrid className="text-cyan-500" size={28} />
            Tester Intelligence Center
          </h2>
          <p className="text-slate-500 text-sm mt-1">Real-time Pass/Fail analytics across multiple semiconductor batches</p>
        </div>
        
        <button 
          onClick={fetchSummary}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-all group"
        >
          <motion.div animate={isRefreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
            <RefreshCcw size={14} className="group-hover:text-cyan-400" />
          </motion.div>
          {isRefreshing ? 'Refreshing...' : 'Refresh Dashboard'}
        </button>
      </div>

      <SummaryCards chips={dashboardChips} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PassFailDonut chips={dashboardChips} />
        <MismatchBarChart chips={dashboardChips} />
      </div>

      <ChipGrid chips={dashboardChips} onChipClick={handleChipClick} onRefresh={fetchSummary} />
    </motion.div>
  );
}
