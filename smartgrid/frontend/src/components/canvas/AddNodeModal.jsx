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
  Loader2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Globe,
  MapPin
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function AddNodeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('Prosumer');
  const [name, setName] = useState('');
  const [hasBattery, setHasBattery] = useState(true);
  const [battery, setBattery] = useState(35);
  const [maxBattery, setMaxBattery] = useState(60);
  const [baseSolar, setBaseSolar] = useState(12);
  const [baseLoad, setBaseLoad] = useState(3.5);
  const [deferrableLoadKWh, setDeferrableLoadKWh] = useState(4.0);
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const spawnNode = useGridStore((state) => state.spawnNode);

  const setLocationPreset = (lat, lon) => {
    setLatitude(lat);
    setLongitude(lon);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    if (cat === 'Prosumer') {
      setName('SunPeak Residence');
      setHasBattery(true);
      setBaseSolar(14);
      setBaseLoad(3.5);
      setMaxBattery(60);
      setBattery(35);
      setDeferrableLoadKWh(4.0);
      setLatitude(37.7749);
      setLongitude(-122.4194);
    } else if (cat === 'Consumer') {
      setName('Nexus AI EV Datacenter');
      setHasBattery(false); // Consumer can start battery-less for demand response
      setBaseSolar(0);
      setBaseLoad(16);
      setMaxBattery(0);
      setBattery(0);
      setDeferrableLoadKWh(14.0);
      setLatitude(30.2672);
      setLongitude(-97.7431);
    } else if (cat === 'SolarFarm') {
      setName('Solaria MegaFarm Phase 2');
      setHasBattery(true);
      setBaseSolar(80);
      setBaseLoad(1.2);
      setMaxBattery(180);
      setBattery(100);
      setDeferrableLoadKWh(0);
      setLatitude(33.4484);
      setLongitude(-112.0740);
    } else if (cat === 'BESS') {
      setName('Megapack Storage Unit 4');
      setHasBattery(true);
      setBaseSolar(0);
      setBaseLoad(0.8);
      setMaxBattery(220);
      setBattery(140);
      setDeferrableLoadKWh(0);
      setLatitude(39.5296);
      setLongitude(-119.8138);
    }
  };

  const handleOpen = () => {
    handleCategoryChange('Prosumer');
    setError('');
    setSuccess(false);
    setIsOpen(true);
  };

  const handleToggleBattery = () => {
    const nextVal = !hasBattery;
    setHasBattery(nextVal);
    if (!nextVal) {
      setMaxBattery(0);
      setBattery(0);
    } else {
      setMaxBattery(50);
      setBattery(30);
    }
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
        hasBattery,
        battery: hasBattery ? Number(battery) : 0,
        maxBattery: hasBattery ? Number(maxBattery) : 0,
        batteryCapacity: hasBattery ? Number(maxBattery) : 0,
        baseSolar: Number(baseSolar),
        maxGen: Number(baseSolar),
        baseLoad: Number(baseLoad),
        deferrableLoadKWh: Number(deferrableLoadKWh),
        latitude: Number(latitude) || 37.7749,
        longitude: Number(longitude) || -122.4194,
        walletBalance: category === 'BESS' ? 3500 : category === 'SolarFarm' ? 2500 : 800
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
      {/* Prominent "+ Add Grid Node" Trigger */}
      <button
        onClick={handleOpen}
        id="add-grid-node-btn"
        className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:via-teal-400 hover:to-blue-500 text-white text-xs font-extrabold shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-cyan-300/40 transition-all transform hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>+ Add Grid Node</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/70">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Deploy Q-Learning Edge Node</h3>
                  <p className="text-[11px] text-slate-400">Tabular Q-learning brain & Ethers.js cryptographic wallet</p>
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

              {/* Archetype Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 uppercase text-[10px] tracking-wider">
                  Node Archetype
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
                    <span className="text-[9px] text-slate-500">Solar + Storage</span>
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
                    <span className="text-[9px] text-slate-500">Load & DR</span>
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
                    <span className="text-[9px] text-slate-500">Arbitrage</span>
                  </button>
                </div>
              </div>

              {/* Agent Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Agent / Facility Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Green Residence"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>

              {/* Battery Storage System Toggle */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BatteryCharging className={`w-4 h-4 ${hasBattery ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">Battery Energy Storage (BESS)</div>
                      <div className="text-[10px] text-slate-400">Enable local electrochemical battery capacity</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBattery}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
                      hasBattery
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {hasBattery ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{hasBattery ? 'Enabled' : 'Disabled (0 kWh)'}</span>
                  </button>
                </div>

                {hasBattery && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80 animate-fadeIn">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Max Battery (kWh)</label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={maxBattery}
                        onChange={(e) => setMaxBattery(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">Initial Charge (kWh)</label>
                      <input
                        type="number"
                        min="0"
                        max={maxBattery}
                        value={battery}
                        onChange={(e) => setBattery(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Generation & Load Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Solar Capacity (kW)</span>
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

              {/* Deferrable Load for Demand Response */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deferrable Task Load (kWh)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={deferrableLoadKWh}
                  onChange={(e) => setDeferrableLoadKWh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500">Flexible load buffer (EV charging, heat pumps) for Q-learning demand response.</span>
              </div>

              {/* Geographical Coordinates & Open-Meteo Presets */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-medium text-xs">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Geographical Coordinates (Open-Meteo)</span>
                  </div>
                  <span className="text-[10px] text-cyan-400/80 font-mono">Live Solar Irradiance</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Latitude (°N)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Longitude (°E)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-100 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Preset Location Buttons */}
                <div>
                  <div className="text-[10px] text-slate-500 mb-1 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Quick Location Presets:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLocationPreset(37.7749, -122.4194)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition-colors"
                    >
                      San Francisco
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationPreset(33.4484, -112.0740)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 border border-slate-700 transition-colors"
                    >
                      Phoenix (High Sun)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationPreset(34.0522, -118.2437)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition-colors"
                    >
                      Los Angeles
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationPreset(30.2672, -97.7431)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition-colors"
                    >
                      Austin
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationPreset(52.5200, 13.4050)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition-colors"
                    >
                      Berlin
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-900/30 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Instantiating Q-Learning Agent & Wallet...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Grid Node Deployed!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Deploy Autonomous Node</span>
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
