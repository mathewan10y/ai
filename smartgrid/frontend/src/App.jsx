import React from 'react';
import Header from './components/header/Header';
import GridMap from './components/canvas/GridMap';
import TradingDashboard from './components/dashboard/TradingDashboard';
import LiveTransactions from './components/ledger/LiveTransactions';
import { Home, Building2, Radio, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#07090e] text-slate-100 p-6 text-center font-mono">
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-400 mb-4 animate-pulse">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-bold text-rose-300 mb-2">Smart Grid UI Diagnostic Intercept</h2>
          <p className="text-xs text-slate-400 max-w-md mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-left overflow-auto max-h-32">
            {this.state.error?.message || 'A runtime error occurred in the component tree.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-cyan-950/50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload & Recover Canvas</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
