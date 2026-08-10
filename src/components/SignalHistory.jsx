import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatPrice, formatTime, formatPercent } from '../utils/formatters';
import clsx from 'clsx';

export default function SignalHistory({ signals, timeframe, filters }) {
  const filteredSignals = signals
    .filter(s => s.type !== 'NO_SIGNAL')
    .filter(s => filters.signalTypes.includes(s.direction))
    .filter(s => s.confidence >= filters.minConfidence);

  if (!filteredSignals.length) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No signal history yet</p>
        <p className="text-sm text-slate-500 mt-1">
          Signals will appear here after scanning
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800/50">
            <th className="text-left p-3 text-xs text-slate-400">Time</th>
            <th className="text-left p-3 text-xs text-slate-400">Symbol</th>
            <th className="text-left p-3 text-xs text-slate-400">Direction</th>
            <th className="text-left p-3 text-xs text-slate-400">Entry</th>
            <th className="text-left p-3 text-xs text-slate-400">SL</th>
            <th className="text-left p-3 text-xs text-slate-400">TP</th>
            <th className="text-left p-3 text-xs text-slate-400">Confidence</th>
            <th className="text-left p-3 text-xs text-slate-400">Result</th>
          </tr>
        </thead>
        <tbody>
          {filteredSignals.map((signal, index) => (
            <motion.tr
              key={signal.id || index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b border-slate-800/30 hover:bg-slate-800/30"
            >
              <td className="p-3 text-sm text-slate-400">
                {formatTime(signal.timestamp)}
              </td>
              <td className="p-3 text-sm font-medium">{signal.symbol}</td>
              <td className="p-3">
                <span className={clsx(
                  "flex items-center gap-1 text-sm font-semibold",
                  signal.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {signal.direction === 'BUY' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {signal.direction}
                </span>
              </td>
              <td className="p-3 text-sm font-mono">{formatPrice(signal.entry)}</td>
              <td className="p-3 text-sm font-mono text-red-400">
                {formatPrice(signal.stopLoss)}
              </td>
              <td className="p-3 text-sm font-mono text-emerald-400">
                {formatPrice(signal.takeProfit)}
              </td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        signal.confidence >= 80 ? 'bg-emerald-500' :
                        signal.confidence >= 70 ? 'bg-blue-500' :
                        'bg-amber-500'
                      )}
                      style={{ width: `${signal.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{signal.confidence.toFixed(0)}%</span>
                </div>
              </td>
              <td className="p-3">
                {signal.result ? (
                  signal.result === 'WIN' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )
                ) : (
                  <span className="text-xs text-slate-500">Pending</span>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
