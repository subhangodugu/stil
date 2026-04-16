import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  data: any[];
}

export const YieldTrendChart: React.FC<Props> = ({ data }) => {
  const isDeclining = data.length > 1 && data[data.length - 1].avgYield < data[data.length - 2].avgYield;
  const currentYield = data.length > 0 ? data[data.length - 1].avgYield : 0;

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            Historical Yield Integrity
            {isDeclining ? (
              <span className="text-red-500 flex items-center gap-1 text-[8px] animate-pulse bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                <TrendingDown size={10} /> Regression Detected
              </span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1 text-[8px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <TrendingUp size={10} /> Stable Performance
              </span>
            )}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Aggregate results across {data.length} test batches</p>
        </div>
        
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-black">Current Average</p>
          <p className={`text-2xl font-black ${currentYield > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {currentYield}%
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="batchName" 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => val.split('Batch_')[1] || val}
            />
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
            />
            <Area 
              type="monotone" 
              dataKey="avgYield" 
              stroke="#06b6d4" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#yieldGradient)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {isDeclining && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest"
        >
          <AlertCircle size={14} />
          Yield regression detected in latest batch. Recommend hotspot audit.
        </motion.div>
      )}
    </div>
  );
};
