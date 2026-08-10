import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Activity, 
  Target, Shield, Zap 
} from 'lucide-react';
import { formatPercent, formatNumber } from '../utils/formatters';
import clsx from 'clsx';

export default function StatsBar({ performance, activeSignals }) {
  const stats = [
    {
      label: 'Win Rate',
      value: formatPercent(performance?.winRate || 0),
      icon: Target,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Profit Factor',
      value: performance?.profitFactor?.toFixed(2) || '0.00',
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Active Signals',
      value: activeSignals?.length || 0,
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Avg R:R',
      value: `1:${performance?.averageRR?.toFixed(1) || '0'}`,
      icon: Shield,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Total P&L',
      value: `$${formatNumber(performance?.totalPnL || 0, 2)}`,
      icon: Activity,
      color: (performance?.totalPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: (performance?.totalPnL || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="bg-slate-900/50 border-b border-slate-800/50">
      <div className="px-6 py-3">
        <div className="flex gap-4 overflow-x-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={clsx(
                "flex items-center gap-3 px-4 py-2 rounded-xl",
                stat.bg
              )}
            >
              <stat.icon className={clsx("w-4 h-4", stat.color)} />
              <div>
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className={clsx("text-sm font-bold", stat.color)}>{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
