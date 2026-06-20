import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { SimulationState, FactionColor } from '../types';
import { Swords, Hourglass, Zap, Award, BarChart3, TrendingUp } from 'lucide-react';

interface StatisticsPanelProps {
  state: SimulationState;
}

export function StatisticsPanel({ state }: StatisticsPanelProps) {
  const { stats, factions } = state;

  if (!stats || !stats.factionStats) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#0F0F0F] text-[#E4E3E0] font-mono text-xs p-8 text-center uppercase tracking-widest opacity-40">
        <BarChart3 className="w-8 h-8 mb-4 animate-pulse" />
        Syncing Analytics Engine...
      </div>
    );
  }

  // Determine Most Active Faction based on total activity index
  // Activity = goldGathered + (kills * 10) + (unitsSpawned * 5)
  const mostActiveFaction = useMemo(() => {
    let bestFaction: FactionColor = 'red';
    let maxActivity = -1;

    (Object.keys(factions) as FactionColor[]).forEach(color => {
      const fStats = stats.factionStats[color];
      if (!fStats) return;
      const activity = (fStats.goldGathered || 0) + (fStats.kills || 0) * 10 + (fStats.unitsSpawned || 0) * 5;
      if (activity > maxActivity) {
        maxActivity = activity;
        bestFaction = color;
      }
    });

    return {
      color: bestFaction,
      name: factions[bestFaction]?.name || 'Unknown',
      hex: factions[bestFaction]?.color || '#ffffff',
      activity: maxActivity
    };
  }, [stats.factionStats, factions]);

  // Format historical trend data for the charts
  const historyData = useMemo(() => {
    return stats.history.map(h => ({
      ...h,
      tickLabel: `T-${h.tick}`
    }));
  }, [stats.history]);

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] text-[#E4E3E0] font-mono text-xs select-none">
      {/* HEADER */}
      <div className="p-4 border-b border-[#2A2A2A] bg-[#141414] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-[#FFD700] animate-pulse" />
          <span className="font-bold tracking-[0.2em] uppercase text-white">TACTICAL_ANALYTICS</span>
        </div>
        <div className="text-[9px] text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-1.5 py-0.5 rounded uppercase">
          LIVE_STREAM
        </div>
      </div>

      {/* METRIC GRID */}
      <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
        <div className="p-3 border border-[#2A2A2A] bg-[#141414] flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-white/50 text-[9px] tracking-wider uppercase mb-1">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            <span>UNITS_DESTROYED</span>
          </div>
          <span className="text-xl font-bold text-red-400 tracking-tight">
            {stats.totalUnitsDestroyed}
          </span>
        </div>

        <div className="p-3 border border-[#2A2A2A] bg-[#141414] flex flex-col justify-between">
          <div className="flex items-center space-x-1.5 text-white/50 text-[9px] tracking-wider uppercase mb-1">
            <Hourglass className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>AVG_ENGAGEMENT</span>
          </div>
          <span className="text-xl font-bold text-sky-400 tracking-tight">
            {stats.averageEngagementDuration !== undefined ? stats.averageEngagementDuration : 15.0} <span className="text-[10px] font-normal text-white/40">Ticks</span>
          </span>
        </div>

        <div className="col-span-2 p-3 border border-[#2A2A2A] bg-[#141414] flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 text-white/50 text-[9px] tracking-wider uppercase mb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>DOMINANT_INFLUENCE</span>
            </div>
            <span className="text-sm font-bold uppercase transition-all" style={{ color: mostActiveFaction.hex }}>
              {mostActiveFaction.name}
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[8px] opacity-40 uppercase">TACTICAL_INDEX</span>
            <span className="text-xs font-semibold text-white/85">{mostActiveFaction.activity} IDX</span>
          </div>
        </div>
      </div>

      {/* DETAILED FACTION STATS COLLAPSIBLE/LIST */}
      <div className="px-4 pb-2 flex-col space-y-1.5 shrink-0">
        <span className="text-[9px] text-white/40 uppercase tracking-[0.15em] block mb-2">FACTIONAL_DISPATCH_MATRIX</span>
        {(Object.keys(factions) as FactionColor[]).map(color => {
          const faction = factions[color];
          const fStats = stats.factionStats[color] || { goldGathered: 0, unitsSpawned: 0, kills: 0 };
          return (
            <div key={color} className="p-2 border border-[#222] bg-[#111] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: faction.color }}></span>
                <span className="font-bold text-[10px] text-white/95 uppercase">{faction.name.split(' ')[0]}</span>
              </div>
              <div className="flex items-center space-x-4 text-[9px] text-white/60">
                <span title="Gold Gathered"><span className="text-amber-400 font-semibold">{fStats.goldGathered}</span>G</span>
                <span title="Units Spawned"><span className="text-sky-400 font-semibold">{fStats.unitsSpawned}</span>S</span>
                <span title="Kills"><span className="text-red-400 font-semibold">{fStats.kills}</span>K</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CHARTS CONTAINER */}
      <div className="flex-1 px-4 py-2 flex flex-col space-y-4 overflow-y-auto min-h-[220px]">
        {/* POPULATION TRENDS CHART */}
        <div className="flex flex-col flex-1 min-h-[160px] p-2 border border-[#1F1F1F] bg-[#111]/40 rounded-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-[#10B981]" />
              <span className="text-[9px] uppercase tracking-wider text-white/70">Population Sovereignty (Timeline)</span>
            </div>
          </div>
          {historyData.length <= 1 ? (
            <div className="flex-1 flex items-center justify-center text-[10px] text-white/30 italic uppercase tracking-wider">
              Syncing Timeline Stream...
            </div>
          ) : (
            <div className="flex-1 w-full text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="tickLabel" stroke="#444" fontSize={8} />
                  <YAxis stroke="#444" fontSize={8} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0B0B', borderColor: '#333', fontSize: '9px', fontFamily: 'monospace' }} 
                    labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={16} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '8px' }} />
                  <Area type="monotone" name="Legion" dataKey="redPop" stroke="#ff4444" fill="rgba(255, 68, 68, 0.08)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" name="Guard" dataKey="bluePop" stroke="#4444ff" fill="rgba(68, 68, 255, 0.08)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" name="Host" dataKey="greenPop" stroke="#44ff44" fill="rgba(68, 255, 68, 0.08)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" name="Order" dataKey="yellowPop" stroke="#ffff44" fill="rgba(255, 255, 68, 0.08)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GOLD RESERVES TRENDS CHART */}
        <div className="flex flex-col flex-1 min-h-[160px] p-2 border border-[#1F1F1F] bg-[#111]/40 rounded-sm mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] uppercase tracking-wider text-white/70">Vault Reserves (Timeline GG)</span>
            </div>
          </div>
          {historyData.length <= 1 ? (
            <div className="flex-1 flex items-center justify-center text-[10px] text-white/30 italic uppercase tracking-wider">
              Loading Vault Ledger...
            </div>
          ) : (
            <div className="flex-1 w-full text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="tickLabel" stroke="#444" fontSize={8} />
                  <YAxis stroke="#444" fontSize={8} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0B0B', borderColor: '#333', fontSize: '9px', fontFamily: 'monospace' }} 
                    labelStyle={{ color: '#aaa', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={16} iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '8px' }} />
                  <Line type="monotone" name="Legion" dataKey="redGold" stroke="#ff4444" strokeWidth={1.2} dot={false} />
                  <Line type="monotone" name="Guard" dataKey="blueGold" stroke="#4444ff" strokeWidth={1.2} dot={false} />
                  <Line type="monotone" name="Host" dataKey="greenGold" stroke="#44ff44" strokeWidth={1.2} dot={false} />
                  <Line type="monotone" name="Order" dataKey="yellowGold" stroke="#ffff44" strokeWidth={1.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
