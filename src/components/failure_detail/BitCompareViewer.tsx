import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  details: any[];
}

const PAGE_SIZE = 20;

function getBadgeStyle(faultType: string) {
  if (faultType === 'STUCK_AT_0') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (faultType === 'STUCK_AT_1') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-slate-800 text-slate-400 border-slate-700';
}

export default function BitCompareViewer({ details }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!details || details.length === 0) return null;

  const displayRows = expanded ? details : details.slice(0, PAGE_SIZE);
  const hasMore = details.length > PAGE_SIZE;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Shield className="text-purple-500" size={16} />
            Expected vs Actual — Bit-Level Record
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
            {details.length} mismatch event{details.length !== 1 ? 's' : ''} recorded from ATE scan-out capture
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] text-red-400 font-black uppercase tracking-widest">{details.length} Conflict{details.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Bit comparison rows — real data from DB */}
      <div className="divide-y divide-slate-800/50">
        {displayRows.map((row, idx) => {
          const isMismatch = String(row.expected_value) !== String(row.actual_value);
          return (
            <div key={idx} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-800/20 transition-colors group">
              {/* Index */}
              <span className="text-[10px] text-slate-700 font-mono w-6 shrink-0 select-none">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Pattern + Chain */}
              <div className="w-36 shrink-0">
                <p className="text-[10px] font-mono text-cyan-400 font-bold truncate">{row.pattern_id}</p>
                <p className="text-[9px] text-slate-500 truncate">{row.chain_name} · FF_{row.flip_flop_position}</p>
              </div>

              {/* Expected bit */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-[9px] text-slate-600 uppercase font-black">EXP</span>
                <span className="font-mono text-base font-black text-emerald-400 bg-emerald-500/10 w-8 h-8 flex items-center justify-center rounded border border-emerald-500/20">
                  {row.expected_value}
                </span>
              </div>

              {/* Arrow */}
              <span className="text-slate-700 text-sm">→</span>

              {/* Actual bit */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-[9px] text-slate-600 uppercase font-black">ACT</span>
                <span className={cn(
                  'font-mono text-base font-black w-8 h-8 flex items-center justify-center rounded border',
                  isMismatch
                    ? 'text-white bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                )}>
                  {row.actual_value}
                </span>
              </div>

              {/* Fault badge */}
              <span className={cn(
                'text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ml-auto',
                getBadgeStyle(row.fault_type)
              )}>
                {row.fault_type ?? 'UNKNOWN'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Show more / collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 hover:bg-slate-800/30 border-t border-slate-800 transition-all"
        >
          {expanded ? (
            <><ChevronUp size={12} /> Show Less</>
          ) : (
            <><ChevronDown size={12} /> Show All {details.length} Records</>
          )}
        </button>
      )}
    </div>
  );
}
