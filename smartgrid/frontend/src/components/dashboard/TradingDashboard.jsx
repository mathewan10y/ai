import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Wallet,
  Zap,
  BatteryCharging,
  Sun,
  TrendingUp,
  Sliders,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Factory,
  Layers,
  Home,
  Building2,
  Radio
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function TradingDashboard() {
  const nodes = useGridStore((state) => state.nodes);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const updateNodeStrategy = useGridStore((state) => state.updateNodeStrategy);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Local form state for algorithmic tuning
  const [minReserve, setMinReserve] = useState(50);
  const [targetSellPrice, setTargetSellPrice] = useState(0.15);
  const [maxBuyPrice, setMaxBuyPrice] = useState(0.25);
  const [chargeThresholdPrice, setChargeThresholdPrice] = useState(0.14);
  const [dischargeThresholdPrice, setDischargeThresholdPrice] = useState(0.22);
  const [savedAlert, setSavedAlert] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      if (selectedNode.minBatteryReserve !== undefined) setMinReserve(selectedNode.minBatteryReserve);
      if (selectedNode.targetSellPrice !== undefined) setTargetSellPrice(selectedNode.targetSellPrice);
      if (selectedNode.maxBuyPrice !== undefined) setMaxBuyPrice(selectedNode.maxBuyPrice);
      if (selectedNode.chargeThresholdPrice !== undefined) setChargeThresholdPrice(selectedNode.chargeThresholdPrice);
      if (selectedNode.dischargeThresholdPrice !== undefined) setDischargeThresholdPrice(selectedNode.dischargeThresholdPrice);
    }
  }, [selectedNode?.id]);

  if (!selectedNode) {
    return (
      <aside className="w-80 md:w-96 h-full glass-panel border-l border-slate-800/80 p-6 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-400 mb-4 animate-bounce">
          <Cpu className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Autonomous Agent Inspector</h3>
        <p className="text-xs text-slate-400 max-w-[250px]">
          Click any Node on the energy grid to inspect its real-time telemetry, cryptographic Ethereum wallet, and trading policies.
        </p>
      </aside>
    );
  }

  const category = selectedNode.category || (selectedNode.type ? selectedNode.type.replace('Node', '') : 'Prosumer');
  const isProsumer = category === 'Prosumer';
  const isConsumer = category === 'Consumer';
  const isSolarFarm = category === 'SolarFarm';
  const isBESS = category === 'BESS';
  const isGrid = category === 'UtilityGrid' || category === 'Grid';

  const batteryPercent = selectedNode.maxBattery
    ? Math.min(100, Math.round((selectedNode.battery / selectedNode.maxBattery) * 100))
    : 100;

  const handleCopyAddress = () => {
    if (selectedNode.address) {
      navigator.clipboard.writeText(selectedNode.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleSaveStrategy = (e) => {
    e.preventDefault();
    let settings = {};
    if (isProsumer || isSolarFarm) {
      settings = { minBatteryReserve: Number(minReserve), targetSellPrice: Number(targetSellPrice) };
    } else if (isConsumer) {
      settings = { maxBuyPrice: Number(maxBuyPrice) };
    } else if (isBESS) {
      settings = {
        chargeThresholdPrice: Number(chargeThresholdPrice),
        dischargeThresholdPrice: Number(dischargeThresholdPrice)
      };
    }

    updateNodeStrategy(selectedNode.id, settings);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2000);
  };

  const formatAddress = (addr) => {
    if (!addr) return '0x000...0000';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <aside className="w-80 md:w-96 h-full glass-panel border-l border-slate-800/80 flex flex-col justify-between overflow-y-auto z-20 transition-all duration-300">
      {/* Header */}
      <div>
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isProsumer
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isConsumer
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : isSolarFarm
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : isBESS
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}
            >
              {isProsumer && <Home className="w-4 h-4" />}
              {isConsumer && <Building2 className="w-4 h-4" />}
              {isSolarFarm && <Factory className="w-4 h-4" />}
              {isBESS && <Layers className="w-4 h-4" />}
              {isGrid && <Radio className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 leading-none">{selectedNode.name}</h2>
              <span className="text-[10px] font-mono text-slate-400">Agent ID: {selectedNode.id}</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category & Status Banner */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Archetype:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
              isProsumer
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : isConsumer
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : isSolarFarm
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : isBESS
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {category}
          </span>
        </div>

        {/* Live Telemetry Cards */}
        <div className="p-4 space-y-4">
          {/* Blockchain Wallet Identity Card */}
          <div className="glass-card p-3 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5 text-cyan-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ethereum Keypair (Ethers.js)</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                Verified Signer
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800 font-mono text-xs">
              <span className="text-slate-300 font-bold tracking-wider">{formatAddress(selectedNode.address)}</span>
              <button
                onClick={handleCopyAddress}
                className="flex items-center space-x-1 text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 transition-colors"
                title="Copy full Ethereum address"
              >
                {copiedAddress ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Smart Wallet Balance */}
            <div className="pt-1 flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Wallet className="w-3 h-3 text-emerald-400" />
                <span>Escrow Balance:</span>
              </span>
              <div className="text-xl font-mono font-extrabold text-slate-100">
                ${selectedNode.walletBalance ? selectedNode.walletBalance.toFixed(2) : '0.00'}{' '}
                <span className="text-[10px] text-emerald-400 font-normal">USD</span>
              </div>
            </div>
          </div>

          {/* Energy & Battery Metrics */}
          {!isGrid ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(isProsumer || isSolarFarm) && (
                  <div className="glass-card p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Solar Power</span>
                    </div>
                    <div className="mt-1 font-mono font-bold text-amber-300 text-base">
                      {selectedNode.solarGeneration} <span className="text-xs text-slate-400">kW</span>
                    </div>
                  </div>
                )}
                <div
                  className={`glass-card p-2.5 rounded-xl border border-slate-800 ${
                    !isProsumer && !isSolarFarm ? 'col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>Instant Load</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-100 text-base">
                    {selectedNode.loadConsumption} <span className="text-xs text-slate-400">kW</span>
                  </div>
                </div>
              </div>

              {/* Battery Bar */}
              <div className="glass-card p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                    <BatteryCharging
                      className={`w-3.5 h-3.5 ${
                        isBESS ? 'text-purple-400' : isSolarFarm ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    />
                    <span>Battery State of Charge</span>
                  </div>
                  <span className="font-mono font-bold text-slate-200">
                    {batteryPercent}% ({selectedNode.battery}/{selectedNode.maxBattery} kWh)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isBESS
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-400'
                        : isSolarFarm
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : batteryPercent > 60
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : batteryPercent > 30
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${batteryPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass-card p-2.5 rounded-xl border border-cyan-900/50">
                  <div className="text-[10px] text-slate-400 uppercase">Total Dispatched</div>
                  <div className="mt-1 font-mono font-bold text-cyan-300 text-base">
                    {selectedNode.stats?.totalDispatchedKwh} kWh
                  </div>
                </div>
                <div className="glass-card p-2.5 rounded-xl border border-cyan-900/50">
                  <div className="text-[10px] text-slate-400 uppercase">CO2 Offset</div>
                  <div className="mt-1 font-mono font-bold text-emerald-300 text-base">
                    {selectedNode.stats?.carbonOffsetKg} kg
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Autonomous Policy & Strategy Customizer */}
          {!isGrid && (
            <form onSubmit={handleSaveStrategy} className="glass-card p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Autonomous Policy</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">Live Tune</span>
              </div>

              {selectedNode.strategy && (
                <div className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                  "{selectedNode.strategy}"
                </div>
              )}

              {(isProsumer || isSolarFarm) && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Min Battery Reserve:</span>
                      <span className="font-mono text-emerald-400 font-bold">{minReserve}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="90"
                      step="5"
                      value={minReserve}
                      onChange={(e) => setMinReserve(e.target.value)}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Target Ask Price:</span>
                      <span className="font-mono text-emerald-400 font-bold">${targetSellPrice}/kWh</span>
                    </div>
                    <input
                      type="range"
                      min="0.08"
                      max="0.30"
                      step="0.01"
                      value={targetSellPrice}
                      onChange={(e) => setTargetSellPrice(e.target.value)}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {isConsumer && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Max Purchase Bid:</span>
                      <span className="font-mono text-orange-400 font-bold">${maxBuyPrice}/kWh</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.35"
                      step="0.01"
                      value={maxBuyPrice}
                      onChange={(e) => setMaxBuyPrice(e.target.value)}
                      className="w-full accent-orange-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {isBESS && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Charge Below (Buy Limit):</span>
                      <span className="font-mono text-cyan-400 font-bold">${chargeThresholdPrice}/kWh</span>
                    </div>
                    <input
                      type="range"
                      min="0.08"
                      max="0.20"
                      step="0.01"
                      value={chargeThresholdPrice}
                      onChange={(e) => setChargeThresholdPrice(e.target.value)}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Discharge Above (Sell Trigger):</span>
                      <span className="font-mono text-purple-400 font-bold">${dischargeThresholdPrice}/kWh</span>
                    </div>
                    <input
                      type="range"
                      min="0.18"
                      max="0.35"
                      step="0.01"
                      value={dischargeThresholdPrice}
                      onChange={(e) => setDischargeThresholdPrice(e.target.value)}
                      className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-cyan-900/30"
              >
                {savedAlert ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Policy Parameters Applied!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update Agent Policy</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Signed Cryptographic Trade History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Signed Trade History</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">secp256k1</span>
            </div>

            {selectedNode.history && selectedNode.history.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedNode.history.map((tx) => {
                  const isBuyer = tx.buyerId === selectedNode.id;
                  return (
                    <div
                      key={tx.id}
                      className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        {isBuyer ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-slate-200">
                            {isBuyer ? `Bought from ${tx.sellerName}` : `Sold to ${tx.buyerName}`}
                          </div>
                          <div className="text-[9px] text-cyan-400/80 font-mono">
                            {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : tx.timestamp}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className={isBuyer ? 'text-orange-300 font-bold' : 'text-emerald-300 font-bold'}>
                          {isBuyer ? `-$${tx.totalCost.toFixed(2)}` : `+$${tx.totalCost.toFixed(2)}`}
                        </div>
                        <div className="text-[10px] text-slate-400">{tx.amountKwh} kWh</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-500 font-mono">
                No trades recorded yet in active window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Node Quick Switcher */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-mono">Quick Switch Agent:</div>
        <div className="flex space-x-1.5 overflow-x-auto pb-1">
          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNodeId(n.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap transition-colors border ${
                n.id === selectedNode.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {n.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
