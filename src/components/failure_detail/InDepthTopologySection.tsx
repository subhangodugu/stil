import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, AlertTriangle, ShieldCheck, Cpu, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export default function InDepthTopologySection() {
  const { projectData } = useStore();
  const [hoveredBit, setHoveredBit] = useState<any>(null);

  if (!projectData || !projectData.scanChains) return null;

  const { scanChains, localizedFaults = [] } = projectData;

  // Create a fast lookup map for faults: chainName -> Set(ffPosition)
  const faultLookup = new Map<string, Map<number, any>>();
  localizedFaults.forEach(f => {
    if (!faultLookup.has(f.chainName)) faultLookup.set(f.chainName, new Map());
    faultLookup.get(f.chainName)!.set(f.ffPosition, f);
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
            Failed Bit
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar">
        {scanChains.map((chain, cIdx) => {
          const chainFaults = faultLookup.get(chain.name);
          const hasFailures = !!chainFaults;

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
                    {chain.length} Bits
                  </span>
                </div>
                {hasFailures && (
                  <div className="flex items-center gap-2 text-red-400 font-black text-[9px] uppercase tracking-widest animate-pulse">
                    <AlertTriangle size={12} />
                    {chainFaults.size} Critical Failures detected
                  </div>
                )}
              </div>

              {/* Bit Grid - Representing the Scan Chain Architecture */}
              <div className="flex flex-wrap gap-1 p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl relative">
                {Array.from({ length: chain.length }).map((_, fIdx) => {
                  const fault = chainFaults?.get(fIdx);
                  const isFailing = !!fault;

                  // For memory performance, we only want to show labels for important bits or sample them
                  const shouldShowIndex = fIdx % 20 === 0 || isFailing;

                  return (
                    <div 
                      key={fIdx} 
                      className="relative"
                      onMouseEnter={() => isFailing && setHoveredBit({ ...fault, chainIndex: cIdx + 1, ffId: chain.ffs?.[fIdx]?.id })}
                      onMouseLeave={() => setHoveredBit(null)}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.2 }}
                        className={cn(
                          "w-3 h-3 rounded-sm transition-all duration-300 cursor-help",
                          isFailing 
                            ? "bg-red-500 border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10" 
                            : "bg-slate-800/50 border border-slate-700 hover:bg-cyan-500/20 hover:border-cyan-500/50"
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
                      className="fixed z-[100] bg-slate-950 border border-slate-700 p-4 rounded-xl shadow-2xl pointer-events-none"
                      style={{ 
                        left: '50%', 
                        top: '50%', 
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.1)' 
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <AlertTriangle className="text-red-500" size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                            Fault Localized
                            <span className="text-[8px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded border border-red-500/30">
                              {hoveredBit.expected === '1' && hoveredBit.actual === '0' ? 'STUCK-AT-0 (SA0)' : hoveredBit.expected === '0' && hoveredBit.actual === '1' ? 'STUCK-AT-1 (SA1)' : 'LOGIC MISMATCH'}
                            </span>
                          </p>
                          <p className="text-xs font-bold text-white">
                            CH {hoveredBit.chainIndex} • {hoveredBit.ffId ? `FF: ${hoveredBit.ffId}` : `Position ${hoveredBit.ffPosition}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Pattern ID</span>
                          <span className="text-[10px] text-white font-mono">{hoveredBit.patternId}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Expected State</span>
                          <span className="text-[10px] text-emerald-400 font-mono">{hoveredBit.expected}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">ATE Actual State</span>
                          <span className="text-[10px] text-red-400 font-mono">{hoveredBit.actual}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                        <Info size={10} className="text-cyan-500" />
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">Physical Silicon Mismatch</span>
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
