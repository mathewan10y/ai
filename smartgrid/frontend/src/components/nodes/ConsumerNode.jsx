import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2, BatteryCharging, Zap, Wallet, ArrowDownLeft } from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

const ConsumerNode = ({ id, data, selected }) => {
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const isCurrentlySelected = selectedNodeId === id || selected;

  const batteryPercent = Math.min(100, Math.round((data.battery / data.maxBattery) * 100));
  const isBuying = data.tradingStatus === 'Buying';
  const isGridFallback = data.tradingStatus === 'Grid Fallback';

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-64 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md ${
        isCurrentlySelected
          ? 'ring-2 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.45)] bg-slate-900/90'
          : isBuying
          ? 'border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)] bg-slate-900/80 hover:border-orange-400'
          : isGridFallback
          ? 'border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-slate-900/80 hover:border-cyan-400'
          : 'border border-slate-700/60 bg-slate-900/75 hover:border-slate-500'
      }`}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle type="source" position={Position.Top} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle type="target" position={Position.Right} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-800/30">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100 tracking-tight leading-none">{data.name}</h4>
            <span className="text-[10px] text-orange-400 font-mono">Consumer Node</span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isBuying
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse'
              : isGridFallback
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isBuying ? 'bg-orange-400' : isGridFallback ? 'bg-cyan-400' : 'bg-slate-400'}`}></span>
          <span>{data.tradingStatus}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3 space-y-2.5">
        {/* Load Demand */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Demand Load</div>
              <div className="font-mono font-bold text-orange-300 text-xs">{data.loadConsumption} <span className="text-[10px] font-normal text-slate-400">kW</span></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">Max Bid</div>
            <div className="font-mono text-slate-200 text-xs">${data.maxBuyPrice}/kWh</div>
          </div>
        </div>

        {/* Battery / Backup Buffer Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <div className="flex items-center space-x-1 text-slate-300 font-medium">
              <BatteryCharging className="w-3 h-3 text-orange-400" />
              <span>Backup Buffer</span>
            </div>
            <span className="font-mono text-orange-300 font-bold">{batteryPercent}% ({data.battery}/{data.maxBattery} kWh)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                batteryPercent > 50
                  ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                  : batteryPercent > 20
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${batteryPercent}%` }}
            />
          </div>
        </div>

        {/* Footer Wallet */}
        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-800/60 font-mono">
          <div className="flex items-center space-x-1 text-slate-400">
            <Wallet className="w-3 h-3 text-slate-500" />
            <span className="text-slate-200 font-bold">${data.walletBalance.toFixed(2)}</span>
          </div>
          <div className="text-slate-400 flex items-center space-x-0.5">
            <ArrowDownLeft className="w-3 h-3 text-orange-400" />
            <span>P2P Buyer</span>
          </div>
        </div>
      </div>

      {/* Bottom handles */}
      <Handle type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
    </div>
  );
};

export default memo(ConsumerNode);
