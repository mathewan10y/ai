import React from 'react';
import {
  Zap,
  Play,
  Pause,
  Sun,
  CloudSun,
  Flame,
  TrendingUp,
  Activity,
  DollarSign,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function Header() {
  const isConnected = useGridStore((state) => state.isConnected);
  const isPaused = useGridStore((state) => state.isPaused);
  const togglePause = useGridStore((state) => state.togglePause);
  const marketStats = useGridStore((state) => state.marketStats);
  const weather = useGridStore((state) => state.weather);
  const setWeather = useGridStore((state) => state.setWeather);
  const demandScenario = useGridStore((state) => state.demandScenario);
  const setDemandScenario = useGridStore((state) => state.setDemandScenario);

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
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
              v1.0 MVP
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
              }`}
            />
            <span>{isConnected ? 'Market Engine Synchronized' : 'Connecting to Node Engine...'}</span>
          </div>
        </div>
      </div>

      {/* Real-time Market Telemetry Bar */}
      <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
        {/* Dynamic Spot Price */}
        <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase">P2P Spot Price</div>
            <div className="font-bold text-emerald-300 text-sm">
              ${marketStats.spotPrice?.toFixed(3)} <span className="text-[10px] text-slate-400">/kWh</span>
            </div>
          </div>
        </div>

        {/* Total Volume */}
        <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase">24h P2P Volume</div>
            <div className="font-bold text-cyan-300 text-sm">{marketStats.totalP2PVolumeKwh} kWh</div>
          </div>
        </div>

        {/* Clean Energy % */}
        <div className="glass-card px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase">Clean Energy Ratio</div>
            <div className="font-bold text-emerald-400 text-sm">{marketStats.cleanEnergyRatio}% Green</div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="flex items-center space-x-2">
        {/* Weather Scenarios */}
        <div className="flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setWeather('Sunny')}
            title="Sunny Weather (Normal Solar)"
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-all ${
              weather === 'Sunny' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sunny</span>
          </button>
          <button
            onClick={() => setWeather('Cloudy')}
            title="Cloudy Weather (Low Solar)"
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-all ${
              weather === 'Cloudy' ? 'bg-slate-700 text-slate-200 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudSun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cloudy</span>
          </button>
          <button
            onClick={() => setWeather('Solar Surge')}
            title="Inject Solar Surge (+60% Generation)"
            className={`px-2 py-1 rounded flex items-center space-x-1 transition-all ${
              weather === 'Solar Surge' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400 font-bold animate-pulse' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Solar Surge</span>
          </button>
        </div>

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
