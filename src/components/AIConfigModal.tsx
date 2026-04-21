import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Cpu, Zap, Shield, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', description: 'Best for complex STIL structural analysis' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (High Context)', description: 'Optimized for large failure logs' },
  { id: 'llama3-70b-8192', name: 'Llama 3 70B (Standard)', description: 'Fast, reliable diagnostic insights' },
  { id: 'llama3-8b-8192', name: 'Llama 3 8B (Speed)', description: 'Real-time telemetry classification' },
];

export const AIConfigModal: React.FC<AIConfigModalProps> = ({ isOpen, onClose }) => {
  const { aiConfig, setAIConfig } = useStore();
  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(aiConfig.model);

  const handleSave = () => {
    setAIConfig({ 
      apiKey: apiKey.trim() || null, 
      model: selectedModel 
    });
    toast.success('Industrial AI Configuration Cached');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[210] p-1 bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 rounded-3xl"
          >
            <div className="bg-slate-900 rounded-[22px] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">AI Diagnostic Configuration</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Groq Intelligence Node</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* API Key Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Key size={12} className="text-cyan-400" /> Groq API Key
                    </label>
                    <span className="text-[9px] text-slate-600 italic">Credentials are stored locally</span>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-cyan-50 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    Note: If blank, the system will attempt to use the server-side environment key.
                  </p>
                </div>

                {/* Model Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={12} className="text-indigo-400" /> AI Engine Selection
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`text-left p-3 rounded-xl border transition-all group ${
                          selectedModel === model.id 
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-white' 
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase tracking-tight">{model.name}</span>
                          {selectedModel === model.id && <Zap size={12} className="text-indigo-400 fill-indigo-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-none group-hover:text-slate-400">{model.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-[2] px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Synchronize Configuration
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
