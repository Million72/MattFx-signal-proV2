import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Gauge } from 'lucide-react';
import { formatPrice, formatTime } from '../utils/formatters';
import clsx from 'clsx';

export default function ActiveSignals({ signals, onSignalClick }) {
  const activeSignals = signals?.filter(s => s.type !== 'NO_SIGNAL') || [];

  if (!activeSignals.length) {
    return (
      <div className="p-6 text-center">
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No active signals</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/50 max-h-96 overflow-y-auto">
      <AnimatePresence>
        {activeSignals.map((signal, index) => (
          <motion.div
            key={signal.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSignalClick?.(signal)}
            className={clsx(
              "p-4 cursor-pointer transition-all",
              signal.direction === 'BUY' 
                ? 'hover:bg-emerald-500/5' 
                : 'hover:bg-red-500/5'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{signal.symbol}</span>
                <span className={clsx(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded",
                  signal.direction === 'BUY'
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                )}>
                  {signal.direction === 'BUY' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {signal.direction}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Gauge className="w-3 h-3 text-blue-400" />
                <span className="text-blue-400 font-semibold">
                  {signal.confidence?.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Entry</span>
                <p className="font-mono text-white">{formatPrice(signal.entry)}</p>
              </div>
              <div>
                <span className="text-slate-500">SL</span>
                <p className="font-mono text-red-400">{formatPrice(signal.stopLoss)}</p>
              </div>
              <div>
                <span className="text-slate-500">TP</span>
                <p className="font-mono text-emerald-400">{formatPrice(signal.takeProfit)}</p>
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {formatTime(signal.timestamp)}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
