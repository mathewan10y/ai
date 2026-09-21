import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BatteryCharging, Zap, Wallet, Layers, TrendingUp } from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

const BESSNode = ({ id, data, selected }) => {
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const isCurrentlySelected = selectedNodeId === id || selected;

  const batteryPercent = data.maxBattery
    ? Math.min(100, Math.round((data.battery / data.maxBattery) * 100))
    : 100;

  const isDischarging = data.tradingStatus === 'Discharging' || data.tradingStatus === 'Selling';
  const isCharging = data.tradingStatus === 'Charging' || data.tradingStatus === 'Buying';

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-64 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md ${
        isCurrentlySelected
          ? 'ring-2 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.45)] bg-slate-900/90'
          : isDischarging
          ? 'border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)] bg-slate-900/80 hover:border-purple-400'
          : isCharging
          ? 'border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] bg-slate-900/80 hover:border-cyan-400'
          : 'border border-slate-700/60 bg-slate-900/75 hover:border-slate-500'
      }`}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
      <Handle type="source" position={Position.Top} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
      <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
      <Handle type="target" position={Position.Right} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-800/30">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100 tracking-tight leading-none">{data.name}</h4>
            <span className="text-[10px] text-purple-400 font-mono">BESS Storage</span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isDischarging
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
              : isCharging
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDischarging ? 'bg-purple-400' : isCharging ? 'bg-cyan-400' : 'bg-slate-400'
            }`}
          ></span>
          <span>{data.tradingStatus || 'Standby'}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3 space-y-2.5">
        {/* Capacity & Arbitrage Mode */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Strategy</div>
              <div className="font-mono font-bold text-purple-300">Arbitrage</div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Capacity</div>
              <div className="font-mono font-bold text-slate-200">{data.maxBattery} <span className="text-[9px] font-normal text-slate-400">kWh</span></div>
            </div>
          </div>
        </div>

        {/* Battery Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <div className="flex items-center space-x-1 text-slate-300 font-medium">
              <BatteryCharging className="w-3 h-3 text-purple-400" />
              <span>State of Charge</span>
            </div>
            <span className="font-mono text-purple-300 font-bold">{batteryPercent}% ({data.battery}/{data.maxBattery} kWh)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
              style={{ width: `${batteryPercent}%` }}
            />
          </div>
        </div>

        {/* Footer Wallet */}
        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-800/60 font-mono">
          <div className="flex items-center space-x-1 text-slate-400">
            <Wallet className="w-3 h-3 text-slate-500" />
            <span className="text-slate-200 font-bold">${data.walletBalance ? data.walletBalance.toFixed(2) : '0.00'}</span>
          </div>
          <div className="text-purple-400 font-mono">
            <span>BESS Arbitrageur</span>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-purple-400 !border-slate-900" />
    </div>
  );
};

export default memo(BESSNode);
