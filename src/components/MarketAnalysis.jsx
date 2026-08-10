import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity,
  Gauge, Wind, BarChart3, DollarSign,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { COLORS } from '../constants/colors';
import clsx from 'clsx';

export default function MarketAnalysis({ marketData, timeframe, marketType }) {
  const analysis = useMemo(() => {
    if (!marketData?.analysis) return null;
    return marketData.analysis;
  }, [marketData]);

  if (!analysis) return null;

  return (
    <div className="glass-card">
      <div className="p-4 border-b border-slate-800/50">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Market Analysis
        </h3>
      </div>

      <div className="p-4 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={TrendingUp}
            label="Trend"
            value={analysis.trend?.direction}
            subValue={`Strength: ${analysis.trend?.strength}%`}
            color={analysis.trend?.direction === 'BULLISH' ? 'emerald' : 'red'}
          />
          <MetricCard
            icon={Activity}
            label="Momentum"
            value={analysis.momentum?.signal}
            subValue={`RSI: ${analysis.momentum?.rsi?.toFixed(1)}`}
            color={analysis.momentum?.signal === 'BULLISH' ? 'emerald' : 'red'}
          />
          <MetricCard
            icon={Wind}
            label="Volatility"
            value={analysis.volatility?.regime}
            subValue={`ATR: ${analysis.volatility?.atr?.toFixed(4)}`}
            color={analysis.volatility?.regime === 'NORMAL' ? 'blue' : 'amber'}
          />
          <MetricCard
            icon={Gauge}
            label="Volume"
            value={analysis.volume?.trend}
            subValue={`${analysis.volume?.changePercent}% vs avg`}
            color={analysis.volume?.trend === 'INCREASING' ? 'emerald' : 'red'}
          />
        </div>

        {/* Indicator Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* RSI Chart */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold mb-3">RSI (14)</h4>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={analysis.indicators?.rsiHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* MACD Chart */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold mb-3">MACD</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={analysis.indicators?.macdHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="histogram"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
                <ReferenceLine y={0} stroke="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Chart */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold mb-3">Volume Analysis</h4>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={analysis.indicators?.volumeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="volume"
                  fill="#64748b"
                  radius={[2, 2, 0, 0]}
                  opacity={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="avgVolume"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ATR Chart */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold mb-3">ATR (14)</h4>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={analysis.indicators?.atrHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="rgba(139, 92, 246, 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support/Resistance Levels */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Key Levels</h4>
          <div className="space-y-2">
            {analysis.levels?.resistance?.map((level, i) => (
              <div
                key={`r-${i}`}
                className="flex items-center justify-between p-2 bg-red-500/5 
                         border border-red-500/20 rounded-lg"
              >
                <span className="text-xs text-slate-400">Resistance {i + 1}</span>
                <span className="text-sm font-mono text-red-400">
                  {level.price.toFixed(5)}
                </span>
                <span className="text-xs text-slate-500">
                  Strength: {level.strength}%
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-2 bg-slate-800/50 
                          border border-slate-700/50 rounded-lg">
              <span className="text-xs text-slate-400">Current Price</span>
              <span className="text-sm font-mono font-bold">
                {analysis.currentPrice?.toFixed(5)}
              </span>
            </div>
            {analysis.levels?.support?.map((level, i) => (
              <div
                key={`s-${i}`}
                className="flex items-center justify-between p-2 bg-emerald-500/5 
                         border border-emerald-500/20 rounded-lg"
              >
                <span className="text-xs text-slate-400">Support {i + 1}</span>
                <span className="text-sm font-mono text-emerald-400">
                  {level.price.toFixed(5)}
                </span>
                <span className="text-xs text-slate-500">
                  Strength: {level.strength}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Market Structure */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Market Structure</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Structure</p>
              <p className="text-sm font-semibold">
                {analysis.structure?.pattern || 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Phase</p>
              <p className="text-sm font-semibold">
                {analysis.structure?.phase || 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">BOS</p>
              <p className={clsx(
                "text-sm font-semibold",
                analysis.structure?.bos ? 'text-emerald-400' : 'text-slate-400'
              )}>
                {analysis.structure?.bos ? 'Detected' : 'None'}
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">CHoCH</p>
              <p className={clsx(
                "text-sm font-semibold",
                analysis.structure?.choch ? 'text-amber-400' : 'text-slate-400'
              )}>
                {analysis.structure?.choch ? 'Detected' : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: 'text-emerald-400'
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: 'text-red-400'
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      icon: 'text-blue-400'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: 'text-amber-400'
    },
  };

  const c = colors[color] || colors.blue;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx("p-3 rounded-xl border", c.bg, c.border)}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx("w-4 h-4", c.icon)} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={clsx("text-lg font-bold mb-1", c.text)}>
        {value}
      </div>
      <div className="text-xs text-slate-500">{subValue}</div>
    </motion.div>
  );
          }
