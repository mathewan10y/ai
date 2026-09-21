import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sun, BatteryCharging, Zap, Wallet, ArrowUpRight, Home } from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

const ProsumerNode = ({ id, data, selected }) => {
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const isCurrentlySelected = selectedNodeId === id || selected;

  const batteryPercent = Math.min(100, Math.round((data.battery / data.maxBattery) * 100));
  const isSelling = data.tradingStatus === 'Selling';
  const isFeedingGrid = data.tradingStatus === 'Feeding Grid';

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-64 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md ${
        isCurrentlySelected
          ? 'ring-2 ring-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)] bg-slate-900/90'
          : isSelling
          ? 'border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-slate-900/80 hover:border-emerald-400'
          : 'border border-slate-700/60 bg-slate-900/75 hover:border-slate-500'
      }`}
    >
      {/* Top handles */}
      <Handle id="top-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
      <Handle id="top" type="source" position={Position.Top} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
      
      {/* Side handles */}
      <Handle id="left-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
      <Handle id="left" type="source" position={Position.Left} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
      <Handle id="right-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
      <Handle id="right" type="source" position={Position.Right} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-800/30">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Home className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-100 tracking-tight leading-none">{data.name}</h4>
            <span className="text-[10px] text-emerald-400 font-mono">Prosumer Node</span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            isSelling
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
              : isFeedingGrid
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSelling ? 'bg-emerald-400' : isFeedingGrid ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
          <span>{data.currentAction || data.tradingStatus}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3 space-y-2.5">
        {/* Solar Gen vs Load */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Solar Gen</div>
              <div className="font-mono font-bold text-amber-300">{data.solarGeneration ?? data.currentGenKW ?? 0} <span className="text-[9px] font-normal text-slate-400">kW</span></div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Load</div>
              <div className="font-mono font-bold text-slate-200">{data.loadConsumption ?? data.currentLoadKW ?? 0} <span className="text-[9px] font-normal text-slate-400">kW</span></div>
            </div>
          </div>
        </div>

        {/* Localized Weather & Irradiance Badge */}
        {data.weather && (
          <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-300">
            <span className="flex items-center space-x-1">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>{data.weather.shortwaveRadiation ?? 0} W/m²</span>
            </span>
            <span className="text-slate-400 text-[9px]">
              ☁️ {data.weather.cloudCover ?? 0}% • {data.weather.solarForecast === 'FORECAST_DROP' ? '📉 Drop Soon' : '☀️ Clear'}
            </span>
          </div>
        )}

        {/* Battery Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <div className="flex items-center space-x-1 text-slate-300 font-medium">
              <BatteryCharging className="w-3 h-3 text-emerald-400" />
              <span>Storage</span>
            </div>
            <span className="font-mono text-emerald-300 font-bold">{batteryPercent}% ({data.battery}/{data.maxBattery} kWh)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                batteryPercent > 60
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : batteryPercent > 30
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${batteryPercent}%` }}
            />
          </div>
        </div>

        {/* Footer Wallet & Target */}
        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-800/60 font-mono">
          <div className="flex items-center space-x-1 text-slate-400">
            <Wallet className="w-3 h-3 text-slate-500" />
            <span className="text-slate-200 font-bold">
              ${typeof data.walletBalance === 'number' ? data.walletBalance.toFixed(2) : Number(data.walletBalance || 0).toFixed(2)}
            </span>
          </div>
          <div className="text-emerald-400/90 flex items-center">
            <span>Ask: ${data.targetSellPrice || 0.15}/kWh</span>
          </div>
        </div>
      </div>

      {/* Bottom handles */}
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-emerald-400 !border-slate-900" />
    </div>
  );
};

export default memo(ProsumerNode);
