import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Zap, Download, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export const FaultInjectionPanel: React.FC = () => {
  const { 
    projectData, stilText, setFailingFFs, setProjectData, setError, 
    injectionTargets, setInjectionTargets, setSelectedChain, setViewMode,
    generatedLog, generatedJsonOutput, setGeneratedResults 
  } = useStore();
  
  const lastTarget = injectionTargets[injectionTargets.length - 1];
  const selectedChain = lastTarget?.chainName ?? '';
  const bitPosition = lastTarget?.bitPosition ?? 0;

  const [faultType, setFaultType] = useState<'SA0' | 'SA1'>('SA0');
  const [severity, setSeverity] = useState(0.8);
  const [clusterSize, setClusterSize] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!projectData) return null;

  const updateTarget = (chainName: string, bit: number) => {
    if (!chainName) return;
    const exists = injectionTargets.find(t => t.chainName === chainName && t.bitPosition === bit);
    let newTargets;
    
    if (exists) {
      if (exists.faultType === faultType) {
        // Same fault type, toggle off
        newTargets = injectionTargets.filter(t => t !== exists);
      } else {
        // Different fault type, update it
        newTargets = injectionTargets.map(t => t === exists ? { ...t, faultType } : t);
      }
    } else {
      // New target, add with current active faultType
      newTargets = [...injectionTargets, { chainName, bitPosition: bit, faultType }];
    }
    
    setInjectionTargets(newTargets);
    
    const chain = projectData.scanChains.find(c => c.name === chainName);
    if (chain) {
      setSelectedChain(chain);
    }
  };

  const handleInject = async () => {
    if (!selectedChain) {
      setError("Please select a scan chain.");
      return;
    }

    if (!stilText) {
      setError("STIL data missing. Please re-upload your STIL file.");
      return;
    }

    setLoading(true);
    try {
      setFailingFFs({});
      setProjectData({ ...projectData, faults: [] });

      const formData = new FormData();
      const blob = new Blob([stilText], { type: 'text/plain' });
      formData.append('stil', blob, 'design.stil');
      formData.append('params', JSON.stringify({
        targets: injectionTargets,
        severity,
        clusterSize,
      }));

      const response = await fetch('/api/uploads/inject-fault', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to inject fault");
      }

      const result = await response.json();
      setGeneratedResults(result.logText, result.jsonOutput ?? null);
      
      const analyzeFormData = new FormData();
      analyzeFormData.append('stil', blob, 'design.stil');
      const logBlob = new Blob([result.logText], { type: 'text/plain' });
      analyzeFormData.append('failLog', logBlob, 'synthetic_fail.log');

      const analyzeResponse = await fetch('/api/uploads/analyze', {
        method: 'POST',
        body: analyzeFormData,
      });

      if (!analyzeResponse.ok) throw new Error("Failed to analyze synthetic log");
      
      const analyzeResult = await analyzeResponse.json();
      setProjectData(analyzeResult.projectData);
      setFailingFFs(analyzeResult.failingFFs);
      setViewMode('topology');
    } catch (err) {
      console.error(err);
      setError("Error during fault injection simulation.");
    } finally {
      setLoading(false);
    }
  };

  const downloadLog = () => {
    if (!generatedLog) return;
    const blob = new Blob([generatedLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = injectionTargets.length > 1 ? `multi_faults_${faultType}` : `fail_log_${faultType}_chain${selectedChain}_bit${bitPosition}`;
    a.download = `${filename}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentChainData = projectData.scanChains.find(c => c.name === selectedChain);

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap size={20} className="text-amber-400" />
          Fault Injection Engine
        </h3>
        <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-bold text-amber-400 uppercase">
          Simulation Mode
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Target Scan Chain</label>
            <select 
              value={selectedChain}
              onChange={(e) => updateTarget(e.target.value, bitPosition)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            >
              <option value="">Select a chain...</option>
              {projectData.scanChains.map((ch, idx) => (
                <option key={ch.name} value={ch.name}>
                  CH {(idx + 1).toString().padStart(2, '0')} — {ch.name} ({ch.length} bits)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Bit Position (0 - {selectedChain ? currentChainData?.length! - 1 : '?'})</label>
            <div className="flex gap-3">
              <input 
                type="number" 
                value={bitPosition}
                onChange={(e) => updateTarget(selectedChain, parseInt(e.target.value))}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-sm font-mono text-cyan-400 font-bold flex items-center border border-slate-700">
                FF_{bitPosition}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Fault Type</label>
            <div className="flex gap-3">
              <button 
                onClick={() => setFaultType('SA0')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-black border transition-all uppercase tracking-widest",
                  faultType === 'SA0' ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-600"
                )}
              >
                Stuck-at-0
              </button>
              <button 
                onClick={() => setFaultType('SA1')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-black border transition-all uppercase tracking-widest",
                  faultType === 'SA1' ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/20" : "bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-600"
                )}
              >
                Stuck-at-1
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Fault Severity (Intensity: {Math.round(severity * 100)}%)</label>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={severity}
              onChange={(e) => setSeverity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Cluster Size (Adjacent FFs: {clusterSize})</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="1"
              value={clusterSize}
              onChange={(e) => setClusterSize(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div className="pt-2">
            <button 
              onClick={handleInject}
              disabled={loading || !selectedChain}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/20 uppercase tracking-widest text-sm"
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
              {loading ? 'Simulating Fault...' : 'Generate Synthetic Fail Log'}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Bit Selector */}
      {currentChainData && (
        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">Interactive Bit Selector ({injectionTargets.length} selected)</label>
            {injectionTargets.length > 0 && (
              <button 
                onClick={() => setInjectionTargets([])}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap gap-1.5">
              {currentChainData.ffs.map((ff, i) => {
                const target = injectionTargets.find(t => t.chainName === selectedChain && t.bitPosition === i);
                const isSA0 = target?.faultType === 'SA0';
                const isSA1 = target?.faultType === 'SA1';
                
                return (
                  <button
                    key={ff.id}
                    onClick={() => updateTarget(selectedChain, i)}
                    className={cn(
                      "w-12 h-12 rounded-lg text-xs font-mono flex items-center justify-center transition-all border",
                      isSA0 && "bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110 z-10",
                      isSA1 && "bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110 z-10",
                      !target && "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                    )}
                    title={`Bit ${i}: ${ff.id}${target ? ` (${target.faultType})` : ''}`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-slate-600 mt-2 italic">Click to toggle bits. You can select multiple targets across different chains.</p>
        </div>
      )}

      {generatedLog && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-slate-800 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 text-emerald-400 text-xs font-bold">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Synthetic Log Generated Successfully
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={downloadLog}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white transition-all"
            >
              <Download size={14} /> Download .log
            </button>
            <button 
              onClick={() => {
                if (!generatedJsonOutput) return;
                const blob = new Blob([JSON.stringify(generatedJsonOutput, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const filename = injectionTargets.length > 1 ? `multi_faults_${faultType}` : `fail_log_${faultType}_chain${selectedChain}_bit${bitPosition}`;
                a.download = `${filename}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-white transition-all"
            >
              <FileText size={14} /> Download .json
            </button>
          </div>
        </motion.div>
      )}

      <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 flex gap-3">
        <AlertCircle size={16} className="text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          The injection engine simulates hardware behavior by forcing the selected bit to a fixed value across {projectData.totalPatterns} patterns. 
          Failures are generated whenever the expected random vector value differs from the forced fault value.
        </p>
      </div>
    </div>
  );
};
