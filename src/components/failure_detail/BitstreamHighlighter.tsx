import React from 'react';
import { cn } from '../../lib/utils';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface BitstreamHighlighterProps {
  text: string;
  className?: string;
}

export const BitstreamHighlighter: React.FC<BitstreamHighlighterProps> = ({ text, className }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Bitstream copied to buffer', {
      style: {
        background: '#0f172a',
        color: '#22d3ee',
        border: '1px solid rgba(34,211,238,0.2)',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
      },
    });
  };

  const highlightContent = (content: string) => {
    // Regex to match parts: \r[digits], 0, 1, X, L, H, whitespace
    const parts = content.split(/(\\r\d+|\d+|[XLH ]+)/g).filter(Boolean);
    
    return parts.map((part, i) => {
      if (part.startsWith('\\r')) {
        return <span key={i} className="text-indigo-400 font-bold opacity-100">{part}</span>;
      }
      if (/^\d+$/.test(part)) {
        // Handle strings of 0s and 1s
        return part.split('').map((char, j) => {
          const colorClass = char === '0' ? 'text-slate-500' : 'text-blue-400';
          return <span key={`${i}-${j}`} className={cn(colorClass, "hover:bg-cyan-500/20 transition-colors")}>{char}</span>;
        });
      }
      // Handle special states
      return part.split('').map((char, j) => {
        let colorClass = "text-slate-400";
        if (char === 'X') colorClass = "text-slate-600";
        if (char === 'L') colorClass = "text-emerald-500";
        if (char === 'H') colorClass = "text-amber-500";
        return <span key={`${i}-${j}`} className={cn(colorClass, "font-black")}>{char}</span>;
      });
    });
  };

  return (
    <div className={cn(
      "group relative font-mono selection:bg-cyan-500/30",
      className
    )}>
      <div className="bg-slate-950/60 border border-slate-800/50 rounded-lg p-2.5 pr-10 peer transition-all group-hover:border-indigo-500/30 group-hover:bg-slate-950/80">
        <div className="leading-relaxed break-all text-[11px] tracking-wider">
          {highlightContent(text)}
        </div>
      </div>
      
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-500 opacity-0 group-hover:opacity-100 transition-all hover:text-cyan-400 hover:border-cyan-500/30 shadow-xl"
        title="Copy Bitstream"
      >
        <Copy size={12} />
      </button>
    </div>
  );
};
