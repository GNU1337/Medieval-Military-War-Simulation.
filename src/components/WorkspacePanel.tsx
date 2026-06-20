import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HardDrive, FileText, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { SimulationState } from '../types';

interface WorkspacePanelProps {
  state: SimulationState;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ state }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const exportToDrive = async (type: 'JSON' | 'MARKDOWN') => {
    setLoading(true);
    setSuccess(null);
    try {
      const accessToken = (window as any).googleAccessToken;
      
      if (!accessToken) {
         throw new Error("UNAUTHORIZED: Use the 'Login with Google' workflow first.");
      }

      const filename = `war_master_${type.toLowerCase()}_${Date.now()}.${type === 'JSON' ? 'json' : 'md'}`;
      let content = "";

      if (type === 'JSON') {
        content = JSON.stringify(state || {}, null, 2);
      } else {
        content = `# WAR MASTER BATTLE DISPATCH\n\n` +
          `## Tactical Summary - Tick ${state?.tick || 0}\n` +
          `Date: ${new Date().toLocaleString()}\n\n` +
          `### Faction Status\n` +
          (Object.values(state?.factions || {}) as any[]).map(f => `- **${f.name}**: ${f.population} units | ${Math.floor(f.gold)} gold`).join('\n') +
          `\n\n### Field Intelligence\n` +
          `- Total Active Combatants: ${state?.units?.length || 0}\n` +
          `- Resource Deposits Remaining: ${state?.resources?.length || 0}\n\n` +
          `*End of Transmission.*`;
      }

      const response = await fetch('/api/drive/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: content, 
          filename, 
          mimeType: type === 'JSON' ? 'application/json' : 'text/markdown',
          accessToken 
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      setSuccess(`Archive Secured: ${filename}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4 bg-[#0F0F0F]">
      <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-2 font-mono">War Chronicles</div>
      <button 
        onClick={() => exportToDrive('JSON')}
        disabled={loading}
        className="w-full py-3 border border-[#2A2A2A] bg-[#141414] text-[10px] uppercase tracking-widest hover:bg-[#1A1A1A] transition-colors flex items-center justify-center space-x-2 font-mono disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Backup State (.JSON)</span>}
      </button>
      <button 
        onClick={() => exportToDrive('MARKDOWN')}
        disabled={loading}
        className="w-full py-3 border border-[#2A2A2A] bg-[#141414] text-[10px] uppercase tracking-widest hover:bg-[#1A1A1A] transition-colors flex items-center justify-center space-x-2 font-mono disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Export Dispatch (.MD)</span>}
      </button>
      {success && (
        <div className="text-[8px] font-mono text-emerald-400 text-center uppercase mt-2">{success}</div>
      )}
    </div>
  );
};
