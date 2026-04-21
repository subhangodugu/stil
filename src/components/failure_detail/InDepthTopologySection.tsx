import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, AlertTriangle, ShieldCheck, Cpu, Info, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { getFaultDisplay } from '../../lib/faultTerminology';

export default function InDepthTopologySection() {
  const { projectData, injectionTargets, setSelectedChain, setViewMode } = useStore();
  const [hoveredBit, setHoveredBit] = useState<any>(null);

  if (!projectData || !projectData.scanChains) return null;

  const { scanChains, localizedFaults = [] } = projectData;

  // Create a fast lookup map for physical faults: chainName -> Map(ffPosition -> fault)
  const faultLookup = new Map<string, Map<number, any>>();
  localizedFaults.forEach(f => {
    if (!faultLookup.has(f.chainName)) faultLookup.set(f.chainName, new Map());
    faultLookup.get(f.chainName)!.set(f.ffPosition, f);
  });

  // Create a fast lookup map for injected faults: chainName -> Map(ffPosition -> faultType)
  const injectionLookup = new Map<string, Map<number, string>>();
  injectionTargets.forEach(t => {
    if (!injectionLookup.has(t.chainName)) injectionLookup.set(t.chainName, new Map());
    injectionLookup.get(t.chainName)!.set(t.bitPosition, t.faultType);
  });

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-800/50 bg-slate-900/20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <LayoutGrid className="text-blue-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Architecture Topology</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Silicon Scan Network • High-Fidelity Fault Mapping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500/30 border border-cyan-500/50" />
            Healthy Bit
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-500 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            Failed Bit / SA1
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            SA0 Fault
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar">
        {scanChains.map((chain, cIdx) => {
          const chainFaults = new Map<string, any>();
          (projectData.faults || []).filter(f => f.channel === chain.name).forEach(f => chainFaults.set(f.ff, f));
          const hasFailures = chainFaults.size > 0;

          return (
            <div key={chain.name || cIdx} className="space-y-3 group/chain">
              <div className="flex justify-between items-end px-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 group-hover/chain:text-cyan-400 transition-colors uppercase tracking-[0.2em]">
                    CH {(cIdx + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-300 transition-colors">
                    {chain.name}
                  </span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">
                    {chain.length} BITS • {chain.ffs?.[0]?.clockDomain || 'GLOBAL'}
                  </span>
                </div>
                {hasFailures && (
                  <div className="flex items-center gap-2 text-red-400 font-black text-[9px] uppercase tracking-widest animate-pulse">
                    <AlertTriangle size={12} />
                    {chainFaults.size} ROOT FAULTS LOCALIZED
                  </div>
                )}
              </div>

              {/* Bit Grid - Representing the Scan Chain Architecture */}
              <div className="flex flex-wrap gap-1 p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl relative">
                {chain.ffs.map((ff, fIdx) => {
                  const injectedType = injectionLookup.get(chain.name)?.get(fIdx);
                  const fault = faultLookup.get(chain.name)?.get(fIdx);
                  const isFailing = !!fault;
                  const isInjected = !!injectedType;

                  // For memory performance, we only want to show labels for important bits or sample them
                  const shouldShowIndex = fIdx % 20 === 0 || isFailing || isInjected;

                  return (
                    <div 
                      key={ff.id} 
                      className="relative"
                      onMouseEnter={() => setHoveredBit({ ...ff, fault, injectedType, chainName: chain.name })}
                      onMouseLeave={() => setHoveredBit(null)}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.2 }}
                        onClick={() => {
                          const state = useStore.getState();
                          state.setWaveformFocus({
                             chainName: chain.name,
                             bitIndex: fIdx,
                             autoScroll: false
                          });
                          state.setSelectedChain(chain); // Sync selection across detail views
                        }}
                        className={cn(
                          "w-3 h-3 rounded-sm transition-all duration-300 cursor-help active:scale-95",
                          isFailing && !isInjected && "bg-red-500 border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10",
                          isInjected && injectedType === 'SA1' && "bg-red-500 border border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] z-10 animate-pulse",
                          isInjected && injectedType === 'SA0' && "bg-white border border-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 animate-pulse",
                          !isFailing && !isInjected && "bg-slate-800/50 border border-slate-700 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                        )}
                      />
                      {shouldShowIndex && (
                        <div className="absolute -top-4 left-0 text-[6px] font-bold text-slate-700 whitespace-nowrap">
                          {fIdx}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Hover Tooltip - Strategic placement */}
                <AnimatePresence>
                  {hoveredBit && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="fixed z-[100] bg-slate-150 border border-slate-700 p-4 rounded-xl shadow-2xl pointer-events-none min-w-[200px]"
                      style={{ 
                        left: '50%', 
                        top: '50%', 
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: '#020617',
                        boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 20px rgba(239,68,68,0.2)' 
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800">
                        <div className={cn("p-2 rounded-lg", (hoveredBit.fault || hoveredBit.injectedType) ? "bg-red-500/10" : "bg-cyan-500/10")}>
                          {(hoveredBit.fault || hoveredBit.injectedType) ? <AlertTriangle className={cn(hoveredBit.injectedType === 'SA0' ? "text-white" : "text-red-500")} size={16} /> : <Cpu className="text-cyan-400" size={16} />}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                            {hoveredBit.injectedType ? '[FAULT INJECTED]' : (hoveredBit.fault ? 'Silicon Defect' : 'Nominal State')}
                            {(hoveredBit.fault || hoveredBit.injectedType) && (
                              <span className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded border font-black uppercase tracking-widest",
                                hoveredBit.injectedType === 'SA0' ? "bg-white text-slate-900 border-white" : "bg-red-500/20 text-red-400 border-red-500/30"
                              )}>
                                {hoveredBit.injectedType ?? hoveredBit.fault.faultType}
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-bold text-white uppercase">
                            {hoveredBit.id}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Shift Position</span>
                          <span className="text-[10px] text-white font-mono">{hoveredBit.localIndex}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Clock Domain</span>
                          <span className="text-[10px] text-cyan-400 font-mono font-black">{hoveredBit.clockDomain}</span>
                        </div>
                        {hoveredBit.fault && (
                          <>
                            <div className="flex justify-between gap-8">
                              <span className="text-[10px] text-slate-500 uppercase font-bold">Confidence</span>
                              <span className="text-[10px] text-red-400 font-black">{hoveredBit.fault.confidence}%</span>
                            </div>
                            <div className="flex justify-between gap-8">
                              <span className="text-[10px] text-slate-500 uppercase font-bold">Fail Count</span>
                              <span className="text-[10px] text-red-400 font-black">{hoveredBit.fault.failCount} cycles</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                        {hoveredBit.injectedType ? <Zap size={10} className="text-amber-400" /> : <Info size={10} className="text-indigo-400" />}
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">
                          {hoveredBit.injectedType ? 'Synthetic User defect applied' : (hoveredBit.fault ? 'Root Fault Observation' : 'No Mismatch Detected')}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-950/20 border-t border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Cpu size={12} className="text-slate-600" />
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">BSDL / STIL Mapping Active</span>
          </div>
        </div>
        <div className="text-[9px] text-slate-700 font-black uppercase tracking-widest">
          {scanChains.length} Chains • {projectData.totalFFs} Total Bits Monitored
        </div>
      </div>
    </div>
  );
}
