import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChipTestResult } from '../../types/testerTypes';

interface PassFailDonutProps {
  chips: ChipTestResult[];
}

export const PassFailDonut: React.FC<PassFailDonutProps> = ({ chips }) => {
  const passed = chips.filter(c => c.status === 'PASS').length;
  const failed = chips.filter(c => c.status === 'FAIL').length;

  const data = [
    { name: 'PASS', value: passed, color: '#22C55E' },
    { name: 'FAIL', value: failed, color: '#EF4444' },
  ];

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl h-[400px]">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
        Yield Distribution
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={80}
            outerRadius={120}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            formatter={(value) => <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
