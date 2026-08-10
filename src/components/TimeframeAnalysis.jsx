import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, 
  Activity, Layers 
} from 'lucide-react';
import { TIMEFRAME_HIERARCHY } from '../constants/timeframes';
import clsx from 'clsx';

export default function TimeframeAnalysis({ marketData, selectedTimeframe }) {
  const hierarchy = TIMEFRAME_HIERARCHY[selectedTimeframe];
  if (!hierarchy) return null;

  const getAnalysis = (tf) => {
    return marketData?.timeframes?.[tf] || {
      signal: 'NEUTRAL',
      strength: 0,
      confidence: 0,
    };
  };

  const TimeframeCard = ({ timeframe, type, analysis }) => {
    const isBuy = analysis.signal === 'BUY';
    const isSell = analysis.signal === 'SELL';
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={clsx(
          "p-3 rounded-xl border",
          isBuy ? "bg-emerald-500/10 border-emerald-500/20" :
          isSell ? "bg-red-500/10 border-red-500/20" :
          "bg-slate-500/10 border-slate-500/20"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">{type}</span>
          <span className="text-sm font-bold text-white">{timeframe}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isBuy ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
           isSell ? <TrendingDown className="w-4 h-4 text-red-400" /> :
           <Minus className="w-4 h-4 text-slate-400" />}
          <span className={clsx(
            "text-sm font-semibold",
            isBuy ? "text-emerald-400" :
            isSell ? "text-red-400" : "text-slate-400"
          )}>
            {analysis.signal}
          </span>
        </div>

        <div className="mt-2">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full",
                isBuy ? "bg-emerald-500" : isSell ? "bg-red-500" : "bg-slate-500"
              )}
              style={{ width: `${analysis.strength}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold">Multi-Timeframe View</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {hierarchy.ltf?.map(tf => (
          <TimeframeCard
            key={tf}
            timeframe={tf}
            type="LTF"
            analysis={getAnalysis(tf)}
          />
        ))}
        <TimeframeCard
          timeframe={hierarchy.current}
          type="Current"
          analysis={getAnalysis(hierarchy.current)}
        />
        {hierarchy.mtf?.map(tf => (
          <TimeframeCard
            key={tf}
            timeframe={tf}
            type="MTF"
            analysis={getAnalysis(tf)}
          />
        ))}
        {hierarchy.htf?.map(tf => (
          <TimeframeCard
            key={tf}
            timeframe={tf}
            type="HTF"
            analysis={getAnalysis(tf)}
          />
        ))}
      </div>
    </div>
  );
}
