import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import {
  Zap,
  Settings,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Monitor,
  ChevronUp,
} from 'lucide-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StatsBar from './components/StatsBar';
import { derivService } from './services/deriv';
import { TIMEFRAMES } from './constants/timeframes';
import { FOREX_PAIRS, SYNTHETIC_INDICES } from './constants/markets';
import clsx from 'clsx';

// App Context for global state
export const AppContext = React.createContext();

export default function App() {
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // App State
  const [appVersion] = useState('2.0.0');
  const [firstVisit, setFirstVisit] = useState(() => {
    return !localStorage.getItem('visited');
  });
  const [showWelcome, setShowWelcome] = useState(false);

  // Initialize app
  useEffect(() => {
    initializeApp();
    setupEventListeners();
    
    return () => {
      cleanupApp();
    };
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

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const initializeApp = () => {
    // Mark as visited
    if (firstVisit) {
      localStorage.setItem('visited', 'true');
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
    }

    // Load saved preferences
    const savedTimeframe = localStorage.getItem('selectedTimeframe');
    const savedMarket = localStorage.getItem('selectedMarket');
    
    if (savedTimeframe) setSelectedTimeframe(savedTimeframe);
    if (savedMarket) setSelectedMarket(savedMarket);

    console.log('🚀 MT5 Signal Pro v2 Initialized');
    console.log('📊 Version:', appVersion);
    console.log('⏰ Time:', new Date().toLocaleString());
  };

  const setupEventListeners = () => {
    // Handle online/offline status
    window.addEventListener('online', () => {
      toast.success('Internet connection restored');
      connectToDeriv();
    });
    
    window.addEventListener('offline', () => {
      toast.error('Internet connection lost');
      setIsConnected(false);
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', handleKeyboardShortcuts);
  };

  const cleanupApp = () => {
    derivService.disconnect();
    window.removeEventListener('keydown', handleKeyboardShortcuts);
  };

  const connectToDeriv = async () => {
    setIsConnecting(true);
    
    try {
      await derivService.connect();
      setIsConnected(true);
      setIsConnecting(false);
      toast.success('Connected to market data');
      console.log('✅ Connected to Deriv WebSocket');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      setIsConnected(false);
      setIsConnecting(false);
      
      // Retry connection after delay
      setTimeout(() => {
        if (!isConnected) {
          connectToDeriv();
        }
      }, 5000);
    }
  };

  const handleKeyboardShortcuts = (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 's':
        // Start scan (handled in Dashboard)
        break;
      case 'r':
        // Refresh connection
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          connectToDeriv();
          toast.success('Reconnecting...');
        }
        break;
      case 't':
        // Toggle theme
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          toggleTheme();
        }
        break;
      case '1': case '2': case '3': case '4': case '5': case '6': case '7':
        // Switch timeframe
        const index = parseInt(e.key) - 1;
        if (TIMEFRAMES[index]) {
          setSelectedTimeframe(TIMEFRAMES[index].value);
          toast.success(`Timeframe: ${TIMEFRAMES[index].label}`);
        }
        break;
      case 'escape':
        // Close any open modals
        setSidebarOpen(false);
        break;
      default:
        break;
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
    
    // Auto-select first symbol of new market
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

  // App Context value
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
        {/* Toast Notifications */}
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
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: theme === 'dark' ? '#1e293b' : '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: theme === 'dark' ? '#1e293b' : '#ffffff',
              },
            },
          }}
        />

        {/* Connection Status Bar */}
        <ConnectionStatus 
          isConnected={isConnected} 
          isConnecting={isConnecting}
          onReconnect={connectToDeriv}
          theme={theme}
        />

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

        {/* Welcome Modal (First Visit) */}
        <AnimatePresence>
          {showWelcome && (
            <WelcomeModal onClose={() => setShowWelcome(false)} theme={theme} />
          )}
        </AnimatePresence>

        {/* Back to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={scrollToTop}
              className={clsx(
                "fixed bottom-8 right-8 p-3 rounded-full shadow-lg z-40 transition-all",
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <ChevronUp className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Footer */}
        <Footer theme={theme} version={appVersion} />
      </div>
    </AppContext.Provider>
  );
}

// Connection Status Component
function ConnectionStatus({ isConnected, isConnecting, onReconnect, theme }) {
  return (
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
              onClick={onReconnect}
              className="underline hover:text-red-300 ml-2"
            >
              Reconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Welcome Modal
function WelcomeModal({ onClose, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={clsx(
          "p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl",
          theme === 'dark' 
            ? 'bg-slate-900 border border-slate-800' 
            : 'bg-white border border-gray-200'
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to MT5 Signal Pro v2</h2>
          <p className="text-slate-400">
            Your advanced trading signal scanner
          </p>
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

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            Get Started
          </button>
          <p className="text-xs text-center text-slate-500">
            Select timeframe → Click Scan → Execute on MT5
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Footer Component
function Footer({ theme, version }) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={clsx(
      "border-t py-6 px-6 mt-12",
      theme === 'dark' 
        ? 'border-slate-800/50 bg-slate-950/50' 
        : 'border-gray-200 bg-gray-50'
    )}>
      <div className="max-w-[1920px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-emerald-600 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className={clsx(
              "text-sm font-semibold",
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            )}>
              MT5 Signal Pro
            </span>
            <span className="text-xs text-slate-500">v{version}</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>© {currentYear} All rights reserved</span>
            <span className="hidden md:inline">•</span>
            <span>Powered by Deriv API</span>
            <span className="hidden md:inline">•</span>
            <span>For educational purposes only</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <button className="hover:text-slate-400 transition-colors">Terms</button>
            <button className="hover:text-slate-400 transition-colors">Privacy</button>
            <button className="hover:text-slate-400 transition-colors">Support</button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600">
            ⚠️ Trading involves risk. Past performance does not guarantee future results.
            Always use proper risk management.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"
            >
              Reload Application
            </button>
            <p className="text-xs text-slate-500 mt-4">
              If the problem persists, please clear your browser cache and try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap App with Error Boundary
export function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default App;
