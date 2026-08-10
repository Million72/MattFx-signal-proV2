import React, { useState } from 'react';
import { Search, RefreshCw, Clock, TrendingUp, TrendingDown, Zap, Target, Shield, Star } from 'lucide-react';
import { useScanner } from '../hooks/useScanner';
import SignalCard from './SignalCard';
import clsx from 'clsx';

export default function Dashboard({ selectedTimeframe }) {
  const { isScanning, signals, scanProgress, lastScan, scanAllMarkets } = useScanner();

  const filteredSignals = signals.filter(s => s.type !== 'NO_SIGNAL');
  const buySignals = filteredSignals.filter(s => s.direction === 'BUY');
  const sellSignals = filteredSignals.filter(s => s.direction === 'SELL');

  const nextScanTime = lastScan ? lastScan + 300000 : 0;
  const cooldownRemaining = Math.max(0, Math.ceil((nextScanTime - Date.now()) / 1000));
  const canScan = !isScanning && cooldownRemaining === 0;

  const handleScan = () => {
    if (canScan) {
      scanAllMarkets(selectedTimeframe);
    }
  };

  // Auto-refresh cooldown timer
  const [, setTick] = useState(0);
  React.useEffect(() => {
    if (!canScan && !isScanning) {
      const timer = setInterval(() => setTick(t => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [canScan, isScanning]);

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto space-y-6">
      {/* Scan Button */}
      <div className="glass-card p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">{selectedTimeframe} Scanner</h2>
        <p className="text-slate-400 mb-6">Scan all markets for high-quality signals</p>
        
        <button
          onClick={handleScan}
          disabled={!canScan}
          className={clsx(
            "px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 mx-auto",
            canScan
              ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg hover:scale-105"
              : "bg-slate-800 text-slate-400 cursor-not-allowed"
          )}
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Scanning...
            </>
          ) : canScan ? (
            <>
              <Search className="w-5 h-5" />
              Scan All Markets Now
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              Wait {Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, '0')}
            </>
          )}
        </button>

        {isScanning && (
          <div className="mt-4 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Scanning markets...</span>
              <span>{scanProgress.current}/{scanProgress.total}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full transition-all"
                style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isScanning && (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Analyzing market conditions...</p>
        </div>
      )}

      {/* Empty State */}
      {!isScanning && signals.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-slate-400 text-xl">No signals yet</p>
          <p className="text-slate-500 mt-2">Click "Scan All Markets Now" to find setups</p>
        </div>
      )}

      {/* Signals */}
      {!isScanning && filteredSignals.length > 0 && (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total" value={filteredSignals.length} icon={Zap} color="blue" />
            <StatCard label="Buy" value={buySignals.length} icon={TrendingUp} color="emerald" />
            <StatCard label="Sell" value={sellSignals.length} icon={TrendingDown} color="red" />
            <StatCard label="Avg Conf" value={`${(filteredSignals.reduce((s, sig) => s + sig.confidence, 0) / filteredSignals.length).toFixed(1)}%`} icon={Target} color="purple" />
            <StatCard label="Top" value={filteredSignals[0]?.symbol || 'N/A'} icon={Star} color="amber" />
            <StatCard label="Best R:R" value={`1:${Math.max(...filteredSignals.map(s => parseFloat(s.riskReward || 0))).toFixed(1)}`} icon={Shield} color="cyan" />
          </div>

          {/* Buy Signals */}
          {buySignals.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-emerald-400 mb-4">🟢 Buy Signals ({buySignals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {buySignals.map(signal => (
                  <SignalCard key={signal.id || signal.symbol} signal={signal} />
                ))}
              </div>
            </div>
          )}

          {/* Sell Signals */}
          {sellSignals.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-4">🔴 Sell Signals ({sellSignals.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sellSignals.map(signal => (
                  <SignalCard key={signal.id || signal.symbol} signal={signal} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {filteredSignals.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-3">📋 How to Execute</h3>
          <ol className="space-y-2 text-slate-400 text-sm">
            <li>1. Open your MT5 platform</li>
            <li>2. Find the symbol shown in the signal card</li>
            <li>3. Set timeframe to {selectedTimeframe}</li>
            <li>4. Enter at the Entry price shown</li>
            <li>5. Set Stop Loss at the indicated level</li>
            <li>6. Set Take Profit at the target level</li>
            <li>7. Risk only 1-2% of your account per trade</li>
            <li>8. Wait 5 minutes before next scan</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <div className={clsx("p-4 rounded-xl border", colors[color] || colors.blue)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
                }
