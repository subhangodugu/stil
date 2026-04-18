import React, { useMemo } from 'react';
import { useStore, ScanChain } from '../store/useStore';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { getFaultDisplay } from '../lib/faultTerminology';

const FF_SIZE = 55;
const SPACING = 25;
const ROW_LEN = 12;

interface ScanChainVisualizerProps {
  chain: ScanChain;
}

export const ScanChainVisualizer: React.FC<ScanChainVisualizerProps> = ({ chain }) => {
  const { failingFFs, projectData, injectionTargets } = useStore();

  const fault = projectData?.faults?.find(f => f.channel === chain.name);
  const rootFFIndex = fault ? chain.ffs.findIndex(ff => ff.id === fault.ff) : -1;

  const targetsInChain = injectionTargets.filter(t => t.chainName === chain.name);

  const getHeatColor = (failCount: number, index: number, ffId: string) => {
    const heat = projectData?.heatmap?.ffHeatmap?.[ffId];
    if (heat) return heat.color;

    if (index === rootFFIndex) return '#ff0000';
    if (fault?.faultType === 'CHAIN_BREAK' && index > rootFFIndex) {
      return '#f97316';
    }

    if (!failCount) return '#1e293b';
    if (failCount > 10) return '#ef4444';
    if (failCount > 5) return '#f97316';
    if (failCount > 2) return '#eab308';
    return '#06b6d4';
  };

  const svgWidth = ROW_LEN * (FF_SIZE + SPACING) + 40;
  const svgHeight = Math.ceil(chain.length / ROW_LEN) * (FF_SIZE + SPACING) + 40;

  const connectors = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (let i = 0; i < chain.length - 1; i++) {
      const row = Math.floor(i / ROW_LEN);
      const col = row % 2 === 0 ? (i % ROW_LEN) : (ROW_LEN - 1 - (i % ROW_LEN));
      const x1 = col * (FF_SIZE + SPACING) + 20 + FF_SIZE / 2;
      const y1 = row * (FF_SIZE + SPACING) + 20 + FF_SIZE / 2;

      const nextI = i + 1;
      const nextRow = Math.floor(nextI / ROW_LEN);
      const nextCol = nextRow % 2 === 0 ? (nextI % ROW_LEN) : (ROW_LEN - 1 - (nextI % ROW_LEN));
      const x2 = nextCol * (FF_SIZE + SPACING) + 20 + FF_SIZE / 2;
      const y2 = nextRow * (FF_SIZE + SPACING) + 20 + FF_SIZE / 2;

      lines.push({ x1, y1, x2, y2 });
    }

    return lines;
  }, [chain.length]);

  return (
    <div className="relative glass-card rounded-3xl overflow-hidden premium-glow-cyan shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] border border-cyan-900/30">
      <div className="absolute inset-0 bg-slate-950/80 z-0 pointer-events-none backdrop-blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(6,182,212,1)]" />
      
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        className="relative z-10 w-full h-full p-8"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        <defs>
          <filter id="ff-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="propagation-grad">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
        </defs>

        {connectors.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#334155"
            strokeWidth="2"
            strokeDasharray={i % 2 === 0 ? '0' : '4 2'}
          />
        ))}

        {chain.ffs.map((ff, i) => {
          const row = Math.floor(i / ROW_LEN);
          const col = row % 2 === 0 ? (i % ROW_LEN) : (ROW_LEN - 1 - (i % ROW_LEN));
          const x = col * (FF_SIZE + SPACING) + 20;
          const y = row * (FF_SIZE + SPACING) + 20;

          const failCount = failingFFs[ff.id] || 0;
          const color = getHeatColor(failCount, i, ff.id);
          const heat = projectData?.heatmap?.ffHeatmap?.[ff.id];
          const isRoot = i === rootFFIndex;
          const target = targetsInChain.find(t => t.bitPosition === i);
          const isTarget = !!target;
          const isPropagation = fault?.faultType === 'CHAIN_BREAK' && i > rootFFIndex;

          const targetColor = target?.faultType === 'SA0' ? '#f59e0b' : '#ef4444';

          return (
            <motion.g
              key={ff.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.001 }}
              className="cursor-pointer group"
            >
              {isTarget && (
                <motion.g animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <rect
                    x={x - 6}
                    y={y - 6}
                    width={FF_SIZE + 12}
                    height={FF_SIZE + 12}
                    rx="12"
                    fill="none"
                    stroke={targetColor}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    className="animate-[spin_10s_linear_infinite]"
                  />
                </motion.g>
              )}

              {isPropagation && (
                <rect
                  x={x - 4}
                  y={y - 4}
                  width={FF_SIZE + 8}
                  height={FF_SIZE + 8}
                  rx="10"
                  fill="url(#propagation-grad)"
                  className="opacity-20 animate-pulse"
                />
              )}

              <rect
                x={x}
                y={y}
                width={FF_SIZE}
                height={FF_SIZE}
                rx="6"
                fill={color}
                stroke={isTarget ? targetColor : isRoot ? '#ff0000' : 'transparent'}
                strokeWidth={isTarget || isRoot ? 3 : 1}
                className={cn(
                  'transition-all duration-300 group-hover:stroke-white group-hover:opacity-100',
                  (failCount > 0 || heat) && 'filter drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]',
                  (isRoot || isTarget) && 'animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]',
                  (!failCount && !heat && !isRoot && !isTarget) && 'opacity-60 hover:opacity-100 drop-shadow-[0_0_5px_rgba(6,182,212,0.3)]'
                )}
              />
              <text
                x={x + FF_SIZE / 2}
                y={y + FF_SIZE / 2 + 5}
                fontSize="14"
                fill={failCount > 0 ? 'white' : '#94a3b8'}
                textAnchor="middle"
                className="font-mono font-black pointer-events-none"
              >
                {i}
              </text>
              <title>{`FF: ${ff.id}\nGlobal Index: ${ff.globalIndex}\nFails: ${failCount}${isTarget ? `\nFault Target: ${getFaultDisplay(target.faultType).long}` : ''}`}</title>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};
