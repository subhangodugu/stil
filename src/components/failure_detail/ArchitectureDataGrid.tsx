import React from 'react';
import { Database, Zap, Cpu, Layers, ListOrdered, Share2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function ArchitectureDataGrid() {
  const { projectData } = useStore();

  if (!projectData) return null;

  const stats = [
    { 
      label: "Total Patterns", 
      value: projectData.totalPatterns?.toLocaleString() || "0", 
      icon: <Layers size={14} className="text-cyan-400" /> 
    },
    { 
      label: "Test Type", 
      value: projectData.hasEDT ? "EDT / Production SCAN" : "Generic Serial SCAN", 
      icon: <Database size={14} className="text-blue-400" /> 
    },
    { 
      label: "Total Scan Chains", 
      value: projectData.scanChains?.length.toString() || "0", 
      icon: <Share2 size={14} className="text-purple-400" /> 
    },
    { 
      label: "Scan Length (Avg)", 
      value: projectData.scanChains?.length > 0 
        ? `${Math.floor(projectData.totalFFs / projectData.scanChains.length)} Bits` 
        : "N/A", 
      icon: <ListOrdered size={14} className="text-emerald-400" /> 
    },
    { 
      label: "Total Scan FFs", 
      value: projectData.totalFFs?.toLocaleString() || "0", 
      icon: <Cpu size={14} className="text-amber-400" /> 
    },
    { 
      label: "Series Connected", 
      value: projectData.hasEDT ? "De-Compressed" : "YES", 
      icon: <Zap size={14} className="text-orange-400" /> 
    },
    { 
      label: "Parallel Connected", 
      value: projectData.hasEDT ? "YES (EDT Logic)" : "NO", 
      icon: <Zap size={14} className="text-cyan-400" /> 
    },
  ];

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden self-start">
      <div className="p-4 border-b border-slate-800/50 bg-slate-900/20">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <Database size={12} /> Silicon Architecture Metrics
        </h4>
      </div>
      <div className="p-4 grid grid-cols-1 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-slate-950/50 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
                {stat.icon}
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{stat.label}</span>
            </div>
            <span className="text-[10px] font-mono text-white font-bold bg-slate-950/50 px-2 py-1 rounded">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
