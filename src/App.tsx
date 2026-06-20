/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { World } from './lib/World';
import { SimulationView } from './components/SimulationView';
import { IntelligencePanel } from './components/IntelligencePanel';
import { BriefingPanel } from './components/BriefingPanel';
import { WorkspacePanel } from './components/WorkspacePanel';
import { StatisticsPanel } from './components/StatisticsPanel';
import { Sword, LogIn, Shield, ShieldAlert } from 'lucide-react';
import { FactionColor, UnitType } from './types';

export default function App() {
  const worldRef = useRef<World>(new World());
  const [state, setState] = useState(worldRef.current.state);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tickLatency, setTickLatency] = useState(0);
  const [activeTab, setActiveTab] = useState<'map' | 'intel' | 'logs' | 'stats'>('map');

  // Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const start = performance.now();
      worldRef.current.update();
      const latency = performance.now() - start;
      
      if (worldRef.current.state.tick % 2 === 0) {
        setTickLatency(latency);
        setState({ ...worldRef.current.state });
      }
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Auto-save logic
  useEffect(() => {
    const saveInterval = setInterval(() => {
      localStorage.setItem('war_master_state', JSON.stringify(worldRef.current.state));
    }, 5000);

    const saved = localStorage.getItem('war_master_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new fields exist for backward compatibility
        if (!parsed.influenceGrid) parsed.influenceGrid = {};
        if (!parsed.flagZones) {
          parsed.flagZones = worldRef.current.state.flagZones;
        }
        if (!parsed.stats) {
          parsed.stats = worldRef.current.state.stats;
        }
        
        worldRef.current.state = parsed;
        setState({ ...parsed });
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }

    return () => clearInterval(saveInterval);
  }, []);

  const handleSpeedChange = (val: number) => {
    worldRef.current.state.globalSpeedMultiplier = val;
    setState({ ...worldRef.current.state });
  };

  const handleReset = () => {
    worldRef.current = new World();
    setState({ ...worldRef.current.state });
  };

  const handleSpawn = (faction: FactionColor, type: UnitType) => {
    worldRef.current.spawnUnit(faction, type);
    setState({ ...worldRef.current.state });
  };

  const handleUpgrade = (faction: FactionColor, upgradeKey: 'plateArmor' | 'fastCavalry' | 'phalanxCoordination') => {
    worldRef.current.buyUpgrade(faction, upgradeKey);
    setState({ ...worldRef.current.state });
  };

  const handleAuth = () => {
    const token = prompt("Enter your Google Access Token (for prototype testing):");
    if (token) {
      (window as any).googleAccessToken = token;
      setIsAuthorized(true);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#0D0D0D] text-[#E4E3E0] font-sans overflow-hidden select-none">
      {/* TOP BAR */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-[#2A2A2A] bg-[#111] z-20 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 flex items-center justify-center border border-[#FFD700] bg-[#FFD700]/10">
            <div className="w-2 h-2 bg-[#FFD700] rotate-45 animate-pulse"></div>
          </div>
          <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-[#FFD700]">War-Master // Command Core</h1>
        </div>
        <div className="flex items-center space-x-8 text-[10px] tracking-widest uppercase opacity-60 font-mono">
          <span>Tick: <span className="text-[#E4E3E0]">{state.tick.toString().padStart(6, '0')}</span></span>
          <span>Entities: <span className="text-[#E4E3E0]">{state.units.length}</span></span>
          <span>Speed: <span className="text-[#10B981]">{state.globalSpeedMultiplier.toFixed(2)}x</span></span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isAuthorized ? 'bg-[#10B981]' : 'bg-red-500 animate-pulse'}`}></div>
            <span className={isAuthorized ? 'text-[#10B981]' : 'text-red-500'}>
              {isAuthorized ? 'System Nominal' : 'Authorization Required'}
            </span>
          </div>
          <button 
            onClick={handleAuth}
            className="px-2 py-1 border border-white/10 hover:bg-white/5 transition-colors"
          >
            {isAuthorized ? <Shield className="w-3 h-3 text-[#10B981]" /> : <LogIn className="w-3 h-3" />}
          </button>
        </div>
      </header>

      {/* MOBILE TAB CONTROLLER */}
      <div id="mobile_tab_bar" className="flex lg:hidden bg-[#111] border-b border-[#2A2A2A] h-10 shrink-0 font-mono text-[9px] z-10">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 flex items-center justify-center border-r border-[#2A2A2A] uppercase tracking-widest transition-all ${
            activeTab === 'map' ? 'text-[#FFD700] bg-[#FFD700]/5 font-bold border-b-2 border-b-[#FFD700]' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Tactical Map
        </button>
        <button
          onClick={() => setActiveTab('intel')}
          className={`flex-1 flex items-center justify-center border-r border-[#2A2A2A] uppercase tracking-widest transition-all ${
            activeTab === 'intel' ? 'text-[#FFD700] bg-[#FFD700]/5 font-bold border-b-2 border-b-[#FFD700]' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Faction Intel
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 flex items-center justify-center border-r border-[#2A2A2A] uppercase tracking-widest transition-all ${
            activeTab === 'logs' ? 'text-[#FFD700] bg-[#FFD700]/5 font-bold border-b-2 border-b-[#FFD700]' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Briefing
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center uppercase tracking-widest transition-all ${
            activeTab === 'stats' ? 'text-[#FFD700] bg-[#FFD700]/5 font-bold border-b-2 border-b-[#FFD700]' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Statistics
        </button>
      </div>

      {/* MAIN INTERFACE: TRIPTYCH LAYOUT */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT: FACTIONAL SOVEREIGNTY */}
        <aside id="intel_panel_aside" className={`${activeTab === 'intel' ? 'flex w-full' : 'hidden'} lg:flex lg:w-64 border-r border-[#2A2A2A] bg-[#0F0F0F] flex-col p-4 space-y-6 overflow-y-auto shrink-0`}>
          <IntelligencePanel state={state} onSpawn={handleSpawn} onUpgrade={handleUpgrade} />
        </aside>
 
        {/* CENTER: TACTICAL CANVAS */}
        <section id="tactical_canvas_section" className={`${activeTab === 'map' ? 'flex' : 'hidden'} lg:flex flex-grow relative bg-[#0D0D0D] overflow-hidden flex items-center justify-center`}>
          <SimulationView state={state} tickLatency={tickLatency} />
        </section>
 
        {/* RIGHT: INTELLIGENCE & CHRONICLES */}
        <aside id="briefing_panel_aside" className={`${activeTab === 'logs' || activeTab === 'stats' ? 'flex w-full' : 'hidden'} lg:flex lg:w-72 border-l border-[#2A2A2A] bg-[#0F0F0F] flex-col overflow-hidden shrink-0`}>
          {/* Desktop Right Sidebar selector */}
          <div className="hidden lg:flex border-b border-[#2A2A2A] h-10 shrink-0 font-mono text-[9px] bg-[#141414]">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 flex items-center justify-center uppercase tracking-widest transition-all border-r border-[#2A2A2A] ${
                activeTab === 'logs' ? 'text-[#FFD700] bg-[#FFD700]/5 font-bold border-b-2 border-b-[#FFD700]' : 'text-white/40 hover:text-[#FFD700]'
              }`}
            >
              Briefing Logs
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 flex items-center justify-center uppercase tracking-widest transition-all ${
                activeTab === 'stats' ? 'text-[#FFD700] bg-[#FFD700]/5 font-bold border-b-2 border-b-[#FFD700]' : 'text-white/40 hover:text-[#FFD700]'
              }`}
            >
              Timeline Stats
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {activeTab === 'stats' ? (
              <StatisticsPanel state={state} />
            ) : (
              <>
                <BriefingPanel state={state} />
                <div className="mt-auto border-t border-[#2A2A2A]">
                  <WorkspacePanel state={state} />
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
 
      {/* FOOTER: KINETIC CONTROLS */}
      <footer className="min-h-20 lg:h-20 border-t border-[#2A2A2A] bg-[#111] px-6 lg:px-10 py-4 lg:py-0 flex flex-col lg:flex-row items-center gap-4 lg:space-x-12 shrink-0 overflow-y-auto">
        <div className="flex flex-col space-y-2 w-full lg:w-64 shrink-0">
          <div className="flex justify-between text-[10px] tracking-widest uppercase">
            <span className="text-[#FFD700]">Kinetic Phasing</span>
            <span className="font-mono">{state.globalSpeedMultiplier.toFixed(2)}x</span>
          </div>
          <div className="relative h-1 bg-[#222] w-full rounded-full group">
            <input 
              type="range" 
              min="0.1" 
              max="2.0" 
              step="0.1" 
              value={state.globalSpeedMultiplier}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute top-0 left-0 h-full bg-[#FFD700] rounded-full"
              style={{ width: `${(state.globalSpeedMultiplier / 2) * 100}%` }}
            ></div>
            <div 
              className="absolute -top-1.5 w-4 h-4 rounded-full bg-[#FFD700] shadow-[0_0_10px_#FFD700] pointer-events-none"
              style={{ left: `calc(${(state.globalSpeedMultiplier / 2) * 100}% - 8px)` }}
            ></div>
          </div>
        </div>
        
        <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
          <div className="flex flex-col">
            <span className="text-[9px] opacity-40 uppercase tracking-widest">Melee Logic</span>
            <span className="text-xs font-mono text-[#10B981]">STRICT_COLLISION</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] opacity-40 uppercase tracking-widest">Spatial Partition</span>
            <span className="text-xs font-mono text-[#E4E3E0]">GRID_40x40</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] opacity-40 uppercase tracking-widest">Auto-Save</span>
            <span className="text-xs font-mono text-[#E4E3E0]">ACTIVE</span>
          </div>
          <div className="flex flex-col items-start lg:items-end">
            <div className="flex space-x-1">
              <div className="w-4 h-1 bg-[#10B981]"></div>
              <div className="w-4 h-1 bg-[#10B981]"></div>
              <div className="w-4 h-1 bg-[#10B981]"></div>
              <div className="w-4 h-1 bg-[#333]"></div>
            </div>
            <span className="text-[9px] opacity-40 mt-1 uppercase tracking-widest">Engine Heat</span>
          </div>
        </div>
        
        <button 
          onClick={handleReset}
          className="w-full lg:w-auto px-4 py-2 border border-red-500/20 hover:bg-red-500/10 text-red-500 text-[10px] uppercase font-mono transition-all shrink-0"
        >
          RESET_WORLD
        </button>
      </footer>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
