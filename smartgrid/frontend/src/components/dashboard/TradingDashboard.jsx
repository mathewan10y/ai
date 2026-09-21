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
  Radio,
  Trash2,
  AlertTriangle,
  Loader2,
  Brain,
  Gauge,
  Sparkles,
  Clock,
  Ban
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function TradingDashboard() {
  const nodes = useGridStore((state) => state.nodes);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useGridStore((state) => state.setSelectedNodeId);
  const updateNodeStrategy = useGridStore((state) => state.updateNodeStrategy);
  const deleteNode = useGridStore((state) => state.deleteNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Local state
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setIsDeleting(false);
  }, [selectedNode?.id]);

  if (!selectedNode) {
    return (
      <aside className="w-80 md:w-96 h-full glass-panel border-l border-slate-800/80 p-6 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-slate-400 mb-4 animate-bounce">
          <Brain className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Q-Learning Agent Panel</h3>
        <p className="text-xs text-slate-400 max-w-[250px]">
          Click any Node on the energy grid to inspect its real-time Tabular Q-Learning brain, Bellman values, and Ethereum wallet identity.
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

  const hasBattery = selectedNode.hasBattery !== false && selectedNode.maxBattery > 0;
  const batteryPercent = hasBattery
    ? Math.min(100, Math.round((selectedNode.battery / selectedNode.maxBattery) * 100))
    : 0;

  const epsilon = typeof selectedNode.epsilon === 'number' ? selectedNode.epsilon : 0.25;
  const exploitationPercent = Math.round((1 - epsilon) * 100);

  const handleCopyAddress = () => {
    if (selectedNode.address) {
      navigator.clipboard.writeText(selectedNode.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedNode || isGrid) return;
    setIsDeleting(true);
    try {
      await deleteNode(selectedNode.id);
    } catch (err) {
      console.error('Failed to delete node:', err);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '0x000...0000';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const getActionDetails = (action) => {
    switch (action) {
      case 'SHIFT_LOAD_ON':
        return { label: 'SHIFT_LOAD_ON (Absorbing Surplus)', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/40' };
      case 'SHIFT_LOAD_OFF':
        return { label: 'SHIFT_LOAD_OFF (Shedding Peak Load)', color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/40' };
      case 'DISCHARGE_MAX_PROFIT':
        return { label: 'DISCHARGE_MAX_PROFIT (P2P Arbitrage)', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/40' };
      case 'CHARGE_OPPORTUNISTIC':
        return { label: 'CHARGE_OPPORTUNISTIC (Grid Buffering)', color: 'text-cyan-300', bg: 'bg-cyan-500/20 border-cyan-500/40' };
      case 'CURTAIL_SOLAR':
        return { label: 'CURTAIL_SOLAR (Inverter Zero Export)', color: 'text-rose-300', bg: 'bg-rose-500/20 border-rose-500/40' };
      case 'MARKET_TAKER':
        return { label: 'MARKET_TAKER (Demand Coverage)', color: 'text-teal-300', bg: 'bg-teal-500/20 border-teal-500/40' };
      case 'HOLD':
      default:
        return { label: 'HOLD (Local Microgrid Balance)', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/40' };
    }
  };

  const currentActionMeta = getActionDetails(selectedNode.currentAction);

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
              <span className="text-[10px] font-mono text-slate-400">Node ID: {selectedNode.id}</span>
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
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Archetype:</span>
          <span
            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
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
            {category} {hasBattery ? '• BESS Equipped' : '• Battery-less'}
          </span>
        </div>

        {/* Live Diagnostics Container */}
        <div className="p-4 space-y-4">
          {/* 1. Active RL Policy Badge */}
          {!isGrid && (
            <div className="glass-card p-3 rounded-xl border border-slate-800 space-y-2 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1.5 text-cyan-300 font-semibold">
                  <Brain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Active RL Policy</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                  {selectedNode.isExploration ? (
                    <span className="text-amber-400 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Exploring</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Exploiting</span>
                    </span>
                  )}
                </span>
              </div>

              <div className={`p-2.5 rounded-lg border text-xs font-mono font-bold flex items-center justify-between ${currentActionMeta.bg}`}>
                <span className={currentActionMeta.color}>{currentActionMeta.label}</span>
              </div>

              {/* State Space Key Breakdown */}
              {selectedNode.stateKey && (
                <div className="pt-1">
                  <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">State Vector (S):</div>
                  <div className="flex flex-wrap gap-1 font-mono text-[9px]">
                    {selectedNode.stateKey.split('|').map((part, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Exploration Rate (ε) & Q-Values Distribution */}
          {!isGrid && (
            <div className="glass-card p-3.5 rounded-xl border border-slate-800 space-y-3">
              {/* Epsilon Decay Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center space-x-1 text-slate-300 font-medium">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Exploration Rate (ε-decay)</span>
                  </span>
                  <span className="font-mono text-cyan-300 text-[11px] font-bold">
                    ε = {epsilon.toFixed(3)} ({exploitationPercent}% Policy)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div
                    className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400"
                    style={{ width: `${exploitationPercent}%` }}
                  />
                </div>
              </div>

              {/* Decisional Q-Values Mini-Bars */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium text-[11px] uppercase tracking-wider">Decisional Q-Values</span>
                  <span className="text-[9px] text-slate-500 font-mono">Bellman Q(s,a)</span>
                </div>

                {selectedNode.qValues && selectedNode.qValues.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedNode.qValues.map((qv) => {
                      const isChosen = qv.action === selectedNode.currentAction;
                      const normalizedWidth = Math.max(8, Math.min(100, Math.round(((qv.qValue + 0.5) / 1.5) * 100)));

                      return (
                        <div key={qv.action} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className={isChosen ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                              {qv.action} {isChosen ? '★' : ''}
                            </span>
                            <span className={qv.qValue >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {qv.qValue.toFixed(3)}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isChosen
                                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                                  : qv.qValue >= 0
                                  ? 'bg-slate-600'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${normalizedWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono text-center py-2">
                    Learning state transitions...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Decentralized Identity & Wallet Card */}
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

          {/* 4. Physical & Storage Telemetry */}
          {!isGrid ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass-card p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Generation</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-amber-300 text-base">
                    {selectedNode.solarGeneration || 0} <span className="text-xs text-slate-400">kW</span>
                  </div>
                  {selectedNode.curtailed && (
                    <div className="mt-1 text-[9px] text-rose-400 font-mono flex items-center space-x-1">
                      <Ban className="w-2.5 h-2.5" />
                      <span>Curtailed</span>
                    </div>
                  )}
                </div>

                <div className="glass-card p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase">
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>Instant Load</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-100 text-base">
                    {selectedNode.loadConsumption || 0} <span className="text-xs text-slate-400">kW</span>
                  </div>
                  {selectedNode.deferrableLoadKWh > 0 && (
                    <div className="mt-1 text-[9px] text-cyan-400 font-mono flex items-center space-x-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{selectedNode.deferrableLoadKWh} kWh DR Task</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Battery Bar (if battery-equipped) */}
              {hasBattery && (
                <div className="glass-card p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Battery Storage SoC</span>
                    </div>
                    <span className="font-mono font-bold text-slate-200">
                      {batteryPercent}% ({selectedNode.battery}/{selectedNode.maxBattery} kWh)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
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
              )}
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

          {/* 5. Decommission Node (Delete) Action */}
          {!isGrid && (
            <div className="glass-card p-3 rounded-xl border border-rose-900/40 bg-rose-950/10">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  id="decommission-node-btn"
                  className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Decommission Node</span>
                </button>
              ) : (
                <div className="space-y-2 text-center animate-fadeIn">
                  <div className="flex items-center justify-center space-x-1.5 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Decommission this Q-Learning Node?</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Terminates the local RL loop, revokes active orders, and removes it from the grid network.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteAgent}
                      className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Confirm Delete</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDelete(false)}
                      className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Signed Cryptographic Trade History */}
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
        <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-mono">Quick Switch Node:</div>
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
