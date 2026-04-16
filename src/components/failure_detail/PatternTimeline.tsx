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
  // Aggregate mismatches by pattern clusters
  // For a demo, we'll bucket them into 10 groups
  const bucketSize = Math.max(1, Math.ceil(totalPatterns / 10));
  const data = Array.from({ length: 10 }).map((_, i) => {
    const start = i * bucketSize;
    const end = start + bucketSize;
    const count = details.filter(d => {
      const pNum = parseInt(d.pattern_id.split('_')[1]);
      return pNum >= start && pNum < end;
    }).length;

    return {
      bucket: i === 0 ? 'START' : i === 9 ? 'END' : `+${start}`,
      count
    };
  });

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
       <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="text-emerald-500" size={16} />
            Failure Trend Across Patterns
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
            Temporal distribution of recorded mismatches
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

      <div className="mt-4 flex justify-center gap-10">
         <div className="text-[8px] font-black uppercase text-slate-600 tracking-widest">
            Lower Mismatch Intensity
         </div>
         <div className="text-[8px] font-black uppercase text-slate-600 tracking-widest">
            Scan Pattern Progression →
         </div>
      </div>
    </div>
  );
}
