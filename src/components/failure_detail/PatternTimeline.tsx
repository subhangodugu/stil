import React from 'react';
import { BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface Props {
  details: any[];
  totalPatterns: number;
}

export default function PatternTimeline({ details, totalPatterns }: Props) {
  if (details.length === 0 || totalPatterns === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
          <BarChart3 className="text-emerald-500" size={16} />
          Failure Trend Across Patterns
        </h3>
        <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-xl">
          <p className="text-slate-600 text-xs font-black uppercase tracking-widest">
            No mismatch events recorded for this batch.
          </p>
        </div>
      </div>
    );
  }

  // Dynamic bucket count — 1:1 for small pattern sets, max 10 buckets for large
  const bucketCount = Math.min(totalPatterns, 10);
  const bucketSize = Math.max(1, Math.ceil(totalPatterns / bucketCount));

  const data = Array.from({ length: bucketCount }).map((_, i) => {
    const start = i * bucketSize;
    const end = start + bucketSize;
    const count = details.filter(d => {
      const pNumMatch = (d.pattern_id ?? '').match(/\d+/);
      const pNum = pNumMatch ? parseInt(pNumMatch[0]) : 0;
      return pNum >= start && pNum < end;
    }).length;

    let label: string;
    if (bucketCount <= 5) {
      // 1:1 — show actual pattern index
      label = `P${start}`;
    } else {
      label = i === 0 ? 'START' : i === bucketCount - 1 ? 'END' : `+${start}`;
    }

    return { bucket: label, count };
  });

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="text-emerald-500" size={16} />
            Failure Trend Across Patterns
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
            {totalPatterns} pattern{totalPatterns !== 1 ? 's' : ''} · {details.length} total mismatch{details.length !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="bucket"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
              allowDecimals={false}
              domain={[0, maxCount + 1]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff'
              }}
              itemStyle={{ color: '#10b981' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#10b981' : '#1e293b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
