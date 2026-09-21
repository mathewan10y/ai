import React from 'react';
import Header from './components/header/Header';
import GridMap from './components/canvas/GridMap';
import TradingDashboard from './components/dashboard/TradingDashboard';
import LiveTransactions from './components/ledger/LiveTransactions';
import { Home, Building2, Radio, Zap } from 'lucide-react';

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 select-none">
      {/* Top Telemetry & Control Header */}
      <Header />

      {/* Center Layout: Interactive React Flow Canvas + Agent Inspector Sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Canvas Area */}
        <main className="flex-1 relative h-full w-full">
          <GridMap />

          {/* Quick HUD Legend in bottom left */}
          <div className="absolute bottom-4 left-4 z-10 glass-card px-3 py-2 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center space-x-3 pointer-events-auto">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Home className="w-3.5 h-3.5" />
              <span>Prosumer (Solar Surplus)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-orange-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>Consumer (Load Deficit)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <Radio className="w-3.5 h-3.5" />
              <span>Utility Grid (Fallback)</span>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Agent Telemetry & Strategy Control */}
        <TradingDashboard />
      </div>

      {/* Bottom Ticker & Real-Time Smart Ledger */}
      <LiveTransactions />
    </div>
  );
}
