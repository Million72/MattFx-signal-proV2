import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity,
  Zap, Shield, Target, Clock,
  Search, RefreshCw, Download,
  ArrowUpRight, ArrowDownRight,
  ChevronUp, Star, Info, PieChart,
  X, Filter
} from 'lucide-react';
import { useScanner } from '../hooks/useScanner';
import SignalCard from './SignalCard';
import FilterBar from './FilterBar';
import SignalHistory from './SignalHistory';
import ActiveSignals from './ActiveSignals';
import PerformanceMetrics from './PerformanceMetrics';
import { formatTime } from '../utils/formatters';
import clsx from 'clsx';

export default function Dashboard({ selectedTimeframe }) {
  // Scanner Hook
  const { 
    isScanning, 
    signals, 
    scanProgress, 
    lastScan, 
    scanAllMarkets 
  } = useScanner();

  // Local State
  const [activeTab, setActiveTab] = useState('signals');
  const [expandedSignal, setExpandedSignal] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minConfidence: 70,
    signalTypes: ['BUY', 'SELL'],
    marketTypes: ['forex', 'synthetic'],
    minRR: 1.5,
    minConfluence: 3,
  });
  const [sortBy, setSortBy] = useState('confidence');
  const [sortOrder, setSortOrder] = useState('desc');

  // Derived Data
  const filteredSignals = signals
    .filter(s => s.type !== 'NO_SIGNAL')
    .filter(s => s.confidence >= filters.minConfidence)
    .filter(s => filters.signalTypes.includes(s.direction))
    .filter(s => parseFloat(s.riskReward) >= filters.minRR)
    .filter(s => (s.mtfConfirmed?.length || 0) + (s.htfConfirmed?.length || 0) >= filters.minConfluence);

  const buySignals = filteredSignals.filter(s => s.direction === 'BUY');
  const sellSignals = filteredSignals.filter(s => s.direction === 'SELL');

  // Calculate stats
  const stats = {
    totalSignals: filteredSignals.length,
    buyCount: buySignals.length,
    sellCount: sellSignals.length,
    avgConfidence: filteredSignals.length > 0 
      ? filteredSignals.reduce((sum, s) => sum + s.confidence, 0) / filteredSignals.length 
      : 0,
    avgRR: filteredSignals.length > 0
      ? filteredSignals.reduce((sum, s) => sum + parseFloat(s.riskReward || 0), 0) / filteredSignals.length
      : 0,
    topSymbol: filteredSignals.length > 0 
      ? [...filteredSignals].sort((a, b) => b.confidence - a.confidence)[0]?.symbol 
      : 'N/A',
  };

  // Calculate cooldown
  const nextScanTime = lastScan ? lastScan + 300000 : 0;
  const cooldownRemaining = Math.max(0, Math.ceil((nextScanTime - Date.now()) / 1000));
  const canScan = !isScanning && cooldownRemaining === 0;

  // Handle scan
  const handleScan = useCallback(() => {
    if (canScan) {
      scanAllMarkets(selectedTimeframe);
    }
  }, [canScan, scanAllMarkets, selectedTimeframe]);

  // Handle signal click
  const handleSignalClick = (signal) => {
    setExpandedSignal(expandedSignal === signal.id ? null : signal.id);
  };

  // Handle copy setup
  const handleCopySetup = (signal) => {
    const setup = `${signal.symbol} ${signal.direction}\nEntry: ${signal.entry}\nStop Loss: ${signal.stopLoss}\nTake Profit: ${signal.takeProfit}\nR:R Ratio: 1:${signal.riskReward}\nConfidence: ${signal.confidence}%`;
    navigator.clipboard.writeText(setup);
  };

  const tabs = [
    { id: 'signals', label: 'Signals', icon: Zap, count: filteredSignals.length },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'active', label: 'Active', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
  ];

  return (
    <div className="px-4 lg:px-6 py-6 max-w-[1920px] mx-auto space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Signals" value={stats.totalSignals} icon={Zap} color="blue" isLoading={isScanning} />
        <StatCard label="Buy Signals" value={stats.buyCount} icon={TrendingUp} color="emerald" isLoading={isScanning} />
        <StatCard label="Sell Signals" value={stats.sellCount} icon={TrendingDown} color="red" isLoading={isScanning} />
        <StatCard label="Avg Confidence" value={`${stats.avgConfidence.toFixed(1)}%`} icon={Target} color="purple" isLoading={isScanning} />
        <StatCard label="Avg R:R" value={`1:${stats.avgRR.toFixed(1)}`} icon={Shield} color="amber" isLoading={isScanning} />
        <StatCard label="Top Signal" value={stats.topSymbol} icon={Star} color="cyan" isLoading={isScanning} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="xl:col-span-1 space-y-4">
          {/* Scan Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Market Scanner
            </h3>

            <div className="mb-4 p-3 bg-slate-800/50 rounded-xl text-center">
              <p className="text-xs text-slate-400 mb-1">Selected Timeframe</p>
              <p className="text-2xl font-bold text-blue-400">{selectedTimeframe}</p>
            </div>

            <button
              onClick={handleScan}
              disabled={!canScan}
              className={clsx(
                "w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3",
                canScan
                  ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
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
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Scanning {scanProgress.current}/{scanProgress.total}</span>
                  <span className="text-blue-400">{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}

            {lastScan && !isScanning && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-400">Last Scan</p>
                <p className="text-sm font-mono text-slate-300">{formatTime(lastScan)}</p>
              </div>
            )}

            {!isScanning && signals.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-xl border border-blue-500/20">
                <p className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                  {filteredSignals.length}
                </p>
                <p className="text-xs text-slate-400 text-center mt-1">High-Quality Signals Found</p>
              </motion.div>
            )}
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <FilterBar filters={filters} onFilterChange={setFilters} isScanning={isScanning} />
          </motion.div>

          {/* Signal Distribution */}
          {!isScanning && filteredSignals.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                Signal Distribution
              </h4>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-emerald-500/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-emerald-400">{buySignals.length}</p>
                  <p className="text-xs text-slate-400">Buy</p>
                </div>
                <div className="flex-1 bg-red-500/10 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-red-400">{sellSignals.length}</p>
                  <p className="text-xs text-slate-400">Sell</p>
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(buySignals.length / Math.max(filteredSignals.length, 1)) * 100}%` }}
                  className="bg-emerald-500 h-full"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(sellSignals.length / Math.max(filteredSignals.length, 1)) * 100}%` }}
                  className="bg-red-500 h-full"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Sort Controls */}
          {!isScanning && filteredSignals.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700"
                >
                  <option value="confidence">Sort by Confidence</option>
                  <option value="symbol">Sort by Symbol</option>
                  <option value="rr">Sort by R:R Ratio</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-slate-800 rounded-lg border border-slate-700"
                >
                  {sortOrder === 'desc' ? <ArrowDownRight className="w-4 h-4 text-slate-400" /> : <ArrowUpRight className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-400 hover:text-white transition-all border border-slate-700">
                <Download className="w-4 h-4" />
                Export Signals
              </button>
            </motion.div>
          )}

          {/* Loading State */}
          {isScanning && (
            <div className="flex items-center justify-center py-20">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-center">
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-2">Scanning Markets</h3>
                <p className="text-slate-400">Analyzing 27 markets across 7 timeframes</p>
              </motion.div>
            </div>
          )}

          {/* Empty State */}
          {!isScanning && signals.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <div className="text-6xl mb-6">🔍</div>
                <h3 className="text-2xl font-bold mb-3">Ready to Find Signals</h3>
                <p className="text-slate-400 mb-6 max-w-md">
                  Click "Scan All Markets Now" to analyze all forex pairs and synthetic indices for high-quality trading opportunities.
                </p>
              </motion.div>
            </div>
          )}

          {/* No Signals After Filter */}
          {!isScanning && signals.length > 0 && filteredSignals.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">No Signals Match Filters</h3>
              <p className="text-slate-400 mb-6">Try adjusting your filter criteria</p>
              <button
                onClick={() => setFilters({ minConfidence: 70, signalTypes: ['BUY', 'SELL'], marketTypes: ['forex', 'synthetic'], minRR: 1.5, minConfluence: 3 })}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700"
              >
                Reset Filters
              </button>
            </motion.div>
          )}

          {/* Signals Display */}
          {!isScanning && filteredSignals.length > 0 && (
            <div className="space-y-8">
              {/* Buy Signals */}
              {buySignals.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-emerald-400">
                      Buy Signals <span className="text-sm font-normal text-slate-400">({buySignals.length})</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {buySignals.map((signal, index) => (
                      <motion.div key={signal.id || signal.symbol} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                        <SignalCard signal={signal} expanded={expandedSignal === signal.id} onClick={() => handleSignalClick(signal)} onCopy={() => handleCopySetup(signal)} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sell Signals */}
              {sellSignals.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-red-400">
                      Sell Signals <span className="text-sm font-normal text-slate-400">({sellSignals.length})</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sellSignals.map((signal, index) => (
                      <motion.div key={signal.id || signal.symbol} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                        <SignalCard signal={signal} expanded={expandedSignal === signal.id} onClick={() => handleSignalClick(signal)} onCopy={() => handleCopySetup(signal)} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Execution Guide */}
          {filteredSignals.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                How to Execute
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { step: 1, title: 'Open MT5', desc: 'Launch your MT5 platform' },
                  { step: 2, title: 'Find Symbol', desc: 'Locate the symbol from card' },
                  { step: 3, title: 'Set Timeframe', desc: `Change to ${selectedTimeframe}` },
                  { step: 4, title: 'Place Trade', desc: 'Enter at Entry with SL & TP' },
                  { step: 5, title: 'Risk 1-2%', desc: 'Never risk more than 2%' },
                  { step: 6, title: 'Wait 5 Min', desc: 'Next scan after cooldown' },
                  { step: 7, title: 'Monitor', desc: 'Let trade play out' },
                  { step: 8, title: 'Repeat', desc: 'Scan for new opportunities' },
                ].map(item => (
                  <div key={item.step} className="flex gap-3 p-3 bg-slate-800/50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tabs: History / Active / Performance */}
          {!isScanning && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
              <div className="border-b border-slate-800/50">
                <div className="flex">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={clsx(
                        "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2",
                        activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-white"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className={clsx("px-2 py-0.5 rounded-full text-xs", activeTab === tab.id ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500")}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                {activeTab === 'signals' && <SignalHistory signals={filteredSignals} compact />}
                {activeTab === 'history' && <SignalHistory signals={filteredSignals} />}
                {activeTab === 'active' && <ActiveSignals signals={filteredSignals} />}
                {activeTab === 'performance' && <PerformanceMetrics compact />}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// StatCard Sub-Component
function StatCard({ label, value, icon: Icon, color, isLoading }) {
  const colors = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  };

  const c = colors[color] || colors.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("p-4 rounded-xl border", c.bg, c.border)}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx("w-4 h-4", c.text)} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-6 w-16 bg-slate-800 rounded animate-pulse" />
      ) : (
        <p className={clsx("text-lg font-bold", c.text)}>{value}</p>
      )}
    </motion.div>
  );
    }
