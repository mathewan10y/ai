import React, { useState } from 'react';
import {
  Plus,
  X,
  Cpu,
  Sun,
  Zap,
  BatteryCharging,
  Layers,
  Factory,
  Home,
  Building2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function AddNodeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('Prosumer');
  const [name, setName] = useState('');
  const [battery, setBattery] = useState(40);
  const [maxBattery, setMaxBattery] = useState(60);
  const [baseSolar, setBaseSolar] = useState(12);
  const [baseLoad, setBaseLoad] = useState(3.5);
  const [targetSellPrice, setTargetSellPrice] = useState(0.14);
  const [maxBuyPrice, setMaxBuyPrice] = useState(0.26);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const spawnNode = useGridStore((state) => state.spawnNode);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === 'Prosumer') {
      setName('SunPeak Residence');
      setBaseSolar(12);
      setBaseLoad(3.5);
      setMaxBattery(60);
      setBattery(35);
    } else if (cat === 'Consumer') {
      setName('Nexus AI Datacenter');
      setBaseSolar(0);
      setBaseLoad(18);
      setMaxBattery(50);
      setBattery(15);
    } else if (cat === 'SolarFarm') {
      setName('Solaria MegaFarm Phase 1');
      setBaseSolar(75);
      setBaseLoad(1.0);
      setMaxBattery(180);
      setBattery(100);
    } else if (cat === 'BESS') {
      setName('Tesla Megapack Grid BESS');
      setBaseSolar(0);
      setBaseLoad(0.8);
      setMaxBattery(200);
      setBattery(120);
    }
  };

  const handleOpen = () => {
    handleCategoryChange('Prosumer');
    setError('');
    setSuccess(false);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an agent name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await spawnNode({
        name: name.trim(),
        category,
        battery: Number(battery),
        maxBattery: Number(maxBattery),
        baseSolar: Number(baseSolar),
        baseLoad: Number(baseLoad),
        targetSellPrice: Number(targetSellPrice),
        maxBuyPrice: Number(maxBuyPrice),
        walletBalance: category === 'BESS' ? 3500 : category === 'SolarFarm' ? 2500 : 750
      });

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to spawn EdgeAgent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleOpen}
        id="deploy-agent-fab"
        className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.45)] border border-cyan-300/30 transition-all transform hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        <span>Deploy Edge Agent</span>
      </button>

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Deploy Autonomous Edge Agent</h3>
                  <p className="text-[11px] text-slate-400">Instantiate live agent with autonomous physics & Ethers.js wallet</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Agent Category Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 uppercase text-[10px] tracking-wider">
                  Select Agent Archetype
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Prosumer')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                      category === 'Prosumer'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Home className="w-4 h-4 mb-1 text-emerald-400" />
                    <span className="font-semibold text-[11px]">Prosumer</span>
                    <span className="text-[9px] text-slate-500">Solar + Load</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Consumer')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                      category === 'Consumer'
                        ? 'bg-orange-500/20 border-orange-500/60 text-orange-300 ring-1 ring-orange-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mb-1 text-orange-400" />
                    <span className="font-semibold text-[11px]">Consumer</span>
                    <span className="text-[9px] text-slate-500">Heavy Load</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange('SolarFarm')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                      category === 'SolarFarm'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Factory className="w-4 h-4 mb-1 text-amber-400" />
                    <span className="font-semibold text-[11px]">Solar Farm</span>
                    <span className="text-[9px] text-slate-500">Utility Green</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange('BESS')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                      category === 'BESS'
                        ? 'bg-purple-500/20 border-purple-500/60 text-purple-300 ring-1 ring-purple-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1 text-purple-400" />
                    <span className="font-semibold text-[11px]">BESS</span>
                    <span className="text-[9px] text-slate-500">Storage Arbi</span>
                  </button>
                </div>
              </div>

              {/* Agent Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Green Datacenter"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>

              {/* Battery Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Max Battery (kWh)</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={maxBattery}
                    onChange={(e) => setMaxBattery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1">
                    <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Initial Charge (kWh)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={maxBattery}
                    value={battery}
                    onChange={(e) => setBattery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Generation & Load Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Base Solar (kW)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.5"
                    value={baseSolar}
                    onChange={(e) => setBaseSolar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>Base Load (kW)</span>
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.5"
                    value={baseLoad}
                    onChange={(e) => setBaseLoad(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Price Limits */}
              {category === 'Prosumer' || category === 'SolarFarm' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Ask Price ($/kWh)</label>
                  <input
                    type="number"
                    min="0.05"
                    max="0.30"
                    step="0.01"
                    value={targetSellPrice}
                    onChange={(e) => setTargetSellPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              ) : category === 'Consumer' ? (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Bid Price ($/kWh)</label>
                  <input
                    type="number"
                    min="0.10"
                    max="0.40"
                    step="0.01"
                    value={maxBuyPrice}
                    onChange={(e) => setMaxBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
              ) : null}

              {/* Blockchain info note */}
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 font-mono flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>An Ethereum secp256k1 keypair will be generated for this agent upon launch.</span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-900/30 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Ethers Wallet & Launching...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Edge Agent Deployed!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Launch Autonomous Agent</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
