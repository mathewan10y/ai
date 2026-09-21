import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Radio, Zap, Activity, ShieldCheck, DollarSign } from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

const GridNode = ({ id, data, selected }) => {
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const isCurrentlySelected = selectedNodeId === id || selected;

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-72 rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl ${
        isCurrentlySelected
          ? 'ring-2 ring-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.55)] bg-slate-900/95'
          : 'border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] bg-slate-900/85 hover:border-cyan-400'
      }`}
    >
      {/* Handles on 4 directions */}
      <Handle id="top-target" type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="top" type="source" position={Position.Top} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="left-target" type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="left" type="source" position={Position.Left} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="right-target" type="target" position={Position.Right} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="right" type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-cyan-400 !border-slate-900" />

      {/* Cyber Glow Header */}
      <div className="relative px-3.5 py-2.5 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-950/70 via-slate-900/80 to-blue-950/70 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="relative p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
            <Radio className="w-4 h-4 animate-spin-slow" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-cyan-200 uppercase tracking-wider">{data.name}</h3>
            <span className="text-[10px] text-cyan-400/80 font-mono">Central Utility Grid (Fallback Hub)</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          <span>{data.stability}% Synced</span>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="p-3.5 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-xl bg-slate-800/60 border border-cyan-900/40">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Grid Dispatch</span>
            </div>
            <div className="mt-1 font-mono font-bold text-cyan-200 text-sm">
              {data.currentDispatch} <span className="text-[10px] font-normal text-slate-400">kW</span>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-800/60 border border-cyan-900/40">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
              <DollarSign className="w-3 h-3 text-amber-400" />
              <span>Retail Tariff</span>
            </div>
            <div className="mt-1 font-mono font-bold text-amber-300 text-sm">
              ${data.basePrice}<span className="text-[10px] font-normal text-slate-400">/kWh</span>
            </div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-300 font-mono">
            <span>Capacity Reserve</span>
            <span className="text-cyan-400 font-bold">{data.capacity - data.currentDispatch} kW remaining</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-900/30">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (data.currentDispatch / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Feed-in Tariff & Offset */}
        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800 text-slate-400 font-mono">
          <div>Feed-In Rate: <span className="text-emerald-400">${data.feedInTariff}/kWh</span></div>
          <div className="flex items-center space-x-1 text-slate-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>Grid Master</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(GridNode);
