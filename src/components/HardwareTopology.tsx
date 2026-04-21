import React, { useState, useMemo } from 'react';
import { useStore, ScanChain } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Download, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

type ScanChainWithRange = ScanChain & {
  range: {
    start: number;
    end: number;
  };
};

export const HardwareTopology: React.FC = () => {
  const { 
    projectData, selectedChain, setProjectData, setFailingFFs, setLoading, setError, 
    setStilText, reset, loading, setViewMode, setSelectedChain,
    injectionTargets, generatedLog, generatedJsonOutput
  } = useStore();
  const [hoveredChain, setHoveredChain] = useState<ScanChainWithRange | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!projectData) return null;

  const chains = projectData.scanChains;
  const totalChains = chains.length;
  
  // Layout constants
  const width = 1300;
  const height = Math.max(700, totalChains * 45);
  const nodeWidth = 140;
  const nodeHeight = 70;
  const startX = 50;
  const centerY = height / 2;
  const channelX = width - 320;
  const channelWidth = 300;
  const channelHeight = 38;

  // Calculate bit ranges for each chain
  const chainMeta = useMemo<ScanChainWithRange[]>(() => {
    let currentBit = 0;
    return chains.map(ch => {
      const range = { start: currentBit, end: currentBit + ch.length - 1 };
      currentBit += ch.length;
      return { ...ch, range };
    });
  }, [chains]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };
  
  const downloadLog = (type: 'log' | 'json') => {
    if (!generatedLog) return;
    const content = type === 'log' ? generatedLog : JSON.stringify(generatedJsonOutput, null, 2);
    const blob = new Blob([content], { type: type === 'log' ? 'text/plain' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fail_log.${type}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Performance Optimization: Cache all faults and injection targets for O(1) lookup
  const faultsMap = useMemo(() => {
    const map = new Map();
    (projectData.faults || []).forEach(f => map.set(f.channel, f));
    return map;
  }, [projectData.faults]);

  const injectionMap = useMemo(() => {
    const map = new Map();
    injectionTargets.forEach(t => {
      const existing = map.get(t.chainName) || { SA0: false, SA1: false };
      map.set(t.chainName, { ...existing, [t.faultType]: true });
    });
    return map;
  }, [injectionTargets]);

  // Performance Optimization: Cache complex SVG path geometry
  const connectionPaths = useMemo(() => {
    const startX_EDT = startX + nodeWidth * 3 + 140;
    const startY_EDT = centerY;
    
    return chainMeta.map((ch, i) => {
      const targetY = (height / 2) - (totalChains * channelHeight / 2) + (i * channelHeight) + (channelHeight / 2);
      const cp1x = startX_EDT + 100;
      const cp2x = channelX - 100;
      
      const pathD = `M ${startX_EDT} ${startY_EDT} C ${cp1x} ${startY_EDT}, ${cp2x} ${targetY}, ${channelX} ${targetY}`;
      
      const inj = injectionMap.get(ch.name);
      const fault = faultsMap.get(ch.name);
      const heat = projectData.heatmap?.channelHeatmap?.[ch.name];
      
      const isInjectionTarget = !!inj;
      const injectionColor = inj ? ((inj.SA0 && inj.SA1) ? "#a855f7" : (inj.SA0 ? "#ffffff" : "#ef4444")) : null;

      return {
        name: ch.name,
        d: pathD,
        targetY,
        startX_EDT,
        startY_EDT,
        cp1x,
        cp2x,
        injectionColor,
        isInjectionTarget,
        fault,
        heat
      };
    });
  }, [chainMeta, height, totalChains, channelHeight, injectionMap, faultsMap, projectData.heatmap]);

  const faults = projectData.faults || [];
  const localizationMessage = projectData.localizationMessage;

  return (
    <div className="w-full bg-[#050a14] rounded-3xl border border-slate-800/50 overflow-hidden relative group/topo">
      <div className="p-8 flex justify-between items-center border-b border-slate-800/50 bg-slate-900/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <LayoutGrid size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Hardware Architecture Topology</h2>
            {localizationMessage && (
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">{localizationMessage}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          {faults.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{faults.length} Faults Localized</span>
            </div>
          )}
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Click a channel to explore connectivity</p>
          {generatedLog && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-6 ml-6">
              <button 
                onClick={() => downloadLog('log')}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 transition-all uppercase"
              >
                <Download size={12} /> Log
              </button>
              <button 
                onClick={() => downloadLog('json')}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] font-bold text-cyan-400 transition-all uppercase"
              >
                <FileText size={12} /> JSON
              </button>
            </div>
          )}
        </div>
      </div>

      <div 
        className="relative overflow-auto custom-scrollbar" 
        onMouseMove={handleMouseMove} 
        style={{ height: '850px' }}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto overflow-visible">
          <defs>
            <filter id="purple-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="red-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="line-grad-fault" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Connections: JTAG -> TAP -> EDT */}
          <path d={`M ${startX + nodeWidth} ${centerY} L ${startX + nodeWidth + 50} ${centerY}`} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow-red)" />
          <path d={`M ${startX + nodeWidth * 2 + 50} ${centerY} L ${startX + nodeWidth * 2 + 100} ${centerY}`} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow-red)" />

          {/* Nodes */}
          {/* JTAG */}
          <g transform={`translate(${startX}, ${centerY - nodeHeight / 2})`}>
            <rect width={nodeWidth} height={nodeHeight} rx="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x={nodeWidth / 2} y={nodeHeight / 2 + 5} textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="bold">JTAG</text>
          </g>

          {/* TAP */}
          <g transform={`translate(${startX + nodeWidth + 50}, ${centerY - nodeHeight / 2})`}>
            <rect width={nodeWidth} height={nodeHeight} rx="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x={nodeWidth / 2} y={nodeHeight / 2 + 5} textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="bold">TAP</text>
          </g>

          {/* EDT ENGINE */}
          <g transform={`translate(${startX + nodeWidth * 2 + 100}, ${centerY - nodeHeight})`}>
            <rect 
              width={nodeWidth + 40} 
              height={nodeHeight * 2} 
              rx="16" 
              fill="#1e1b4b" 
              stroke="#a855f7" 
              strokeWidth="3" 
              filter="url(#purple-glow)"
              className="animate-pulse"
            />
            <text x={(nodeWidth + 40) / 2} y={nodeHeight - 5} textAnchor="middle" fill="#f1f5f9" fontSize="16" fontWeight="900">EDT ENGINE</text>
            <text x={(nodeWidth + 40) / 2} y={nodeHeight + 15} textAnchor="middle" fill="#a855f7" fontSize="10" fontWeight="bold" className="uppercase tracking-widest">Compression Logic</text>
          </g>

          {/* Connections to Channels */}
          <g>
            {connectionPaths.map((path, i) => {
              const ch = chainMeta[i];
              const isSelected = selectedChain?.name === ch.name;
              const isHovered = hoveredChain?.name === ch.name;
              const { d, injectionColor, isInjectionTarget, fault, heat } = path;

              return (
                <g key={`path-group-${ch.name}`}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={isInjectionTarget ? injectionColor! : (heat ? heat.color : (fault ? "#ef4444" : (isSelected || isHovered ? "#06b6d4" : "url(#line-grad)")))}
                    strokeWidth={isInjectionTarget || heat || fault || isSelected || isHovered ? 2 : 1}
                    strokeOpacity={isInjectionTarget || heat || fault || isSelected || isHovered ? 1 : 0.3}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: i * 0.02 }}
                  />
                  {(isInjectionTarget || fault) && (
                    <motion.circle
                      r="3"
                      fill={isInjectionTarget ? injectionColor! : "#ef4444"}
                      filter="url(#red-glow)"
                    >
                      <animateMotion
                        dur={`${2 + Math.random() * 2}s`}
                        repeatCount="indefinite"
                        path={d}
                      />
                    </motion.circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* Channels */}
          <g>
            {connectionPaths.map((path, i) => {
              const ch = chainMeta[i];
              const isSelected = selectedChain?.name === ch.name;
              const isHovered = hoveredChain?.name === ch.name;
              const { targetY, injectionColor, isInjectionTarget, fault, heat } = path;
              const inj = injectionMap.get(ch.name);

              return (
                <g 
                  key={`ch-${ch.name}`} 
                  transform={`translate(${channelX}, ${targetY - channelHeight / 2})`}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredChain(ch)}
                  onMouseLeave={() => setHoveredChain(null)}
                  onClick={() => {
                    setSelectedChain(ch);
                    setViewMode('schematic');
                  }}
                >
                  {/* Injection Target Indicator */}
                  {isInjectionTarget && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ color: injectionColor! }}
                    >
                      <circle cx="-15" y={channelHeight / 2 - 2} r="6" fill="currentColor" className="animate-ping opacity-20" />
                      <circle cx="-15" y={channelHeight / 2 - 2} r="3" fill="currentColor" />
                      <text x={channelWidth + 15} y={channelHeight / 2 + 6} fill={injectionColor!} fontSize="10" fontWeight="900" className="uppercase tracking-widest">
                        {inj?.SA0 && inj?.SA1 ? 'Mixed-Mode Target' : (inj?.SA0 ? 'S at L Target' : 'S at H Target')}
                      </text>
                    </motion.g>
                  )}
                  
                  {/* Channel Label */}
                  <text x="-60" y={channelHeight / 2 + 6} fill={isInjectionTarget ? injectionColor! : (heat ? heat.color : (fault ? "#ef4444" : (isSelected ? "#22d3ee" : "#94a3b8")))} fontSize="14" fontWeight="900" className="font-mono">
                    {`CH ${(i + 1).toString().padStart(2, '0')}`}
                  </text>
                  
                  {/* FF Count */}
                  <text x="-135" y={channelHeight / 2 + 6} fill="#64748b" fontSize="11" fontWeight="bold">
                    {`[${ch.length} FFs]`}
                  </text>

                  {/* Channel Box */}
                  <rect 
                    width={channelWidth} 
                    height={channelHeight - 4} 
                    rx="6" 
                    fill={heat ? `${heat.color}1a` : (fault ? "rgba(239, 68, 68, 0.1)" : (isSelected ? "rgba(6, 182, 212, 0.1)" : "rgba(15, 23, 42, 0.4)"))} 
                    stroke={heat ? heat.color : (fault ? "#ef4444" : (isSelected ? "#06b6d4" : isHovered ? "#94a3b8" : "#1e293b"))} 
                    strokeWidth={heat || fault || isSelected ? 2 : 1}
                    filter={((heat?.heatScore ?? 0) > 0.6 || Boolean(fault)) ? "url(#red-glow)" : undefined}
                    className="transition-all duration-200"
                  />

                  {/* Channel Box Label (INSIDE) */}
                  <text 
                    x={channelWidth / 2} 
                    y={channelHeight / 2 + 3} 
                    textAnchor="middle" 
                    fill={isInjectionTarget ? injectionColor! : (heat ? "rgba(255,255,255,0.9)" : (isSelected ? "#fff" : "rgba(148, 163, 184, 0.5)"))} 
                    fontSize="10" 
                    fontWeight="800" 
                    className="font-mono uppercase tracking-widest pointer-events-none"
                  >
                    {`[chain ${(i + 1).toString().padStart(2, '0')}]`}
                  </text>

                  {/* Fault Badge Overlay */}
                  {fault && (
                    <g transform={`translate(${channelWidth + 10}, 0)`}>
                      <rect width="100" height={channelHeight - 4} rx="4" fill="#ef4444" />
                      <text x="50" y={channelHeight / 2 - 2} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" className="uppercase tracking-tighter">
                        {fault.faultType}
                      </text>
                      <text x="50" y={channelHeight / 2 + 8} textAnchor="middle" fill="white" fontSize="7" className="opacity-80">
                        {fault.ff} | {fault.confidence}%
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Markers */}
          <defs>
            <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
            </marker>
          </defs>
          </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredChain && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute pointer-events-none z-50 bg-slate-900 border border-slate-600 p-3 rounded-xl shadow-2xl ring-4 ring-cyan-500/10"
              style={{ left: mousePos.x + 25, top: mousePos.y - 60 }}
            >
              <div className="text-[11px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1.5">Bit Range</div>
              <div className="text-lg font-mono text-cyan-400 font-black">
                {hoveredChain.range.start} — {hoveredChain.range.end}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
