import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Target, 
  Shield, Activity, Award 
} from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/formatters';
import clsx from 'clsx';

export default function PerformanceMetrics({ performance, compact = false }) {
  if (!performance) {
    return (
      <div className="glass-card p-4 text-center">
        <p className="text-slate-400 text-sm">No performance data yet</p>
      </div>
    );
  }

  const metrics = [
    { label: 'Win Rate', value: formatPercent(performance.winRate), icon: Target, color: 'emerald' },
    { label: 'Profit Factor', value: performance.profitFactor?.toFixed(2), icon: TrendingUp, color: 'blue' },
    { label: 'Sharpe Ratio', value: performance.sharpeRatio?.toFixed(2), icon: Award, color: 'purple' },
    { label: 'Max Drawdown', value: `$${formatNumber(performance.maxDrawdown, 0)}`, icon: TrendingDown, color: 'red' },
    { label: 'Total Trades', value: performance.totalTrades, icon: Activity, color: 'amber' },
    { label: 'Avg R:R', value: `1:${performance.averageRR?.toFixed(1)}`, icon: Shield, color: 'cyan' },
  ];

  if (compact) {
    return (
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-400">Performance</h4>
        {metrics.slice(0, 4).map(metric => (
          <div key={metric.label} className="flex justify-between items-center">
            <span className="text-xs text-slate-500">{metric.label}</span>
            <span className={clsx("text-sm font-bold", `text-${metric.color}-400`)}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-slate-800/50 rounded-xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <metric.icon className={clsx("w-4 h-4", `text-${metric.color}-400`)} />
              <span className="text-xs text-slate-400">{metric.label}</span>
            </div>
            <p className={clsx("text-xl font-bold", `text-${metric.color}-400`)}>
              {metric.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
