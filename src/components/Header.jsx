import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Bell, User, Zap, TrendingUp,
  BarChart3, Wifi, WifiOff, Search,
  ChevronDown, Star, Clock
} from 'lucide-react';
import { TIMEFRAMES } from '../constants/timeframes';
import { FOREX_PAIRS, SYNTHETIC_INDICES } from '../constants/markets';
import clsx from 'clsx';

export default function Header({
  selectedTimeframe,
  onTimeframeChange,
  selectedMarket,
  onMarketChange,
  selectedSymbol,
  onSymbolChange
}) {
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  const allSymbols = selectedMarket === 'forex'
    ? [...FOREX_PAIRS.major, ...FOREX_PAIRS.minor, ...FOREX_PAIRS.exotic]
    : [...SYNTHETIC_INDICES.volatility, ...SYNTHETIC_INDICES.crashBoom, ...SYNTHETIC_INDICES.jump];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">SignalPro</h1>
                <p className="text-xs text-slate-500">v2.0</p>
              </div>
            </motion.div>

            {/* Connection Status */}
            <div className={clsx(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
              isConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            )}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          {/* Market & Symbol Selection */}
          <div className="flex items-center gap-4">
            {/* Market Type Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => onMarketChange('forex')}
                className={clsx(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  selectedMarket === 'forex'
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <DollarSign className="w-4 h-4 inline mr-1" />
                Forex
              </button>
              <button
                onClick={() => onMarketChange('synthetic')}
                className={clsx(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  selectedMarket === 'synthetic'
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Synthetic
              </button>
            </div>

            {/* Symbol Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSymbolSearch(!showSymbolSearch)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 
                         rounded-lg transition-all border border-slate-700"
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">{selectedSymbol}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showSymbolSearch && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-2 w-72 glass-card p-2 z-50"
                >
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search symbols..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {allSymbols
                      .filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(symbol => (
                        <button
                          key={symbol.symbol}
                          onClick={() => {
                            onSymbolChange(symbol.symbol);
                            setShowSymbolSearch(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 
                                   hover:bg-slate-800 rounded-lg transition-all text-sm"
                        >
                          <div>
                            <span className="font-medium">{symbol.symbol}</span>
                            <p className="text-xs text-slate-500">{symbol.name}</p>
                          </div>
                          {symbol.symbol === selectedSymbol && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Timeframe Selector */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => onTimeframeChange(tf.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    selectedTimeframe === tf.value
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Market Hours */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>London</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-all">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Settings */}
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-all">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>

            {/* User */}
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-all">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
                  }
