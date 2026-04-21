import React from 'react';
import { cn } from '../../lib/utils';
import { Terminal, Copy, FileCode, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface STILCodeViewerProps {
  content: string;
  title?: string;
  subtitle?: string;
}

export const STILCodeViewer: React.FC<STILCodeViewerProps> = ({ content, title, subtitle }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('STIL Forensic Buffer Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSTIL = (text: string) => {
    // Basic regex highlighting for STIL keywords
    const keywords = /\b(Pattern|V|MacroDefs|Condition|WaveformTable|Procedures|Signals|ScanStructures|Stop|Call|Loop|Ann|Include)\b/g;
    const operators = /[{};=]/g;
    const comments = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
    const strings = /("[^"]*")/g;
    const bits = /\b([01LHX]+)\b/g;

    return text.split('\n').map((line, i) => {
      let highlighted = line
        .replace(keywords, (m) => `<span class="text-indigo-400 font-bold">${m}</span>`)
        .replace(operators, (m) => `<span class="text-slate-500">${m}</span>`)
        .replace(strings, (m) => `<span class="text-emerald-400">${m}</span>`)
        .replace(bits, (m) => `<span class="text-cyan-400 font-mono">${m}</span>`)
        .replace(comments, (m) => `<span class="text-slate-600 italic">${m}</span>`);

      return (
        <div key={i} className="flex group/line hover:bg-slate-800/30 transition-colors">
          <span className="w-10 shrink-0 text-right pr-4 text-slate-700 font-mono text-[10px] select-none border-r border-slate-800/50 group-hover/line:text-slate-500 transition-colors">
            {i + 1}
          </span>
          <pre 
            className="pl-4 text-[11px] font-mono leading-relaxed" 
            dangerouslySetInnerHTML={{ __html: highlighted || ' ' }} 
          />
        </div>
      );
    });
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{title || 'STIL Industrial Record'}</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">{subtitle || 'Forensic Content Trace'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all text-[9px] font-black uppercase tracking-widest"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy Record'}
          </button>
        </div>
      </div>
      <div className="p-0 max-h-[500px] overflow-auto custom-scrollbar bg-slate-950/50">
        <div className="py-4">
          {highlightSTIL(content)}
        </div>
      </div>
      <div className="p-3 border-t border-slate-800/50 bg-slate-900/10 flex items-center justify-between">
        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest flex items-center gap-2">
          <FileCode size={10} /> Industrial Code Engine v2.0
        </p>
        <div className="flex items-center gap-4 text-[8px] font-bold text-slate-700 uppercase tracking-widest">
          <span>{content.split('\n').length} Lines</span>
          <span>{Math.round(content.length / 1024)} KB</span>
        </div>
      </div>
    </div>
  );
};
