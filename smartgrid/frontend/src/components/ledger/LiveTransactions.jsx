import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Zap,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useGridStore } from '../../store/gridStore';

export default function LiveTransactions() {
  const transactions = useGridStore((state) => state.transactions);
  const marketStats = useGridStore((state) => state.marketStats);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full glass-panel border-t border-slate-800/80 transition-all duration-300 z-10">
      {/* Top Header / Ticker Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>VERIFIED LEDGER</span>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Total Blocks: {transactions.length} | Signatures Verified: {marketStats.verifiedSignaturesCount || 0}
          </span>
        </div>

        {/* Live Mini Ticker (latest transaction preview) */}
        {transactions.length > 0 && (
          <div className="hidden md:flex items-center space-x-3 text-xs font-mono bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800/80 max-w-xl truncate">
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
        <div className="max-h-60 overflow-y-auto p-4 bg-[#090d16]/95 border-t border-slate-800/60">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 pb-2">
                <th className="pb-2 font-medium">TX HASH</th>
                <th className="pb-2 font-medium">TIMESTAMP</th>
                <th className="pb-2 font-medium">TYPE</th>
                <th className="pb-2 font-medium">PRODUCER (SELLER)</th>
                <th className="pb-2 font-medium">CONSUMER (BUYER)</th>
                <th className="pb-2 font-medium text-right">ENERGY (KWH)</th>
                <th className="pb-2 font-medium text-right">PRICE/KWH</th>
                <th className="pb-2 font-medium text-right">SETTLEMENT</th>
                <th className="pb-2 font-medium text-center">CRYPTO PROOF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {transactions.map((tx, idx) => {
                const isP2P = tx.type === 'P2P';
                const isImport = tx.type === 'GRID_IMPORT';

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      idx === 0 ? 'bg-emerald-500/5 animate-pulse-slow' : ''
                    }`}
                  >
                    <td className="py-2 text-cyan-400/90 font-mono text-[11px]">
                      {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : '0x' + tx.id.slice(0, 8)}
                    </td>
                    <td className="py-2 text-slate-400">{tx.timestamp}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isP2P
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isImport
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {isP2P ? 'P2P Bilateral' : isImport ? 'Grid Import' : 'Feed-In'}
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
                    <td className="py-2 text-right text-slate-400">${tx.pricePerKwh.toFixed(3)}</td>
                    <td className="py-2 text-right font-bold text-emerald-400">
                      ${tx.totalCost.toFixed(3)}
                    </td>
                    <td className="py-2 text-center">
                      <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 font-bold inline-flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
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
