import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, 
  CheckCircle2, XCircle, AlertCircle,
  ArrowUp, ArrowDown, Activity
} from 'lucide-react';
import { TIMEFRAME_HIERARCHY } from '../constants/timeframes';
import clsx from 'clsx';

export default function MTFAnalysis({ marketData, selectedTimeframe, signals }) {
  const hierarchy = TIMEFRAME_HIERARCHY[selectedTimeframe];
  
  if (!hierarchy || !marketData?.timeframes) return null;

  const getTimeframeAnalysis = (tf) => {
    return marketData.timeframes[tf] || {
      trend: 'NEUTRAL',
      strength: 0,
      signal: 'NEUTRAL',
      confidence: 0
    };
  };

  const TimeframeBox = ({ timeframe, type, analysis }) => {
    const getColor = () => {
      if (analysis.signal === 'BUY') return 'emerald';
      if (analysis.signal === 'SELL') return 'red';
      return 'slate';
    };

    const colors = {
      emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        icon: TrendingUp
      },
      red: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: TrendingDown
      },
      slate: {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        text: 'text-slate-400',
        icon: Minus
      }
    };

    const color = colors[getColor()];
    const Icon = color.icon;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx(
          "p-3 rounded-xl border",
          color.bg, color.border
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">{type}</span>
          <span className={clsx("text-sm font-bold", color.text)}>
            {timeframe}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <Icon className={clsx("w-5 h-5", color.text)} />
          <span className={clsx("text-sm font-semibold", color.text)}>
            {analysis.signal}
          </span>
        </div>

        <div className="space-y-2">
          {/* Trend Strength */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Strength</span>
              <span className={color.text}>{analysis.strength}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.strength}%` }}
                className={clsx(
                  "h-full rounded-full",
                  analysis.signal === 'BUY' ? 'bg-emerald-500' :
                  analysis.signal === 'SELL' ? 'bg-red-500' : 'bg-slate-500'
                )}
              />
            </div>
          </div>

          {/* Confidence */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Confidence</span>
              <span className={color.text}>{analysis.confidence}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.confidence}%` }}
                className={clsx(
                  "h-full rounded-full",
                  analysis.confidence > 70 ? 'bg-emerald-500' :
                  analysis.confidence > 40 ? 'bg-amber-500' : 'bg-red-500'
                )}
              />
            </div>
          </div>

          {/* Indicators */}
          <div className="flex gap-1 mt-2">
            {analysis.indicators?.trend && (
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-xs",
                analysis.indicators.trend === 'ALIGNED' 
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-500/20 text-slate-400'
              )}>
                Trend
              </span>
            )}
            {analysis.indicators?.momentum && (
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-xs",
                analysis.indicators.momentum === 'CONFIRMED' 
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-slate-500/20 text-slate-400'
              )}>
                Mom
              </span>
            )}
            {analysis.indicators?.volume && (
              <span className={clsx(
                "px-1.5 py-0.5 rounded text-xs",
                analysis.indicators.volume === 'SUPPORTED' 
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-slate-500/20 text-slate-400'
              )}>
                Vol
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const ConfluenceScore = () => {
    const allSignals = [
      ...hierarchy.ltf.map(tf => getTimeframeAnalysis(tf)),
      getTimeframeAnalysis(hierarchy.current),
      ...hierarchy.mtf.map(tf => getTimeframeAnalysis(tf)),
      ...hierarchy.htf.map(tf => getTimeframeAnalysis(tf)),
    ];

    const buyCount = allSignals.filter(s => s.signal === 'BUY').length;
    const sellCount = allSignals.filter(s => s.signal === 'SELL').length;
    const total = allSignals.length;
    
    const confluencePercent = Math.max(buyCount, sellCount) / total * 100;
    const dominantSignal = buyCount > sellCount ? 'BUY' : sellCount > buyCount ? 'SELL' : 'NEUTRAL';

    return (
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            MTF Confluence Score
          </h4>
          <span className={clsx(
            "text-lg font-bold",
            dominantSignal === 'BUY' ? 'text-emerald-400' :
            dominantSignal === 'SELL' ? 'text-red-400' : 'text-slate-400'
          )}>
            {confluencePercent.toFixed(0)}%
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-emerald-500/10 rounded-lg p-2 text-center">
            <div className="text-sm text-emerald-400 font-semibold">{buyCount}</div>
            <div className="text-xs text-slate-500">Bullish</div>
          </div>
          <div className="flex-1 bg-red-500/10 rounded-lg p-2 text-center">
            <div className="text-sm text-red-400 font-semibold">{sellCount}</div>
            <div className="text-xs text-slate-500">Bearish</div>
          </div>
          <div className="flex-1 bg-slate-500/10 rounded-lg p-2 text-center">
            <div className="text-sm text-slate-400 font-semibold">
              {total - buyCount - sellCount}
            </div>
            <div className="text-xs text-slate-500">Neutral</div>
          </div>
        </div>

        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(buyCount / total) * 100}%` }}
            className="bg-emerald-500 h-full"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(sellCount / total) * 100}%` }}
            className="bg-red-500 h-full"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          Multi-Timeframe Analysis
        </h3>
        <span className="text-sm text-slate-500">
          {selectedTimeframe} selected
        </span>
      </div>

      <ConfluenceScore />

      {/* LTF Group */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          <ArrowDown className="w-3 h-3" />
          Lower Timeframes (Entry Precision)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hierarchy.ltf.map(tf => (
            <TimeframeBox
              key={tf}
              timeframe={tf}
              type="LTF"
              analysis={getTimeframeAnalysis(tf)}
            />
          ))}
        </div>
      </div>

      {/* Current Timeframe */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          Current Timeframe
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <TimeframeBox
            timeframe={hierarchy.current}
            type="Current"
            analysis={getTimeframeAnalysis(hierarchy.current)}
          />
        </div>
      </div>

      {/* MTF Group */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          <Minus className="w-3 h-3" />
          Medium Timeframes (Context)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hierarchy.mtf.map(tf => (
            <TimeframeBox
              key={tf}
              timeframe={tf}
              type="MTF"
              analysis={getTimeframeAnalysis(tf)}
            />
          ))}
        </div>
      </div>

      {/* HTF Group */}
      <div>
        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          <ArrowUp className="w-3 h-3" />
          Higher Timeframes (Trend Direction)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hierarchy.htf.map(tf => (
            <TimeframeBox
              key={tf}
              timeframe={tf}
              type="HTF"
              analysis={getTimeframeAnalysis(tf)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
