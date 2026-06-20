import React, { useRef, useEffect, useState } from 'react';
import { SimulationState, UnitType, StatusEffect, FactionColor, InfluenceCell } from '../types';
import { Minimap } from './Minimap';
import { PerformanceMonitor } from './PerformanceMonitor';

interface SimulationViewProps {
  state: SimulationState;
  tickLatency: number;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ state, tickLatency }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPadding, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const mouseDownPosRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const touchStartPosRef = useRef<{ x: number, y: number, time: number } | null>(null);

  // Touch references for pinch-to-zoom and panning on mobile
  const touchStartRef = useRef<{ 
    x: number; 
    y: number; 
    dist: number; 
    zoom: number; 
    offset: { x: number; y: number } 
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      // Single finger drag for panning
      const t = e.touches[0];
      touchStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        dist: 0,
        zoom,
        offset: { ...offset }
      };
      // Record position for touch tap click detection
      touchStartPosRef.current = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now()
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      touchStartRef.current = {
        x: midX,
        y: midY,
        dist,
        zoom,
        offset: { ...offset }
      };
      touchStartPosRef.current = null; // Clear to prevent click when zooming
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 1) {
      // Pan
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      setOffset({
        x: touchStartRef.current.offset.x + dx,
        y: touchStartRef.current.offset.y + dy
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      // Zoom and optionally Pan
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const scale = dist / touchStartRef.current.dist;
      const newZoom = Math.max(0.5, Math.min(5, touchStartRef.current.zoom * scale));
      
      const dx = midX - touchStartRef.current.x;
      const dy = midY - touchStartRef.current.y;

      setZoom(newZoom);
      setOffset({
        x: touchStartRef.current.offset.x + dx,
        y: touchStartRef.current.offset.y + dy
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartRef.current = null;
    if (touchStartPosRef.current && e.changedTouches && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartPosRef.current.x;
      const dy = t.clientY - touchStartPosRef.current.y;
      const duration = Date.now() - touchStartPosRef.current.time;
      if (Math.hypot(dx, dy) < 10 && duration < 350) {
        // It's a tap/click!
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = t.clientX - rect.left;
          const mouseY = t.clientY - rect.top;
          const rx = (mouseX - offset.x) / zoom;
          const ry = (mouseY - offset.y) / zoom;
          
          let nearestUnit: any = null;
          let minDist = 25; // touch target padding
          
          state.units.forEach(u => {
            const ux = u.position.x / 1.25;
            const uy = u.position.y / 1.25;
            const d = Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2);
            if (d < minDist) {
              minDist = d;
              nearestUnit = u;
            }
          });
          
          if (nearestUnit) {
            setSelectedUnitId(nearestUnit.id);
          } else {
            setSelectedUnitId(null);
          }
        }
      }
    }
    touchStartPosRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newZoom = Math.max(0.5, Math.min(5, zoom - e.deltaY * zoomSpeed));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPadding) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    if (mouseDownPosRef.current) {
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      const duration = Date.now() - mouseDownPosRef.current.time;
      if (Math.hypot(dx, dy) < 5 && duration < 300) {
        // It's a click! Let's select!
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const rx = (mouseX - offset.x) / zoom;
          const ry = (mouseY - offset.y) / zoom;
          
          let nearestUnit: any = null;
          let minDist = 20; // click padding in logical coordinates
          
          state.units.forEach(u => {
            const ux = u.position.x / 1.25;
            const uy = u.position.y / 1.25;
            const d = Math.sqrt((ux - rx) ** 2 + (uy - ry) ** 2);
            if (d < minDist) {
              minDist = d;
              nearestUnit = u;
            }
          });
          
          if (nearestUnit) {
            setSelectedUnitId(nearestUnit.id);
          } else {
            setSelectedUnitId(null);
          }
        }
      }
    }
    mouseDownPosRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear with Theme Background (Fixed UI layer)
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Simulation Background - Radial Gradient Ambience
      const grad = ctx.createRadialGradient(400, 400, 0, 400, 400, 600);
      grad.addColorStop(0, '#1a1a1a');
      grad.addColorStop(1, '#0D0D0D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Grid Lines (Subtle)
      ctx.strokeStyle = '#333';
      ctx.globalAlpha = 0.05;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 800; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 800); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Influence Grid Rendering
      Object.entries(state.influenceGrid || {}).forEach(([key, cell]: [string, InfluenceCell]) => {
        const [gx, gy] = key.split(',').map(Number);
        const x = gx * 32; // (40 / 1.25)
        const y = gy * 32;
        
        let bestFaction: FactionColor | null = null;
        let maxInf = 0;
        
        (Object.keys(cell.factions) as FactionColor[]).forEach(f => {
          if (cell.factions[f] > maxInf) {
            maxInf = cell.factions[f];
            bestFaction = f;
          }
        });

        if (bestFaction && maxInf > 0.02) {
          ctx.fillStyle = state.factions[bestFaction].color;
          ctx.globalAlpha = maxInf * 0.15;
          ctx.fillRect(x, y, 32, 32);
          ctx.globalAlpha = 1.0;
        }
      });

      // Draw Resources (Gold Mines)
      state.resources.forEach(r => {
        ctx.fillStyle = '#FFD700'; 
        ctx.beginPath();
        ctx.arc(r.position.x / 1.25, r.position.y / 1.25, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFD700';
      });
      ctx.shadowBlur = 0;

      // Draw Faction Bases (Fortresses)
      (Object.values(state.factions) as any[]).forEach(f => {
        const bx = f.basePosition.x / 1.25;
        const by = f.basePosition.y / 1.25;
        
        ctx.strokeStyle = f.color + '44';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx - 16, by - 16, 32, 32);
        ctx.setLineDash([]);
        
        ctx.fillStyle = f.color + '11';
        ctx.fillRect(bx - 16, by - 16, 32, 32);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - 10, by - 10, 20, 20);
      });

      // Draw Flag Zones (Strategic Contest Points)
      state?.flagZones?.forEach(zone => {
        const x = zone.position.x / 1.25;
        const y = zone.position.y / 1.25;
        const radius = zone.radius / 1.25;

        // Outer white circle (Tactical Perimeter)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing core based on owner
        if (zone.owner) {
          const factionColor = state.factions[zone.owner].color;
          ctx.fillStyle = factionColor;
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Owner Icon/Core
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Unclaimed Core
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Capture Progress Ring
        if (zone.capturingFaction && zone.captureProgress > 0) {
          const capColor = state.factions[zone.capturingFaction].color;
          ctx.strokeStyle = capColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, radius + 2, -Math.PI / 2, -Math.PI / 2 + (zone.captureProgress / 100) * (Math.PI * 2));
          ctx.stroke();

          // Text label for capture
          ctx.fillStyle = capColor;
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.floor(zone.captureProgress)}%`, x, y + radius + 12);
          ctx.textAlign = 'left';
        }

        // Zone ID label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ZONE_${zone.id.split('-')[1]}`, x, y - radius - 5);
        ctx.textAlign = 'left';
      });

      // Draw Units (Swarm)
      state.units.forEach(u => {
        const x = u.position.x / 1.25;
        const y = u.position.y / 1.25;
        const color = state.factions[u.faction].color;

        // Dynamic Color-Coded Health Bar with contrast outline
        if (u.health < u.maxHealth) {
          const barWidth = 10;
          const barHeight = 2;
          const barX = x - barWidth / 2;
          const barY = y - 7;
          
          // Background capsule wrapper
          ctx.fillStyle = 'rgba(6, 6, 6, 0.85)';
          ctx.fillRect(barX - 0.5, barY - 0.5, barWidth + 1, barHeight + 1);
          
          // Determine tactical engagement health color
          const ratio = u.health / u.maxHealth;
          let healthColor = '#10B981'; // nominal green
          if (ratio < 0.3) {
            healthColor = '#EF4444'; // critical red
          } else if (ratio < 0.65) {
            healthColor = '#F59E0B'; // heavy wear amber/yellow
          }
          
          ctx.fillStyle = healthColor;
          ctx.fillRect(barX, barY, Math.max(0, ratio * barWidth), barHeight);
        }

        // Unit Body
        ctx.fillStyle = color;
        if (u.type === UnitType.WARRIOR) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = color;
          ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
          ctx.shadowBlur = 0;
        } else if (u.type === UnitType.WORKER) {
          ctx.globalAlpha = 0.6;
          ctx.fillRect(x - 1, y - 1, 2, 2);
          ctx.globalAlpha = 1.0;
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Status Effects
        if (u.status === StatusEffect.GREEK_FIRE) {
          ctx.fillStyle = '#ff6600';
          ctx.globalAlpha = 0.3;
          ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      });

      // ──────────────────────────────────────────────────────────────────────
      // PATHFINDER VECTOR DIAGNOSTIC OVERLAY PASS
      // ──────────────────────────────────────────────────────────────────────
      if (selectedUnitId) {
        const selectedUnit = state.units.find(un => un.id === selectedUnitId);
        if (selectedUnit) {
          const x = selectedUnit.position.x / 1.25;
          const y = selectedUnit.position.y / 1.25;
          const color = state.factions[selectedUnit.faction].color;

          // Glowing reticle ring structure
          ctx.strokeStyle = '#00ffff'; // Neon cyan
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -state.tick * 0.4;
          ctx.beginPath();
          ctx.arc(x, y, 7.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Corner brackets
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1.0;
          // Top-Left Bracket
          ctx.beginPath(); ctx.moveTo(x - 11, y - 7); ctx.lineTo(x - 11, y - 11); ctx.lineTo(x - 7, y - 11); ctx.stroke();
          // Top-Right Bracket
          ctx.beginPath(); ctx.moveTo(x + 11, y - 7); ctx.lineTo(x + 11, y - 11); ctx.lineTo(x + 7, y - 11); ctx.stroke();
          // Bottom-Left Bracket
          ctx.beginPath(); ctx.moveTo(x - 11, y + 7); ctx.lineTo(x - 11, y + 11); ctx.lineTo(x - 7, y + 11); ctx.stroke();
          // Bottom-Right Bracket
          ctx.beginPath(); ctx.moveTo(x + 11, y + 7); ctx.lineTo(x + 11, y + 11); ctx.lineTo(x + 7, y + 11); ctx.stroke();

          // Target calculations
          let targetX: number | null = null;
          let targetY: number | null = null;
          let targetLabel = '';
          let vectorColor = '#00ffff';

          if (selectedUnit.type === UnitType.WORKER) {
            if (selectedUnit.goldCarrying >= 20) {
              const base = state.factions[selectedUnit.faction].basePosition;
              targetX = base.x / 1.25;
              targetY = base.y / 1.25;
              targetLabel = 'DELIVER_GOAL';
              vectorColor = '#10B981'; // Green for delivery
            } else {
              const rTarget = state.resources.find(r => r.id === selectedUnit.targetId);
              if (rTarget) {
                targetX = rTarget.position.x / 1.25;
                targetY = rTarget.position.y / 1.25;
                targetLabel = 'MINE_EXTRACT';
                vectorColor = '#FFD700'; // Amber for mineral extraction
              }
            }
          } else if (selectedUnit.type === UnitType.WARRIOR) {
            const uTarget = state.units.find(o => o.id === selectedUnit.targetId && o.health > 0);
            if (uTarget) {
              targetX = uTarget.position.x / 1.25;
              targetY = uTarget.position.y / 1.25;
              targetLabel = 'SWARM_INTERCEPT';
              vectorColor = '#EF4444'; // Red for military offensive interception
            }
          } else if (selectedUnit.type === UnitType.SCOUT) {
            // Find closest threat
            let nearestThreat: any = null;
            let minThreatDist = Infinity;
            state.units.forEach(o => {
              if (o.faction !== selectedUnit.faction && o.health > 0) {
                const dx = o.position.x - selectedUnit.position.x;
                const dy = o.position.y - selectedUnit.position.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < minThreatDist) {
                  minThreatDist = d;
                  nearestThreat = o;
                }
              }
            });

            if (nearestThreat && minThreatDist < 60) {
              // Highlight threat reference
              const tx = nearestThreat.position.x / 1.25;
              const ty = nearestThreat.position.y / 1.25;
              
              // Red dotted warning vector to the active threat
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
              ctx.lineWidth = 0.8;
              ctx.setLineDash([2, 4]);
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(tx, ty);
              ctx.stroke();

              // Draw critical visual exclamation mark
              ctx.fillStyle = '#EF4444';
              ctx.font = 'bold 8px system-ui';
              ctx.textAlign = 'center';
              ctx.fillText('⚡ THREAT_SOURCE', (x + tx) / 2, (y + ty) / 2 - 4);

              // Evade direction (opposite)
              const dx = selectedUnit.position.x - nearestThreat.position.x;
              const dy = selectedUnit.position.y - nearestThreat.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                targetX = x + (dx / dist) * 35;
                targetY = y + (dy / dist) * 35;
                targetLabel = 'EVASIVE_MANEUVER';
                vectorColor = '#3B82F6'; // Blue vector for safe evasion path
              }
            } else {
              targetLabel = 'INTEL_RECON';
            }
          }

          // Render active vector path lines
          if (targetX !== null && targetY !== null) {
            ctx.strokeStyle = vectorColor;
            ctx.lineWidth = 1.3;
            ctx.setLineDash([6, 4]);
            ctx.lineDashOffset = state.tick * 0.6;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Target Point Ring indicator
            ctx.strokeStyle = vectorColor;
            ctx.fillStyle = vectorColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 4.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(targetX, targetY, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Midpoint Vector Label Panel
            const midX = (x + targetX) / 2;
            const midY = (y + targetY) / 2;
            ctx.fillStyle = 'rgba(6, 6, 6, 0.9)';
            ctx.strokeStyle = vectorColor + 'bb';
            ctx.lineWidth = 1;
            
            const textWidth = ctx.measureText(targetLabel).width;
            ctx.fillRect(midX - textWidth/2 - 5, midY - 6.5, textWidth + 10, 13);
            ctx.strokeRect(midX - textWidth/2 - 5, midY - 6.5, textWidth + 10, 13);

            ctx.fillStyle = vectorColor;
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(targetLabel, midX, midY + 3);
            ctx.textAlign = 'left'; // reset
          }
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, zoom, offset, selectedUnitId]);

  const selectedUnit = selectedUnitId ? state.units.find(un => un.id === selectedUnitId) : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0D0D0D] flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800} 
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full max-w-[800px] max-h-[800px] cursor-grab active:cursor-grabbing touch-none"
      />
      
      {/* Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 z-10 pointer-events-none">
        <div className="flex space-x-2">
          <div className="px-2 py-1 border border-gold/30 bg-[#0D0D0D]/80 text-[10px] tracking-widest text-gold/60 font-mono italic uppercase">Sector_0X{state.tick.toString(16).toUpperCase()}</div>
          <div className="px-2 py-1 border border-emerald/30 bg-[#0D0D0D]/80 text-[10px] tracking-widest text-emerald/60 font-mono animate-pulse">STATUS: ACTIVE</div>
          <div className="px-2 py-1 border border-white/20 bg-[#0D0D0D]/80 text-[10px] tracking-widest text-white/40 font-mono uppercase">Zoom: {zoom.toFixed(1)}x</div>
        </div>
        
        {/* Real-time Hardware Diagnostics Frame Rate & Processing Latency Overlay */}
        <PerformanceMonitor tickLatency={tickLatency} />
      </div>

      {/* Interactive Navigation/Zoom Panel */}
      <div className="absolute top-6 right-6 flex flex-col gap-1 z-10 pointer-events-auto">
        <button 
          onClick={() => setZoom(z => Math.min(5, z + 0.25))}
          className="w-7 h-7 flex items-center justify-center border border-white/10 bg-[#0D0D0D]/90 text-white/70 hover:text-white hover:bg-white/5 transition-all text-xs font-mono font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button 
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          className="w-7 h-7 flex items-center justify-center border border-white/10 bg-[#0D0D0D]/90 text-white/70 hover:text-white hover:bg-white/5 transition-all text-xs font-mono font-bold"
          title="Zoom Out"
        >
          -
        </button>
        <button 
          onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
          className="w-7 h-7 flex items-center justify-center border border-white/10 bg-[#0D0D0D]/90 text-white/70 hover:text-white hover:bg-white/5 transition-all text-[11px] font-mono"
          title="Reset Viewport"
        >
          ⟲
        </button>
      </div>

      {/* Dynamic Tactical Radar Minimap */}
      <Minimap state={state} zoom={zoom} offset={offset} onViewportChange={setOffset} />

      {selectedUnit ? (
        <div id="unit_diagnostic_overlay" className="absolute bottom-6 left-6 flex flex-col gap-1.5 p-3.5 border border-cyan-500/30 bg-[#0A0A0A]/95 text-[10px] font-mono select-none pointer-events-auto backdrop-blur-md w-[220px] shadow-[0_0_20px_rgba(0,255,255,0.05)] z-20">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
              <span className="uppercase text-cyan-400 font-bold tracking-wider">UNIT_DIAGNOSTIC_LOG</span>
            </div>
            <button 
              onClick={() => setSelectedUnitId(null)}
              className="text-white/40 hover:text-white transition-colors px-1"
              title="Close Panel"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1 py-1">
            <div className="flex justify-between">
              <span className="text-white/40 uppercase">UUID Reference:</span>
              <span className="text-white font-bold">{selectedUnit.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 uppercase">Faction Domain:</span>
              <span className="font-bold uppercase" style={{ color: state.factions[selectedUnit.faction].color }}>
                {state.factions[selectedUnit.faction].name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 uppercase">Tactical Role:</span>
              <span className="text-white font-bold">
                {selectedUnit.type === UnitType.WARRIOR ? 'Vanguard Melee' : selectedUnit.type === UnitType.WORKER ? 'Logistics Worker' : 'Intel Scout'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 uppercase">Position (Raw):</span>
              <span className="text-white font-bold">
                X: {Math.floor(selectedUnit.position.x)} | Y: {Math.floor(selectedUnit.position.y)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 uppercase">Current Vitals:</span>
              <span className="text-emerald-400 font-semibold">{Math.floor(selectedUnit.health)} / {selectedUnit.maxHealth} HP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 uppercase">Speed Velocity:</span>
              <span className="text-sky-400 font-semibold">{selectedUnit.speed.toFixed(1)} m/s</span>
            </div>
            {selectedUnit.type === UnitType.WORKER && (
              <div className="flex justify-between">
                <span className="text-white/40 uppercase">Gold Capacity:</span>
                <span className="text-amber-400 font-semibold">{Math.floor(selectedUnit.goldCarrying)} / 20 Carried</span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/5 pt-1 mt-0.5">
              <span className="text-white/40 uppercase">Combat Status:</span>
              <span className={`font-bold ${selectedUnit.status !== StatusEffect.NONE ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                {selectedUnit.status !== StatusEffect.NONE ? selectedUnit.status : 'NOMINAL_STATE'}
              </span>
            </div>
          </div>
          <div className="border-t border-white/5 pt-1.5 flex flex-col gap-0.5 mt-0.5 text-[8px] text-white/50 leading-normal uppercase">
            <div>Vector Sync Indicators:</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-1 bg-red-500 inline-block"></span>
              <span>Red: Interception Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-1 bg-emerald-500 inline-block"></span>
              <span>Green: Logistics Extraction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-1 bg-yellow-500 inline-block"></span>
              <span>Amber: Resource Mining</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-1 bg-blue-500 inline-block"></span>
              <span>Blue: Threat Evacuation</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-6 left-6 text-[9px] uppercase tracking-[0.3em] opacity-20 pointer-events-none font-mono">
          Viewing: Central Spire / Sector 07-B / Influence_Sync_Mode
        </div>
      )}

      {/* Decorative SVG Paths */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        <path d="M100,100 Q400,200 700,700" stroke="#10B981" fill="none" strokeDasharray="4" strokeWidth="1" />
        <path d="M700,100 Q400,200 100,700" stroke="#FFD700" fill="none" strokeDasharray="4" strokeWidth="1" />
      </svg>
    </div>
  );
};
