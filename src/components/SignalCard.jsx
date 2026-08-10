import React from 'react';
import { TrendingUp, TrendingDown, Target, Shield, Gauge } from 'lucide-react';
import { formatPrice } from '../utils/formatters';
import clsx from 'clsx';

export default function SignalCard({ signal }) {
  if (!signal) return null;

  const isBuy = signal.direction === 'BUY';
  const confidenceLevel = signal.confidence >= 85 ? 'high' : signal.confidence >= 75 ? 'medium' : 'low';

  return (
    <div className={clsx(
      "glass-card p-5 hover:scale-105 transition-transform",
      isBuy ? "hover:border-emerald-500/30" : "hover:border-red-500/30"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">{signal.symbol}</span>
          <span className={clsx(
            "px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1",
            isBuy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
          )}>
            {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {signal.direction}
          </span>
        </div>
        <div className={clsx(
          "flex items-center gap-1 font-bold text-lg",
          `text-${confidenceLevel === 'high' ? 'emerald' : confidenceLevel === 'medium' ? 'amber' : 'red'}-400`
        )}>
          <Gauge className="w-5 h-5" />
          {signal.confidence.toFixed(1)}%
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
          <span className="text-slate-400">Entry</span>
          <span className="font-mono font-bold">{formatPrice(signal.entry)}</span>
        </div>
        <div className="flex justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <span className="text-slate-400 flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" /> Stop Loss</span>
          <span className="font-mono font-bold text-red-400">{formatPrice(signal.stopLoss)}</span>
        </div>
        <div className="flex justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <span className="text-slate-400 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" /> Take Profit</span>
          <span className="font-mono font-bold text-emerald-400">{formatPrice(signal.takeProfit)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
          <p className="text-xs text-slate-500">R:R</p>
          <p className="text-sm font-semibold text-purple-400">1:{signal.riskReward}</p>
        </div>
        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
          <p className="text-xs text-slate-500">MTF</p>
          <p className="text-sm font-semibold text-amber-400">
            {(signal.mtfConfirmed?.length || 0) + (signal.htfConfirmed?.length || 0)}/5
          </p>
        </div>
      </div>
    </div>
  );
}
