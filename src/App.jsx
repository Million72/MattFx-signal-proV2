import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import {
  Zap,
  Wifi,
  WifiOff,
  ChevronUp,
} from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { derivService } from './services/deriv';
import { TIMEFRAMES } from './constants/timeframes';
import { FOREX_PAIRS, SYNTHETIC_INDICES } from './constants/markets';
import clsx from 'clsx';

// App Context for global state
export const AppContext = React.createContext();

function App() {
  // Core State
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const [selectedMarket, setSelectedMarket] = useState('forex');
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  
  // UI State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [firstVisit, setFirstVisit] = useState(() => {
    return !localStorage.getItem('visited');
  });
  const [showWelcome, setShowWelcome] = useState(false);

  // Initialize app
  useEffect(() => {
    if (firstVisit) {
      localStorage.setItem('visited', 'true');
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
    }

    const savedTimeframe = localStorage.getItem('selectedTimeframe');
    const savedMarket = localStorage.getItem('selectedMarket');
    
    if (savedTimeframe) setSelectedTimeframe(savedTimeframe);
    if (savedMarket) setSelectedMarket(savedMarket);

    console.log('MT5 Signal Pro v2 Initialized');
  }, []);

  // Connect to Deriv WebSocket
  useEffect(() => {
    connectToDeriv();
  }, []);

  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Online/Offline handlers
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Internet connection restored');
      connectToDeriv();
    };
    
    const handleOffline = () => {
      toast.error('Internet connection lost');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const connectToDeriv = async () => {
    setIsConnecting(true);
    
    try {
      await derivService.connect();
      setIsConnected(true);
      setIsConnecting(false);
      toast.success('Connected to market data');
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnected(false);
      setIsConnecting(false);
      
      setTimeout(() => {
        if (!isConnected) {
          connectToDeriv();
        }
      }, 5000);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  };

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
    localStorage.setItem('selectedTimeframe', timeframe);
  };

  const handleMarketChange = (market) => {
    setSelectedMarket(market);
    localStorage.setItem('selectedMarket', market);
    
    if (market === 'forex') {
      setSelectedSymbol(FOREX_PAIRS[0]);
    } else {
      setSelectedSymbol(SYNTHETIC_INDICES[0]);
    }
  };

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const appContextValue = {
    selectedTimeframe,
    setSelectedTimeframe: handleTimeframeChange,
    selectedMarket,
    setSelectedMarket: handleMarketChange,
    selectedSymbol,
    setSelectedSymbol: handleSymbolChange,
    isConnected,
    theme,
    toggleTheme,
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <div className={clsx(
        "min-h-screen transition-colors duration-300",
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900'
      )}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#1e293b' : '#ffffff',
              color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
              border: '1px solid',
              borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
            },
          }}
        />

        {/* Connection Status Bar */}
        <div className={clsx(
          "px-4 py-1.5 text-center text-xs font-medium transition-all",
          isConnected
            ? "bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20"
            : isConnecting
            ? "bg-amber-500/10 text-amber-400 border-b border-amber-500/20"
            : "bg-red-500/10 text-red-400 border-b border-red-500/20"
        )}>
          <div className="flex items-center justify-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Connected to market data</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : isConnecting ? (
              <>
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Connecting to market data...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Disconnected from market data</span>
                <button
                  onClick={connectToDeriv}
                  className="underline hover:text-red-300 ml-2"
                >
                  Reconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <Header
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={handleTimeframeChange}
          selectedMarket={selectedMarket}
          onMarketChange={handleMarketChange}
          selectedSymbol={selectedSymbol}
          onSymbolChange={handleSymbolChange}
          isConnected={isConnected}
          theme={theme}
          onThemeToggle={toggleTheme}
        />

        {/* Main Content */}
        <main className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedTimeframe}-${selectedMarket}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard selectedTimeframe={selectedTimeframe} />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Welcome Modal */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowWelcome(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl bg-slate-900 border border-slate-800"
                onClick={e => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to MT5 Signal Pro v2</h2>
                  <p className="text-slate-400">Your advanced trading signal scanner</p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    '🔍 Scans 27 markets across 7 timeframes',
                    '📊 Multi-timeframe analysis with confluence',
                    '🎯 High-confidence signals only (70%+)',
                    '💡 Exact entry, stop loss & take profit levels',
                    '⚡ Real-time market data via Deriv API',
                    '🛡️ Advanced signal validation system',
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => setShowWelcome(false)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  Get Started
                </button>
                <p className="text-xs text-center text-slate-500 mt-3">
                  Select timeframe → Click Scan → Execute on MT5
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to Top */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 p-3 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-full shadow-lg z-40 transition-all"
            >
              <ChevronUp className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 py-6 px-6 mt-12 bg-slate-950/50">
          <div className="max-w-[1920px] mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-emerald-600 rounded flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-400">MT5 Signal Pro</span>
                <span className="text-xs text-slate-500">v2.0.0</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span>© {new Date().getFullYear()} All rights reserved</span>
                <span className="hidden md:inline">•</span>
                <span>Powered by Deriv API</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-600">
                ⚠️ Trading involves risk. Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AppContext.Provider>
  );
}

// SINGLE default export at the end
export default App;
