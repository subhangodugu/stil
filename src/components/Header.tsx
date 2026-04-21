import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Database, FileText, Trash2, RefreshCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export const Header: React.FC<{ onStartStreaming?: (parsed: any, logMap?: any) => void }> = ({ onStartStreaming }) => {
  const { 
    setProjectData, setFailingFFs, setLoading, 
    reset, loading, setViewMode, setDashboardChips, setStilText
  } = useStore();
  const navigate = useNavigate();
  const stilInputRef = useRef<HTMLInputElement>(null);
  const logInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    const stilFile = stilInputRef.current?.files?.[0];
    const logFile = logInputRef.current?.files?.[0];

    if (!stilFile) {
      toast.error("Industrial Error: STIL file required for architecture mapping");
      return;
    }

    const toastId = toast.loading("Executing Diagnostic Pipeline...");
    setLoading(true);

    // Store raw STIL text so FaultInjectionPanel can use it without re-uploading
    const stilRawText = await stilFile.text();
    setStilText(stilRawText);

    const formData = new FormData();
    formData.append('stil', stilFile);
    if (logFile) formData.append('failLog', logFile);

    try {
      const resp = await fetch('/api/uploads/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await resp.json();
      
      // Update store with full scanned architecture and failure heatmap
      setProjectData(data.projectData);
      setFailingFFs(data.failingFFs);

      // Trigger Real-Time Streaming Diagnostic if supported
      if (onStartStreaming && data.projectData) {
        onStartStreaming(data.projectData, {});
      }

      // Refresh dashboard background data
      const summaryResp = await fetch('/api/data/summary');
      if (summaryResp.ok) {
        const summaryData = await summaryResp.json();
        setDashboardChips(summaryData);
      }

      toast.success("Pipeline Executed: Deterministic Faults Mapped", { id: toastId });
      
      // Navigate to the detail view for immediate transparency on "scanned data"
      if (data.chipResult?.id) {
        navigate(`/chip/${data.chipResult.id}`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast.error(`System Failure: ${err.message}`, { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const toastId = toast.loading(`Importing ${files.length} diagnostic records...`);
    setLoading(true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('/api/uploads/bulk-analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Industrial bulk ingestion failed');

      // Refresh dashboard data
      const summaryResp = await fetch('/api/data/summary');
      if (summaryResp.ok) {
        const summaryData = await summaryResp.json();
        setDashboardChips(summaryData);
      }

      toast.success(`Successfully ingested ${files.length} records`, { id: toastId });
      navigate('/');
      setViewMode('dashboard');
    } catch (err: any) {
      toast.error(`Ingestion Error: ${err.message}`, { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm("CRITICAL ACTION: This will permanently delete ALL diagnostic records and batch history. Are you sure?")) {
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/data/reset-all', { method: 'DELETE' });
      if (!resp.ok) throw new Error("Failed to clear server data");
      
      reset(); // Clear local state
      toast.success("Industrial Core Reset: Database Purged");
      navigate('/');
      setViewMode('dashboard');
    } catch (err: any) {
      toast.error(`Reset Failed: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-between items-center mb-10 border-b border-slate-800/50 pb-6 relative"
    >
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
          onClick={() => setViewMode('dashboard')}
        >
          <Database className="text-white" size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 
              className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent tracking-tight cursor-pointer"
              onClick={() => setViewMode('dashboard')}
            >
              STIL Analyzer Pro
            </h1>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">Tester V1</span>
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] flex items-center gap-2">
            Enterprise Scan Diagnostics
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full ml-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">System Live</span>
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-900/50 border border-slate-800 rounded-lg p-0.5">
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer transition-all group">
            <FileText size={14} className="text-slate-500 group-hover:text-cyan-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-slate-300">STIL</span>
            <input type="file" ref={stilInputRef} className="hidden" accept=".stil,.stf" />
          </label>
          <div className="w-px h-4 bg-slate-800 mx-0.5"></div>
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer transition-all group">
            <Database size={14} className="text-slate-500 group-hover:text-cyan-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-slate-300">Fail Log</span>
            <input type="file" ref={logInputRef} className="hidden" accept=".log,.txt,.csv" />
          </label>
        </div>

        <button 
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-5 py-2 rounded-xl font-black text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <RefreshCcw size={14} />
            </motion.div>
          ) : (
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          )}
          Execute Pipeline
        </button>

        <div className="w-px h-8 bg-slate-800 mx-2"></div>

        <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 px-5 py-2 rounded-xl font-bold text-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer">
          <Database size={14} className="text-cyan-400" />
          {loading ? 'Processing...' : 'Bulk Import'}
          <input 
            type="file" 
            ref={bulkInputRef} 
            multiple 
            onChange={handleBulkImport} 
            className="hidden" 
            accept=".stil,.stf"
          />
        </label>

        <button 
          onClick={handleResetAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-xs font-bold disabled:opacity-50"
          title="Clear All Data"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.header>

  );
};
