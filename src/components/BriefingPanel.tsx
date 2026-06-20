import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { WarBriefing, SimulationState } from '../types';

interface BriefingPanelProps {
  state: SimulationState;
}

export const BriefingPanel: React.FC<BriefingPanelProps> = ({ state }) => {
  const [briefing, setBriefing] = useState<WarBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameState: {
            factions: state?.factions || {},
            unitCount: state?.units?.length || 0,
            tick: state?.tick || 0
          } 
        }),
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setBriefing({
        ...data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      console.error(err);
      setError("Divine intervention failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border-b border-[#2A2A2A] flex flex-col shrink-0 min-h-[300px]">
      <div className="text-[10px] text-emerald font-bold uppercase tracking-widest mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2 text-gold">✧</span> Divine Intervention
        </div>
        <button 
          onClick={generateBriefing}
          disabled={loading}
          className="text-[8px] px-2 py-1 border border-emerald/20 hover:bg-emerald/10 transition-all font-mono"
        >
          {loading ? 'CONSULTING...' : 'INVOKE'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center text-[10px] font-mono text-emerald/40 uppercase italic"
          >
            Consulting the War-Gods...
          </motion.div>
        ) : error ? (
           <div className="text-[10px] text-red-500/60 italic p-4 text-center font-mono uppercase">{error}</div>
        ) : briefing ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs leading-relaxed font-serif italic text-gray-400 space-y-3"
          >
            <p>"{briefing.analysis}"</p>
            <div className="pt-4 border-t border-white/5 space-y-2">
              <p className="text-[9px] font-mono text-gold uppercase not-italic">Logistics Audit</p>
              <p className="not-italic text-[10px]">
                {typeof briefing.resourceDistribution === 'object' 
                  ? JSON.stringify(briefing.resourceDistribution, null, 2) 
                  : briefing.resourceDistribution}
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <p className="text-[9px] font-mono text-emerald uppercase not-italic">Tactical Edict</p>
              <p className="not-italic text-[10px]">
                {typeof briefing.tacticalAdvice === 'object' 
                  ? JSON.stringify(briefing.tacticalAdvice, null, 2) 
                  : briefing.tacticalAdvice}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/10 text-center px-6 italic text-xs font-light">
            No active dispatches. Request a briefing to analyze the tactical theater.
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
