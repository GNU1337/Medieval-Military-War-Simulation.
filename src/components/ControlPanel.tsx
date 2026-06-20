import React from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Zap, Scale } from 'lucide-react';

interface ControlPanelProps {
  speed: number;
  onSpeedChange: (val: number) => void;
  onReset: () => void;
  onSpawn: (faction: any, type: any) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  speed, 
  onSpeedChange, 
  onReset,
  onSpawn
}) => {
  return (
    <div className="flex flex-col gap-6 p-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-amber-500" />
        <h2 className="text-xl font-sans font-medium tracking-tighter text-white uppercase italic">Tactical Control</h2>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-mono text-white/40 uppercase">Global Phase Frequency</label>
          <span className="text-[10px] font-mono text-amber-400">{speed.toFixed(1)}x</span>
        </div>
        <input 
          type="range" 
          min="0.1" 
          max="2.0" 
          step="0.1" 
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-amber-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[8px] font-mono text-white/20">
          <span>STATIONARY</span>
          <span>OVERDRIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onReset}
          className="col-span-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono text-white/60 uppercase transition-all tracking-widest"
        >
          Re-Initialize Simulation
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-mono text-white/40 uppercase">Faction Reinforcement</p>
        <div className="flex flex-wrap gap-2">
          {['red', 'blue', 'green', 'yellow'].map((color) => (
            <motion.button
              key={color}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSpawn(color, 'WARRIOR')}
              className="px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-[8px] font-mono uppercase text-white/60 hover:border-white/20 transition-colors"
              style={{ borderLeft: `2px solid ${color}` }}
            >
              Spawn {color}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
        <div>
          <p className="text-[10px] font-sans font-bold text-amber-500 uppercase italic">Command Priority</p>
          <p className="text-[9px] text-amber-500/60 leading-tight">Spatial Partitioning active. Maximum entity density achieved without performance degradation.</p>
        </div>
      </div>
    </div>
  );
};
