import React from 'react';
import { useStore } from '../../store/useStore';
import { WaveformViewer } from './WaveformViewer';
import { 
    Search, Maximize2, Minimize2, ChevronLeft, 
    ChevronRight, Zap, Target, Activity, Share2
} from 'lucide-react';

export const WaveformPanel: React.FC = () => {
    const { projectData, waveformFocus, setWaveformFocus } = useStore();
    const { chainName, bitIndex, zoom, offset, autoScroll } = waveformFocus;

    if (!projectData) return null;

    const handleZoom = (delta: number) => {
        setWaveformFocus({ zoom: Math.min(Math.max(zoom + delta, 0.1), 5) });
    };

    const handleScroll = (delta: number) => {
        setWaveformFocus({ offset: Math.max(offset + delta, 0), autoScroll: false });
    };

    const handleSnapToFirstFail = () => {
        const firstFail = (projectData.localizedFaults || []).find(f => 
            (!chainName || f.chainName === chainName) && (bitIndex === null || f.ffPosition === bitIndex)
        );
        
        if (firstFail) {
            // Find pattern index
            const patterns = (projectData as any).patterns || [];
            const pIdx = patterns.findIndex((p: any) => p.patternId === firstFail.patternId);
            if (pIdx !== -1) {
                const patternWidth = 40 * zoom;
                setWaveformFocus({ 
                    offset: pIdx * patternWidth - 100, 
                    chainName: firstFail.chainName,
                    bitIndex: firstFail.ffPosition,
                    autoScroll: false 
                });
            }
        }
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
            {/* Control Header */}
            <div className="p-4 border-b border-slate-800/60 bg-slate-900/20 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                        <Activity size={14} className="text-cyan-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Waveform Monitor</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button 
                            onClick={() => handleZoom(-0.2)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Zoom Out"
                        >
                            <Minimize2 size={14} />
                        </button>
                        <div className="w-px h-4 bg-slate-800 mx-1" />
                        <button 
                            onClick={() => handleZoom(0.2)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Zoom In"
                        >
                            <Maximize2 size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button 
                            onClick={() => handleScroll(-100)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button 
                            onClick={() => handleScroll(100)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSnapToFirstFail}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <Target size={14} />
                        Snap to First Fail
                    </button>
                    <button 
                        onClick={() => setWaveformFocus({ autoScroll: !autoScroll })}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            autoScroll ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-slate-800/10 text-slate-500 border-slate-800'
                        }`}
                    >
                        <Zap size={14} className={autoScroll ? 'animate-pulse' : ''} />
                        Live Sync
                    </button>
                </div>
            </div>

            {/* Main Viewer Area */}
            <div className="flex-1 p-6 min-h-[300px]">
                <WaveformViewer height={350} />
            </div>

            {/* Footer / Selector Info */}
            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="space-y-1">
                        <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Active Chain</div>
                        <div className="text-xs font-bold text-slate-300">{chainName || 'None Selected'}</div>
                    </div>
                    <div className="w-px h-6 bg-slate-800" />
                    <div className="space-y-1">
                        <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Bit Index</div>
                        <div className="text-xs font-bold text-slate-300">{bitIndex !== null ? `#${bitIndex}` : '—'}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Temporal Resolution</div>
                        <div className="text-xs font-bold text-cyan-400">{(zoom * 100).toFixed(0)}% Scale</div>
                    </div>
                    <button className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-all">
                        <Share2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
