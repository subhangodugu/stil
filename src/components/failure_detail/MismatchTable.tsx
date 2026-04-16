import React from 'react';
import { Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  details: any[];
}

export default function MismatchTable({ details }: Props) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Terminal className="text-cyan-500" size={16} />
          Pattern-Level Mismatch Log
        </h3>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">
          {details.length} Records
        </span>
      </div>

      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Pattern ID</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Chain</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">FF Pos</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Expected</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Actual</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-3">
                  <span className="text-xs font-mono text-cyan-400 font-bold">{row.pattern_id}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs font-bold text-slate-300">{row.chain_name}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs font-mono text-slate-400">{row.flip_flop_position}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs font-black text-emerald-500">{row.expected_value}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs font-black text-red-500">{row.actual_value}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
                    MISMATCH
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
