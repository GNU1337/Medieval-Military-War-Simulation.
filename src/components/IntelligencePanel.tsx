import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { SimulationState, FactionColor, UnitType } from '../types';
import { motion } from 'motion/react';

interface IntelligencePanelProps {
  state: SimulationState;
  onSpawn: (faction: FactionColor, type: UnitType) => void;
  onUpgrade: (faction: FactionColor, upgradeKey: 'plateArmor' | 'fastCavalry' | 'phalanxCoordination') => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ state, onSpawn, onUpgrade }) => {
  const factions = Object.values(state?.factions || {}) as any[];
  
  const chartData = factions.map(f => ({
    name: f.name,
    population: f.population,
    gold: Math.floor(f.gold),
    color: f.color,
  }));

  return (
    <div className="flex flex-col gap-6 h-full font-sans">
      <div className="space-y-4">
        <div className="text-[10px] text-gold font-bold uppercase tracking-widest border-b border-gold/20 pb-1 flex items-center justify-between">
          <span>Kingdom Sovereignty</span>
          <span className="text-[8px] opacity-40 font-mono">SEC_07</span>
        </div>
        
        {factions.map((f) => (
          <div key={f.id} className="group cursor-pointer">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold tracking-tight uppercase">{f.name.split(' ')[0]}</span>
              <span className="text-[10px] font-mono opacity-50 underline italic">{Math.floor(f.gold)} Gold</span>
            </div>
            <div className="h-1 bg-[#222] w-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: `${Math.min(100, (f.population / 20) * 100)}%` }}
                className="h-full"
                style={{ backgroundColor: f.color }}
              />
            </div>
            <div className="flex justify-between mt-1 items-center">
              <span className="text-[9px] opacity-40 uppercase">Force: {f.population}</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => onSpawn(f.id, UnitType.WARRIOR)}
                  title="Spawn Vanguard (Warrior)"
                  className="text-[8px] text-gold border border-gold/20 px-1.5 py-0.5 bg-gold/5 hover:bg-gold/20 transition-colors uppercase font-mono"
                >
                  V
                </button>
                <button 
                  onClick={() => onSpawn(f.id, UnitType.WORKER)}
                  title="Spawn Logistics (Worker)"
                  className="text-[8px] text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 bg-emerald-400/5 hover:bg-emerald-400/20 transition-colors uppercase font-mono"
                >
                  L
                </button>
                <button 
                  onClick={() => onSpawn(f.id, UnitType.SCOUT)}
                  title="Spawn Intel (Scout)"
                  className="text-[8px] text-blue-400 border border-blue-400/20 px-1.5 py-0.5 bg-blue-400/5 hover:bg-blue-400/20 transition-colors uppercase font-mono"
                >
                  I
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[8px] font-mono">
              <span className="opacity-30 uppercase">Research (200G):</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => onUpgrade(f.id, 'plateArmor')}
                  disabled={f.gold < 200 || f.upgrades.plateArmor}
                  className={`px-1 py-0.5 border rounded transition-colors uppercase ${f.upgrades.plateArmor ? 'bg-gold/10 border-gold text-gold font-bold' : f.gold >= 200 ? 'border-white/30 hover:bg-white/10 text-white/80 hover:text-white' : 'border-white/5 text-white/25 cursor-not-allowed'}`}
                  title="Plate Armor (+50% Vanguard MaxHealth)"
                >
                  Armor
                </button>
                <button 
                  onClick={() => onUpgrade(f.id, 'fastCavalry')}
                  disabled={f.gold < 200 || f.upgrades.fastCavalry}
                  className={`px-1 py-0.5 border rounded transition-colors uppercase ${f.upgrades.fastCavalry ? 'bg-indigo-400/10 border-indigo-400 text-indigo-300 font-bold' : f.gold >= 200 ? 'border-white/30 hover:bg-white/10 text-white/80 hover:text-white' : 'border-white/5 text-white/25 cursor-not-allowed'}`}
                  title="Fast Cavalry (+50% Intel Scout Speed)"
                >
                  Speed
                </button>
                <button 
                  onClick={() => onUpgrade(f.id, 'phalanxCoordination')}
                  disabled={f.gold < 200 || f.upgrades.phalanxCoordination}
                  className={`px-1 py-0.5 border rounded transition-colors uppercase ${f.upgrades.phalanxCoordination ? 'bg-emerald-400/10 border-emerald-400 text-emerald-300 font-bold' : f.gold >= 200 ? 'border-white/30 hover:bg-white/10 text-white/80 hover:text-white' : 'border-white/5 text-white/25 cursor-not-allowed'}`}
                  title="Phalanx Coordination (Vanguard proximity combat damage multiplier)"
                >
                  Phalanx
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-end pt-4 min-h-[140px]">
        <div className="text-[10px] text-gold/40 border-b border-white/5 mb-3 uppercase tracking-widest pb-1">Power distribution</div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="population">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-[8px] text-center opacity-30 uppercase tracking-tighter font-mono">
          Population Spectrum (Staplegram)
        </div>
      </div>
    </div>
  );
};
