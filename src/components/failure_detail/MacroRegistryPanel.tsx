import React, { useState } from 'react';
import { Database, Search, FileCode, ArrowRight, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { BitstreamHighlighter } from './BitstreamHighlighter';

export default function MacroRegistryPanel() {
  const { projectData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  if (!projectData || !projectData.macros || Object.keys(projectData.macros).length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
        <Database className="mx-auto text-slate-700 mb-4" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Industrial Macros Detected</p>
      </div>
    );
  }

  const macros = projectData.macros;
  const macroNames = Object.keys(macros);
  const allMappings = macroNames.flatMap(name => 
    (macros[name] || []).map(m => ({ ...m, macroName: name }))
  );

  const filteredMappings = allMappings.filter(m => 
    m.signal.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.macroName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-800/50 bg-slate-900/20 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <FileCode className="text-cyan-400" size={18} /> Industrial Macro Registry
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            {macroNames.length} Blocks · {allMappings.length} Signal Mappings
          </p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search Signal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-[10px] text-white focus:border-cyan-500 outline-none w-48 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar max-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Macro Block</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Internal Signal</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Bitstream Mapping</th>
            </tr>
          </thead>
          <tbody>
            {filteredMappings.map((m, i) => (
              <tr key={i} className="group hover:bg-cyan-500/5 transition-colors">
                <td className="px-6 py-3 border-b border-slate-800/50">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200">{m.macroName}</span>
                </td>
                <td className="px-6 py-3 border-b border-slate-800/50">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{m.signal}</span>
                </td>
                <td className="px-6 py-3 border-b border-slate-800/50">
                   <BitstreamHighlighter text={m.bitstream} />
                </td>
              </tr>
            ))}
            {filteredMappings.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                  No signals found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
