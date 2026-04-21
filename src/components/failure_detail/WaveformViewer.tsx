import React, { useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';

interface WaveformViewerProps {
  height?: number;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({ height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { projectData, waveformFocus, streamingMetrics } = useStore();
  const { chainName, bitIndex, zoom, offset } = waveformFocus;

  // 1. Memoized Data Slicing: Only compute bitstream when focus or projectData changes
  const waveformData = useMemo(() => {
    if (!projectData || !chainName || bitIndex === null) return [];
    
    const chains = projectData.scanChains || [];
    const targetChain = chains.find(c => c.name === chainName);
    if (!targetChain) return [];

    // Find the offset of the bit in the raw 'scan' string
    // In our parser, scan strings are concatenations of chains in order
    let chainStartPos = 0;
    for (const c of chains) {
      if (c.name === chainName) break;
      chainStartPos += c.length;
    }
    const globalBitPos = chainStartPos + bitIndex;

    // Extract the bit for this position from every vector in projectData (if available)
    // and cross-reference with failures
    const bits: Array<{ state: string; isFail: boolean; patternId: string }> = [];
    
    // Note: We use projectData.localizedFaults for historical data
    const failMap = new Set(
      (projectData.localizedFaults || [])
        .filter(f => f.chainName === chainName && f.ffPosition === bitIndex)
        .map(f => f.patternId)
    );

    // If patterns are parsed and available in projectData
    const patterns = (projectData as any).patterns || [];
    patterns.forEach((p: any) => {
      const bit = p.scan?.[globalBitPos] || 'X';
      bits.push({
        state: bit,
        isFail: failMap.has(p.patternId),
        patternId: p.patternId
      });
    });

    return bits;
  }, [projectData, chainName, bitIndex]);

  // 2. High-Performance Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const drawHeight = rect.height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, drawHeight);

    if (waveformData.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chainName ? 'EXTRACTING CHANNEL BITSTREAM...' : 'SELECT A SCAN CHAIN TO VIEW WAVEFORM', width / 2, drawHeight / 2);
      return;
    }

    const patternWidth = 40 * zoom; 
    const marginY = 40;
    const waveY_High = marginY;
    const waveY_Low = drawHeight - marginY;

    // Draw Background Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = -offset % patternWidth; x < width; x += patternWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, drawHeight);
      ctx.stroke();
    }

    // Draw Logic Level Base Lines
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(0, waveY_High); ctx.lineTo(width, waveY_High); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, waveY_Low); ctx.lineTo(width, waveY_Low); ctx.stroke();
    ctx.setLineDash([]);

    // Logic State Colors
    const COLORS = {
      HIGH: '#10b981', // Emerald 500
      LOW: '#64748b',  // Slate 500
      FAIL_SPIKE: '#ef4444', // Red 500
      X: '#334155',    // Dark Slate
    };

    // Rendering Loop with Clipping Optimization
    const startIndex = Math.max(0, Math.floor(offset / patternWidth));
    const endIndex = Math.min(waveformData.length, startIndex + Math.ceil(width / patternWidth) + 1);

    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    for (let i = startIndex; i < endIndex; i++) {
        const bit = waveformData[i];
        const xPos = i * patternWidth - offset;
        const nextXPos = (i + 1) * patternWidth - offset;
        
        const isHigh = bit.state === '1' || bit.state === 'H';
        const isLow = bit.state === '0' || bit.state === 'L';
        const yPos = isHigh ? waveY_High : waveY_Low;

        // Draw State Line
        ctx.strokeStyle = isHigh ? COLORS.HIGH : isLow ? COLORS.LOW : COLORS.X;
        ctx.beginPath();
        ctx.moveTo(xPos, yPos);
        ctx.lineTo(nextXPos, yPos);
        ctx.stroke();

        // Draw Vertical Transition (if state changes)
        if (i < waveformData.length - 1) {
            const nextBit = waveformData[i+1];
            const nextIsHigh = nextBit.state === '1' || nextBit.state === 'H';
            const nextY = nextIsHigh ? waveY_High : waveY_Low;
            if (nextY !== yPos) {
                ctx.beginPath();
                ctx.moveTo(nextXPos, yPos);
                ctx.lineTo(nextXPos, nextY);
                ctx.stroke();
            }
        }

        // Failure Pulse Overlay
        if (bit.isFail) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.fillRect(xPos, 10, patternWidth, drawHeight - 20);
            
            // Spike
            ctx.strokeStyle = COLORS.FAIL_SPIKE;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(xPos + patternWidth/2, 5);
            ctx.lineTo(xPos + patternWidth/2, drawHeight - 5);
            ctx.stroke();
            ctx.lineWidth = 2;
        }

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '8px "JetBrains Mono", monospace';
        if (i % Math.ceil(5 / zoom) === 0) {
            ctx.fillText(bit.patternId, xPos + 2, 15);
        }
    }

  }, [waveformData, zoom, offset, height]);

  return (
    <div className="relative w-full bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden cursor-crosshair">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
        style={{ height }}
      />
      
      {/* Legend Overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logic 1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logic 0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-4 bg-red-500/50 border-x border-red-500" />
          <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">Mismatch</span>
        </div>
      </div>

      {/* Info Overlay */}
      <div className="absolute top-3 right-3 text-right">
        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{chainName || 'NO CHAIN SELECTED'}</div>
        <div className="text-xl font-black text-white tracking-tighter">BIT {bitIndex ?? '—'}</div>
      </div>
    </div>
  );
};
