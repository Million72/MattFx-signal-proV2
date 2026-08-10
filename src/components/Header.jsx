import React from 'react';
import { Zap } from 'lucide-react';
import { TIMEFRAMES } from '../constants/timeframes';
import clsx from 'clsx';

export default function Header({ selectedTimeframe, onTimeframeChange }) {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50">
      <div className="px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                MT5 Signal Scanner
              </h1>
              <p className="text-xs text-slate-500">High-Quality Trading Signals</p>
            </div>
          </div>

          <div className="flex gap-2">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedTimeframe === tf.value
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
