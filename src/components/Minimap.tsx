import React, { useRef, useEffect } from 'react';
import { SimulationState, UnitType, FactionColor } from '../types';
import { Compass } from 'lucide-react';

interface MinimapProps {
  state: SimulationState;
  zoom: number;
  offset: { x: number; y: number };
  onViewportChange: (offset: { x: number; y: number }) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ state, zoom, offset, onViewportChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 130; // 130x130 canvas size

  const handleInteract = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Convert minimap mouse coordinates (0 to size) to logical canvas coordinates (0 to 800)
    const logicalX = (clickX / size) * 800;
    const logicalY = (clickY / size) * 800;

    // Center viewport on click coordinates
    const targetOffset = {
      x: 400 - logicalX * zoom,
      y: 400 - logicalY * zoom,
    };

    onViewportChange(targetOffset);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, size, size);

    // Render outer boundary ring
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
    ctx.stroke();

    // Scale helper
    const scaleToMap = (val: number) => (val / 800) * size;

    // Draw Faction Bases
    Object.values(state?.factions || {}).forEach((f: any) => {
      const bx = scaleToMap(f.basePosition.x / 1.25);
      const by = scaleToMap(f.basePosition.y / 1.25);

      ctx.fillStyle = f.color;
      ctx.fillRect(bx - 3, by - 3, 6, 6);
      
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx - 5, by - 5, 10, 10);
    });

    // Draw Flag Zones
    state?.flagZones?.forEach(zone => {
      const zx = scaleToMap(zone.position.x / 1.25);
      const zy = scaleToMap(zone.position.y / 1.25);

      ctx.strokeStyle = zone.owner ? state.factions[zone.owner].color : '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(zx, zy, 4, 0, Math.PI * 2);
      ctx.stroke();

      if (zone.capturingFaction) {
        ctx.fillStyle = state.factions[zone.capturingFaction].color;
        ctx.beginPath();
        ctx.arc(zx, zy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Resource Rich Mines (Gold dots)
    ctx.fillStyle = '#FFD700';
    state?.resources?.forEach(r => {
      const rx = scaleToMap(r.position.x / 1.25);
      const ry = scaleToMap(r.position.y / 1.25);
      ctx.fillRect(rx - 0.5, ry - 0.5, 1.5, 1.5);
    });

    // Draw Units (colored clumpy micro-pixels)
    state?.units?.forEach(u => {
      const ux = scaleToMap(u.position.x / 1.25);
      const uy = scaleToMap(u.position.y / 1.25);
      const fColor = state.factions[u.faction]?.color || '#ffffff';
      
      ctx.fillStyle = fColor;
      if (u.type === UnitType.WARRIOR) {
        ctx.fillRect(ux - 0.5, uy - 0.5, 1.2, 1.2);
      } else {
        ctx.fillRect(ux - 0.25, uy - 0.25, 0.7, 0.7);
      }
    });

    // Draw Visible Viewport Rect Outline
    // top-left corner logical coordinates
    const tlx = -offset.x / zoom;
    const tly = -offset.y / zoom;
    // outer boundary of current view
    const brx = (800 - offset.x) / zoom;
    const bry = (800 - offset.y) / zoom;

    const vx = scaleToMap(tlx);
    const vy = scaleToMap(tly);
    const vw = scaleToMap(brx) - vx;
    const vh = scaleToMap(bry) - vy;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; // Gold colored border
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);

    // Glowing corner indications for high tech aesthetic
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.fillRect(vx, vy, vw, vh);

  }, [state, zoom, offset]);

  return (
    <div id="radar_minimap" className="absolute bottom-6 right-6 flex flex-col items-end gap-1.5 pointer-events-auto select-none z-10">
      <div className="flex items-center gap-1 bg-[#0A0A0A]/90 px-1.5 py-0.5 border border-white/10 text-[8px] font-mono tracking-widest text-white/50 uppercase">
        <Compass className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '40s' }} />
        <span>Macro_Telemetry_Radar</span>
      </div>
      <div className="border border-white/10 p-[1px] bg-[#0A0A0A]/95 shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={handleInteract}
          onTouchStart={handleInteract}
          onTouchMove={handleInteract}
          className="block"
        />
      </div>
    </div>
  );
};
