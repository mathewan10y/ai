import React, { useState } from 'react';
import {
  Zap,
  Play,
  Pause,
  Sun,
  CloudSun,
  Flame,
  Moon,
  Clock,
  Activity,
  DollarSign,
  ShieldCheck,
  Radio,
  Gauge,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function Header() {
  const isConnected = useGridStore((state) => state.isConnected);
  const isPaused = useGridStore((state) => state.isPaused);
  const togglePause = useGridStore((state) => state.togglePause);
  const marketStats = useGridStore((state) => state.marketStats);
  const gridPhysics = useGridStore((state) => state.gridPhysics);
  const clock = useGridStore((state) => state.clock);
  const setClock = useGridStore((state) => state.setClock);
  const demandScenario = useGridStore((state) => state.demandScenario);
  const setDemandScenario = useGridStore((state) => state.setDemandScenario);

  const [showClockModal, setShowClockModal] = useState(false);

  const getCycleVisuals = (cycle) => {
    switch (cycle) {
      case 'MORNING_RAMP':
        return {
          icon: Sun,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'Morning Ramp (06:00 - 10:00)'
        };
      case 'SOLAR_GLUT':
        return {
          icon: Sparkles,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          badge: 'Solar Glut (10:00 - 15:00)'
        };
      case 'EVENING_PEAK':
        return {
          icon: Flame,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          badge: 'Evening Peak (15:00 - 21:00)'
        };
      case 'OFF_PEAK_NIGHT':
      default:
        return {
          icon: Moon,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          badge: 'Off-Peak Night (21:00 - 06:00)'
        };
    }
  };

  const cycleVisual = getCycleVisuals(clock?.gridCycle);
  const CycleIcon = cycleVisual.icon;

  const uniformPrice = marketStats?.uniformClearingPrice ?? marketStats?.spotPrice ?? 0.18;
  const transformerLoad = gridPhysics?.transformerLoadKW ?? marketStats?.transformerLoadKW ?? 0;
  const thermalLimit = gridPhysics?.thermalLimitKW ?? marketStats?.thermalLimitKW ?? 100;
  const isCongested = gridPhysics?.isCongested ?? marketStats?.isCongested ?? false;

  return (
    <header className="w-full glass-panel border-b border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-4 z-20">
      {/* Brand & Connection */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)]">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              GRIDPULSE AI
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-bold">
              Digital Twin v2.0
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
              }`}
            />
            <span>{isConnected ? 'MARL Engine & Double Auction Live' : 'Connecting to Node Engine...'}</span>
          </div>
        </div>
      </div>

      {/* Real-time Simulation Clock & Macro-Demand State Bar */}
      <div className="flex items-center space-x-2">
        <div
          onClick={() => setShowClockModal(!showClockModal)}
          className={`glass-card px-3.5 py-1.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer hover:border-cyan-500/50 transition-all ${cycleVisual.bg}`}
          title="Click to jump simulation clock time"
        >
          <div className={`p-1 rounded-lg ${cycleVisual.color}`}>
            <CycleIcon className="w-4 h-4 animate-pulse" />
          </div>
          <div className="font-mono">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5" />
              <span>Simulation Clock</span>
            </div>
            <div className="font-extrabold text-sm text-slate-100 flex items-center space-x-1.5">
              <span>{clock?.timeString || 'Day 1 - 08:00'}</span>
              <span className="text-[10px] font-bold text-cyan-300 font-sans">
                ({clock?.cycleDisplayName || 'Morning Ramp'})
              </span>
            </div>
          </div>
        </div>

        {/* Quick Cycle Jump Menu */}
        {showClockModal && (
          <div className="absolute top-16 z-50 glass-card p-3 rounded-xl border border-slate-700/80 shadow-2xl bg-slate-950/95 space-y-2 font-mono text-xs animate-fadeIn">
            <div className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-800 pb-1">
              Fast-Forward Simulation Time:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => { setClock(7, 0); setShowClockModal(false); }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[11px] text-left"
              >
                🌅 07:00 Morning Ramp
              </button>
              <button
                onClick={() => { setClock(12, 0); setShowClockModal(false); }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[11px] text-left"
              >
                ☀️ 12:00 Solar Glut
              </button>
              <button
                onClick={() => { setClock(18, 0); setShowClockModal(false); }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/30 text-[11px] text-left"
              >
                🔥 18:00 Evening Peak
              </button>
              <button
                onClick={() => { setClock(23, 0); setShowClockModal(false); }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-[11px] text-left"
              >
                🌙 23:00 Off-Peak Night
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Market & Physics Telemetry Bar */}
      <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
        {/* Uniform Clearing Price */}
        <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase">Uniform Clearing Price</div>
            <div className="font-bold text-emerald-300 text-sm">
              ${typeof uniformPrice === 'number' ? uniformPrice.toFixed(3) : Number(uniformPrice || 0).toFixed(3)} <span className="text-[10px] text-slate-400">/kWh</span>
            </div>
          </div>
        </div>

        {/* Transformer Thermal Load Gauge */}
        <div className={`glass-card px-3 py-1.5 rounded-xl border flex items-center space-x-2 ${
          isCongested ? 'border-rose-500/60 bg-rose-950/20 animate-pulse' : 'border-slate-800'
        }`}>
          <div className={`p-1 rounded-lg ${isCongested ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase flex items-center space-x-1">
              <span>Transformer Load</span>
              {isCongested && <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />}
            </div>
            <div className={`font-bold text-sm ${isCongested ? 'text-rose-400' : 'text-cyan-300'}`}>
              {transformerLoad} <span className="text-[10px] text-slate-400">/ {thermalLimit} kW</span>
            </div>
          </div>
        </div>

        {/* 24h P2P Volume */}
        <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase">P2P Volume</div>
            <div className="font-bold text-cyan-300 text-sm">{marketStats.totalP2PVolumeKwh} kWh</div>
          </div>
        </div>

        {/* Clean Energy % */}
        <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase">Clean Ratio</div>
            <div className="font-bold text-emerald-400 text-sm">{marketStats.cleanEnergyRatio}% Green</div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="flex items-center space-x-2">
        {/* Demand Spike Toggle */}
        <button
          onClick={() => setDemandScenario(demandScenario === 'Normal' ? 'Peak Surge' : 'Normal')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border flex items-center space-x-1.5 transition-all ${
            demandScenario === 'Peak Surge'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          <span>{demandScenario === 'Peak Surge' ? 'Peak Surge Active' : 'Normal Load'}</span>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePause}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
          }`}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
      </div>
    </header>
  );
}
