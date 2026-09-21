import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2, BatteryCharging, Zap, Wallet, ArrowDownLeft, Clock } from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

const ConsumerNode = ({ id, data, selected }) => {
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const isCurrentlySelected = selectedNodeId === id || selected;

  const hasBattery = data.hasBattery !== false && data.maxBattery > 0;
  const batteryPercent = hasBattery
    ? Math.min(100, Math.round((data.battery / data.maxBattery) * 100))
    : 0;

  const isBuying = data.tradingStatus === 'Buying' || data.currentAction === 'CHARGE_OPPORTUNISTIC';
  const isAbsorbing = data.currentAction === 'SHIFT_LOAD_ON';

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-64 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md ${
        isCurrentlySelected
          ? 'ring-2 ring-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.45)] bg-slate-900/90'
          : isAbsorbing
          ? 'border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] bg-slate-900/80 hover:border-amber-400'
          : isBuying
          ? 'border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)] bg-slate-900/80 hover:border-orange-400'
          : 'border border-slate-700/60 bg-slate-900/75 hover:border-slate-500'
      }`}
    >
      {/* Handles */}
      <Handle id="top-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle id="top" type="source" position={Position.Top} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle id="left-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle id="left" type="source" position={Position.Left} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle id="right-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle id="right" type="source" position={Position.Right} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />

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
            isAbsorbing
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : isBuying
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isAbsorbing ? 'bg-amber-400' : isBuying ? 'bg-orange-400' : 'bg-slate-400'}`}></span>
          <span>{data.currentAction || data.tradingStatus}</span>
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
              <div className="font-mono font-bold text-orange-300 text-xs">{data.loadConsumption || data.currentLoadKW} <span className="text-[10px] font-normal text-slate-400">kW</span></div>
            </div>
          </div>
          {data.deferrableLoadKWh > 0 ? (
            <div className="text-right">
              <div className="text-[9px] text-cyan-400 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-2.5 h-2.5" />
                <span>DR Task</span>
              </div>
              <div className="font-mono text-cyan-300 text-xs">{data.deferrableLoadKWh} kWh</div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">RL Policy</div>
              <div className="font-mono text-slate-300 text-[10px]">Adaptive DR</div>
            </div>
          )}
        </div>

        {/* Battery Bar if hasBattery */}
        {hasBattery ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <div className="flex items-center space-x-1 text-slate-300 font-medium">
                <BatteryCharging className="w-3 h-3 text-orange-400" />
                <span>Backup Storage</span>
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
        ) : (
          <div className="p-1.5 rounded-lg bg-slate-800/30 border border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Direct Grid & DR Load</span>
            <span className="text-cyan-400">Battery-less Node</span>
          </div>
        )}

        {/* Footer Wallet */}
        <div className="flex items-center justify-between pt-1 text-[10px] border-t border-slate-800/60 font-mono">
          <div className="flex items-center space-x-1 text-slate-400">
            <Wallet className="w-3 h-3 text-slate-500" />
            <span className="text-slate-200 font-bold">${typeof data.walletBalance === 'number' ? data.walletBalance.toFixed(2) : Number(data.walletBalance || 0).toFixed(2)}</span>
          </div>
          <div className="text-slate-400 flex items-center space-x-0.5">
            <ArrowDownLeft className="w-3 h-3 text-orange-400" />
            <span>Q-Learner</span>
          </div>
        </div>
      </div>

      {/* Bottom handles */}
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-orange-400 !border-slate-900" />
    </div>
  );
};

export default memo(ConsumerNode);
