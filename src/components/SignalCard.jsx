import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, Shield,
  Clock, Zap, ChevronDown, ChevronUp,
  Copy, Share2, Star, AlertTriangle,
  CheckCircle2, BarChart3, Activity,
  DollarSign, Percent, ArrowUpRight,
  ArrowDownRight, Gauge
} from 'lucide-react';
import { formatNumber, formatTime } from '../utils/formatters';
import clsx from 'clsx';

export default function SignalCard({ signal, onAction, expanded: defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!signal) return null;

  const isBuy = signal.direction === 'BUY';
  const isSell = signal.direction === 'SELL';
  const isActive = signal.status === 'ACTIVE';
  const isNoSignal = signal.type === 'NO_SIGNAL';

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getQualityBadge = (grade) => {
    const badges = {
      'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'A': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'B': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'C': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'D': 'bg-red-500/10 text-red-400 border-red-500/20',
      'F': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return badges[grade] || badges['C'];
  };

  if (isNoSignal) {
    return (
      <div className="glass-card p-4 opacity-75">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm text-slate-400">{signal.message}</p>
            {signal.confidence && (
              <p className="text-xs text-slate-500 mt-1">
                Confidence: {signal.confidence.toFixed(1)}%
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={clsx(
        "glass-card overflow-hidden",
        isActive && "animate-glow"
      )}
    >
      {/* Header */}
      <div 
        className={clsx(
          "p-4 cursor-pointer transition-colors",
          isBuy ? "hover:bg-emerald-500/5" : "hover:bg-red-500/5"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Direction Badge */}
            <span className={clsx(
              "px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5",
              isBuy ? "signal-badge-buy" : "signal-badge-sell"
            )}>
              {isBuy ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {signal.direction}
            </span>

            {/* Quality Grade */}
            <span className={clsx(
              "px-2 py-0.5 rounded text-xs font-bold border",
              getQualityBadge(signal.quality)
            )}>
              {signal.quality}
            </span>

            {/* Confidence */}
            <span className={clsx(
              "text-sm font-semibold",
              getConfidenceColor(signal.confidence)
            )}>
              {signal.confidence}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {formatTime(signal.timestamp)}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Entry</p>
            <p className="text-sm font-mono font-bold">
              {formatNumber(signal.entry)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Stop Loss</p>
            <p className="text-sm font-mono font-bold text-red-400">
              {formatNumber(signal.stopLoss)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Take Profit</p>
            <p className="text-sm font-mono font-bold text-emerald-400">
              {formatNumber(signal.takeProfits?.[0]?.price)}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-800/50"
          >
            <div className="p-4 space-y-4">
              {/* Risk/Reward */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Risk/Reward Ratio</span>
                </div>
                <span className="text-lg font-bold text-purple-400">
                  1:{signal.riskRewardRatio?.toFixed(1)}
                </span>
              </div>

              {/* Position Size & Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Position Size</p>
                  <p className="text-sm font-bold">
                    {signal.positionSize?.toFixed(2)} lots
                  </p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Risk Amount</p>
                  <p className="text-sm font-bold text-red-400">
                    ${signal.risk?.maxLoss?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Take Profit Levels */}
              {signal.takeProfits?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    Take Profit Targets
                  </h4>
                  <div className="space-y-2">
                    {signal.takeProfits.map((tp, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                      >
                        <span className="text-sm">TP{index + 1}</span>
                        <span className="text-sm font-mono text-emerald-400">
                          {formatNumber(tp.price)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {tp.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MTF Confluence */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Multi-Timeframe Analysis
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {['ltf', 'current', 'mtf', 'htf'].map(group => (
                    <div
                      key={group}
                      className={clsx(
                        "p-2 rounded-lg text-center",
                        signal.multiTimeframe?.[`${group}Confluence`]
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "bg-slate-800/50 border border-slate-700/50"
                      )}
                    >
                      <p className="text-xs font-medium uppercase text-slate-400">
                        {group}
                      </p>
                      {signal.multiTimeframe?.[`${group}Confluence`] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mt-1" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-slate-500 mx-auto mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal Components */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  Signal Components
                </h4>
                <div className="space-y-2">
                  <ComponentBar
                    label="Trend Strength"
                    value={signal.components?.trendStrength}
                    color="emerald"
                  />
                  <ComponentBar
                    label="Momentum"
                    value={signal.components?.momentum}
                    color="blue"
                  />
                  <ComponentBar
                    label="Price Action"
                    value={signal.components?.priceAction}
                    color="purple"
                  />
                  <ComponentBar
                    label="Volume"
                    value={signal.components?.volume}
                    color="amber"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onAction?.('copy', signal)}
                  className="btn-secondary flex-1 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Setup
                </button>
                <button
                  onClick={() => onAction?.('share', signal)}
                  className="btn-secondary flex-1 text-xs"
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  Share
                </button>
                <button
                  onClick={() => onAction?.('favorite', signal)}
                  className="btn-secondary text-xs"
                >
                  <Star className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ComponentBar({ label, value, color }) {
  const colors = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={clsx("h-full rounded-full", colors[color])}
        />
      </div>
    </div>
  );
}
