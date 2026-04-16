import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChipTestResult } from '../../types/testerTypes';

interface MismatchBarChartProps {
  chips: ChipTestResult[];
}

export const MismatchBarChart: React.FC<MismatchBarChartProps> = ({ chips }) => {
  // Take last 15 chips for readability
  const data = chips.slice(0, 15).map(c => ({
    name: c.chip_id.length > 10 ? c.chip_id.substring(0, 8) + '...' : c.chip_id,
    mismatches: c.mismatches,
    status: c.status,
  })).reverse();

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl h-[400px]">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        Mismatch Severity by Chip
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#475569" 
            fontSize={10} 
            tick={{ fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#475569" 
            fontSize={10} 
            tick={{ fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }}
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
          />
          <Bar dataKey="mismatches" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.status === 'PASS' ? '#22C55E' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
