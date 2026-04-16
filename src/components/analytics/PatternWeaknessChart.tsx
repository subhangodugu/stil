import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Target } from 'lucide-react';

interface Props {
  patterns: any[];
}

export const PatternWeaknessChart: React.FC<Props> = ({ patterns }) => {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            Weak Pattern Analysis
            <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[8px]">Sensitivity Map</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Identifying patterns with abnormal fail rates</p>
        </div>
        <Target className="text-amber-500" size={20} />
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={patterns} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="patternId" 
              type="category" 
              stroke="#475569" 
              fontSize={10} 
              width={70}
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
            />
            <Bar dataKey="failCount" radius={[0, 4, 4, 0]}>
              {patterns.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.failCount > 50 ? '#ef4444' : '#f59e0b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="text-red-500">Critical ({'>'}50)</span>
        <span className="text-amber-500">Warning ({'>'}20)</span>
        <span className="text-slate-500">Baseline</span>
      </div>
    </div>
  );
};
