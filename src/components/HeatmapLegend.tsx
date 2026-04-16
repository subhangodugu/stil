import React from 'react';

export const HeatmapLegend: React.FC = () => {
  const steps = [
    { color: '#1e3a8a', label: '0%', text: 'Healthy' },
    { color: '#06b6d4', label: '20%', text: 'Low' },
    { color: '#22c55e', label: '40%', text: 'Normal' },
    { color: '#eab308', label: '60%', text: 'Warning' },
    { color: '#f97316', label: '80%', text: 'High' },
    { color: '#ef4444', label: '100%', text: 'Critical' },
  ];

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-4 rounded-2xl">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Diagnostic Heatmap Legend</div>
      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3 group">
            <div 
              className="w-4 h-4 rounded-full shadow-lg transition-transform group-hover:scale-125" 
              style={{ backgroundColor: step.color, boxShadow: `0 0 10px ${step.color}40` }}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-300 leading-none">{step.label}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{step.text}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-red-500 animate-pulse" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Root Fault (Pulsing)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-orange-500/20 shadow-[0_0_10px_#f9731640]" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Propagation Zone</span>
        </div>
      </div>
    </div>
  );
};
