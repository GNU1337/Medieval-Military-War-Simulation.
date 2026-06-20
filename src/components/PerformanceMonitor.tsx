import React, { useEffect, useState, useRef } from 'react';
import { Activity, Flame, Cpu } from 'lucide-react';

interface PerformanceMonitorProps {
  tickLatency: number; // passed from simulation update loop
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ tickLatency }) => {
  const [fps, setFps] = useState(60);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Keep past 30 frames for a rolling average
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }

      const meanDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const calculatedFps = Math.round(1000 / meanDelta);
      
      // Keep within realistic bounds (0 - 64) for displays
      if (isFinite(calculatedFps) && calculatedFps > 0) {
        setFps(Math.min(60, calculatedFps));
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Determine thermal/performance load color status
  const isHighLoad = fps < 35 || tickLatency > 8;
  const isWarningLoad = fps < 50 || tickLatency > 4;

  const statusColor = isHighLoad 
    ? 'text-red-500 border-red-500/30 bg-red-950/10' 
    : isWarningLoad 
      ? 'text-amber-500 border-amber-500/30 bg-amber-950/10' 
      : 'text-emerald-400 border-emerald-400/30 bg-emerald-950/10';

  const statusText = isHighLoad 
    ? 'CRITICAL_LOAD' 
    : isWarningLoad 
      ? 'WARM_HEAVY' 
      : 'STABLE_NOMINAL';

  return (
    <div id="perf_monitor_hud" className="flex flex-col gap-1.5 p-3 border border-white/10 bg-[#0A0A0A]/95 text-[10px] font-mono select-none pointer-events-auto backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1">
        <div className="flex items-center gap-1 text-white/50">
          <Cpu className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest font-bold text-[9px]">Engine Hardware Diagnostics</span>
        </div>
        <span className={`px-1 py-[1px] border text-[8px] font-bold ${statusColor}`}>
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex justify-between items-center py-0.5">
          <span className="text-white/40 uppercase">Frame render rate:</span>
          <span className={`font-semibold ${fps < 45 ? 'text-red-400' : 'text-white'}`}>{fps} FPS</span>
        </div>
        <div className="flex justify-between items-center py-0.5">
          <span className="text-white/40 uppercase">Simulation processing:</span>
          <span className={`font-semibold ${tickLatency > 6 ? 'text-red-400' : 'text-white'}`}>{tickLatency.toFixed(2)} ms</span>
        </div>
        <div className="flex justify-between items-center py-0.5">
          <span className="text-white/40 uppercase">Load state:</span>
          <span className="text-[#FFD700] uppercase font-bold flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5 inline" /> 
            {Math.round(Math.min(100, (tickLatency / 16.6) * 100))}%
          </span>
        </div>
        <div className="flex justify-between items-center py-0.5">
          <span className="text-white/40 uppercase">Thermal budget:</span>
          <span className="text-emerald-400 uppercase">A-OK</span>
        </div>
      </div>
      
      {/* Mini graphical rolling visual indicator */}
      <div className="mt-1 h-3 bg-white/5 relative border border-white/10 overflow-hidden">
        <div 
          className={`h-full opacity-60 transition-all duration-300 ${isHighLoad ? 'bg-red-500' : isWarningLoad ? 'bg-amber-400' : 'bg-[#10B981]'}`}
          style={{ width: `${Math.max(10, Math.min(100, (fps / 60) * 100))}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white/60 uppercase tracking-widest pointer-events-none font-bold">
          Refresh Frequency Index
        </div>
      </div>
    </div>
  );
};
