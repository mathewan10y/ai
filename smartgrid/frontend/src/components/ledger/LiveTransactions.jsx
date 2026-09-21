import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Zap,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Radio,
  ExternalLink,
  AlertTriangle,
  Ban,
  Layers
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function LiveTransactions() {
  const transactions = useGridStore((state) => state.transactions);
  const marketStats = useGridStore((state) => state.marketStats);
  const gridPhysics = useGridStore((state) => state.gridPhysics);
  const [isExpanded, setIsExpanded] = useState(false);

  const uniformPrice = marketStats?.uniformClearingPrice ?? marketStats?.spotPrice ?? 0.18;

  return (
    <div className="w-full glass-panel border-t border-slate-800/80 transition-all duration-300 z-10">
      {/* Top Header / Ticker Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>DOUBLE AUCTION LEDGER</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
              Uniform P*: <strong className="text-emerald-400">${typeof uniformPrice === 'number' ? uniformPrice.toFixed(3) : Number(uniformPrice || 0).toFixed(3)}</strong>/kWh
            </span>
            <span className="text-slate-400">
              Batches Cleared: {marketStats.totalClearedBatches || 0}
            </span>
            {gridPhysics?.isCongested && (
              <span className="flex items-center space-x-1 text-rose-400 font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>Congestion Curtailment Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Mini Ticker (latest transaction preview) */}
        {transactions.length > 0 && (
          <div className="hidden md:flex items-center space-x-3 text-xs font-mono bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800/80 max-w-xl truncate">
            {transactions[0].type === 'CURTAILED_FLOW' ? (
              <span className="text-rose-400 flex items-center space-x-1">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>Curtailed Flow: {transactions[0].amountKwh} kWh (Thermal Constraint)</span>
              </span>
            ) : transactions[0].type === 'IMBALANCE_PENALTY' ? (
              <span className="text-rose-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Imbalance Penalty: {transactions[0].sellerName} short {transactions[0].amountKwh} kWh</span>
              </span>
            ) : (
              <>
                <span className="text-cyan-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Verified Match:</span>
                </span>
                <span className="text-emerald-400 font-medium">{transactions[0].sellerName}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 inline" />
                <span className="text-orange-400 font-medium">{transactions[0].buyerName}</span>
                <span className="text-slate-300 font-bold">
                  ⚡ {transactions[0].amountKwh} kWh @ ${transactions[0].pricePerKwh}/kWh
                </span>
              </>
            )}
            {transactions[0].txHash && (
              <span className="text-cyan-400/80 text-[10px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                {transactions[0].txHash.slice(0, 10)}...
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <span>{isExpanded ? 'Collapse Ledger' : 'View Full Ledger'}</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Table Feed */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto p-4 bg-[#090d16]/95 border-t border-slate-800/60">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 pb-2">
                <th className="pb-2 font-medium">TX HASH / BATCH</th>
                <th className="pb-2 font-medium">TIMESTAMP</th>
                <th className="pb-2 font-medium">TYPE</th>
                <th className="pb-2 font-medium">PRODUCER (SELLER)</th>
                <th className="pb-2 font-medium">CONSUMER (BUYER)</th>
                <th className="pb-2 font-medium text-right">ENERGY (KWH)</th>
                <th className="pb-2 font-medium text-right">UNIFORM PRICE</th>
                <th className="pb-2 font-medium text-right">SETTLEMENT</th>
                <th className="pb-2 font-medium text-center">PROOF / STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {transactions.map((tx, idx) => {
                const isP2P = tx.type === 'P2P';
                const isImport = tx.type === 'GRID_IMPORT';
                const isFeed = tx.type === 'GRID_FEEDIN';
                const isCurtailed = tx.type === 'CURTAILED_FLOW';
                const isPenalty = tx.type === 'IMBALANCE_PENALTY';

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      idx === 0 ? 'bg-emerald-500/5 animate-pulse-slow' : ''
                    }`}
                  >
                    <td className="py-2 text-cyan-400/90 font-mono text-[11px]">
                      <div>{tx.txHash ? `${tx.txHash.slice(0, 10)}...` : '0x' + tx.id.slice(0, 8)}</div>
                      {tx.batchId && (
                        <div className="text-[9px] text-slate-500">{tx.batchId}</div>
                      )}
                    </td>
                    <td className="py-2 text-slate-400">{tx.timestamp}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isP2P
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isImport
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : isFeed
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isCurtailed
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-red-500/30 text-red-300 border border-red-500/50'
                        }`}
                      >
                        {isP2P ? 'Double Auction' : isImport ? 'Grid Import' : isFeed ? 'Feed-In' : isCurtailed ? 'Thermal Curtailed' : 'Imbalance Penalty'}
                      </span>
                    </td>
                    <td className="py-2 text-emerald-400 font-medium">
                      <div>{tx.sellerName}</div>
                      {tx.sellerAddress && (
                        <div className="text-[9px] text-slate-500">{tx.sellerAddress.slice(0, 6)}...{tx.sellerAddress.slice(-4)}</div>
                      )}
                    </td>
                    <td className="py-2 text-orange-400 font-medium">
                      <div>{tx.buyerName}</div>
                      {tx.buyerAddress && (
                        <div className="text-[9px] text-slate-500">{tx.buyerAddress.slice(0, 6)}...{tx.buyerAddress.slice(-4)}</div>
                      )}
                    </td>
                    <td className="py-2 text-right font-bold text-slate-200">{tx.amountKwh} kWh</td>
                    <td className="py-2 text-right text-slate-400">
                      ${typeof tx.pricePerKwh === 'number' ? tx.pricePerKwh.toFixed(3) : tx.pricePerKwh}
                    </td>
                    <td className="py-2 text-right font-bold text-emerald-400">
                      ${typeof tx.totalCost === 'number' ? tx.totalCost.toFixed(3) : tx.totalCost}
                    </td>
                    <td className="py-2 text-center">
                      {isCurtailed ? (
                        <span className="text-rose-400 text-[10px] bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/80 font-bold inline-flex items-center space-x-1">
                          <Ban className="w-3 h-3" />
                          <span>Curtailed</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 font-bold inline-flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
