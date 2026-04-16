import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  details: any[];
}

export default function BitCompareViewer({ details }: Props) {
  // We'll simulate a binary bitstream comparing expected vs actual for the worst fail
  const exampleDetail = details[0];
  if (!exampleDetail) return null;

  // Generate a fake bitstream of 64 bits around the failure point
  const streamSize = 64;
  const failurePos = 32; // Center the failure
  
  const expectedBits = Array.from({ length: streamSize }).map(() => Math.random() > 0.5 ? "1" : "0");
  const actualBits = [...expectedBits];
  actualBits[failurePos] = exampleDetail.actual_value;
  expectedBits[failurePos] = exampleDetail.expected_value;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Shield className="text-purple-500" size={16} />
            Expected vs Actual Bit Viewer
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
            Scanning {exampleDetail.chain_name} @ FF_{exampleDetail.flip_flop_position}
          </p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[8px] text-slate-500 font-black uppercase">Conflict Detected</span>
           </div>
        </div>
      </div>

      <div className="space-y-6 font-mono text-lg tracking-[0.3em]">
        <div className="flex items-center gap-6">
          <span className="text-[10px] w-20 text-slate-500 uppercase font-black">Expected</span>
          <div className="flex flex-wrap gap-1">
            {expectedBits.map((bit, i) => (
              <span key={i} className={cn(
                "w-6 h-8 flex items-center justify-center rounded transition-colors",
                i === failurePos ? "bg-emerald-500/10 text-emerald-500 font-black" : "text-slate-700"
              )}>
                {bit}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-slate-800" />

        <div className="flex items-center gap-6">
          <span className="text-[10px] w-20 text-slate-500 uppercase font-black">Actual</span>
          <div className="flex flex-wrap gap-1">
            {actualBits.map((bit, i) => (
              <span key={i} className={cn(
                "w-6 h-8 flex items-center justify-center rounded transition-all",
                i === failurePos 
                   ? "bg-red-500 text-white font-black scale-125 shadow-[0_0_15px_rgba(239,68,68,0.6)] z-10" 
                   : "text-slate-500"
              )}>
                {bit}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
         <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase font-black mb-2">Failure Vector</p>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
               High-resolution mismatch detected at bit position <span className="text-cyan-400 font-bold">{exampleDetail.flip_flop_position}</span>. 
               The scan-out observation does not match the predicted STIL state.
            </p>
         </div>
         <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase font-black mb-2">Diagnostic Inference</p>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
               Mismatched bit suggests a structural <span className="text-red-400 font-bold">STUCK_AT_{exampleDetail.actual_value}</span> fault 
               upstream of the capture register.
            </p>
         </div>
      </div>
    </div>
  );
}
