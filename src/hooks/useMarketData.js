import { useState, useEffect, useCallback, useRef } from 'react';
import { derivService } from '../services/deriv';
import { TIMEFRAME_HIERARCHY } from '../constants/timeframes';
import { MultiTimeframeAnalyzer } from '../engine/multiTimeframeAnalyzer';

export function useMarketData(symbol, selectedTimeframe) {
  const [marketData, setMarketData] = useState({
    current: null,
    timeframes: {},
    analysis: null,
    indicators: {},
    levels: null,
    signals: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const analyzerRef = useRef(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Ensure WebSocket connection
      if (!derivService.isConnected) {
        await derivService.connect();
      }

      // Subscribe to all required timeframes
      await derivService.subscribeToMultipleTimeframes(symbol, selectedTimeframe);

      // Set up listener for data updates
      const handleCandleUpdate = (candles) => {
        setMarketData(prev => {
          const newTimeframes = { ...prev.timeframes };
          newTimeframes[selectedTimeframe] = candles;

          // Run multi-timeframe analysis
          const analyzer = new MultiTimeframeAnalyzer(
            { [selectedTimeframe]: candles },
            selectedTimeframe
          );
          
          analyzer.analyze().then(results => {
            setMarketData(current => ({
              ...current,
              analysis: results,
              indicators: calculateIndicators(candles),
              levels: identifyKeyLevels(candles),
            }));
          });

          return {
            ...prev,
            current: candles[candles.length - 1],
            timeframes: newTimeframes,
          };
        });

        setIsLoading(false);
      };

      derivService.addListener(symbol, selectedTimeframe, handleCandleUpdate);

      return () => {
        derivService.removeListener(symbol, selectedTimeframe, handleCandleUpdate);
      };
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [symbol, selectedTimeframe]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return { marketData, isLoading, error, refetch: fetchMarketData };
}

function calculateIndicators(candles) {
  if (!candles?.length) return {};

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  return {
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    rsi14: calculateRSI(closes, 14),
    atr: calculateATR(highs, lows, closes, 14),
    bollingerBands: calculateBollingerBands(closes, 20, 2),
    macd: calculateMACD(closes),
    rsiHistory: closes.slice(-50).map((close, i) => ({
      time: i,
      value: calculateRSI(closes.slice(0, i + 50), 14)
    })),
    volumeHistory: candles.slice(-50).map((candle, i) => ({
      time: i,
      volume: candle.volume || 0,
    })),
  };
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}

function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const difference = closes[i] - closes[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const difference = closes[i] - closes[i - 1];
    
    if (difference >= 0) {
      avgGain = (avgGain * (period - 1) + difference) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - difference) / period;
    }
  }

  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateATR(highs, lows, closes, period = 14) {
  const trueRanges = [];
  
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  const atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  return atr;
}

function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  const sma = [];
  const upper = [];
  const lower = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, val) => sum + val, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    sma.push(mean);
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  
  return {
    middle: sma,
    upper,
    lower,
    bandwidth: (upper[upper.length - 1] - lower[lower.length - 1]) / sma[sma.length - 1],
    percentB: (closes[closes.length - 1] - lower[lower.length - 1]) / 
              (upper[upper.length - 1] - lower[lower.length - 1]),
    squeeze: (upper[upper.length - 1] - lower[lower.length - 1]) / sma[sma.length - 1] < 0.1,
  };
}

function calculateMACD(closes) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: histogram[histogram.length - 1],
    crossover: histogram[histogram.length - 1] > 0 && histogram[histogram.length - 2] <= 0 
      ? 'BULLISH' 
      : histogram[histogram.length - 1] < 0 && histogram[histogram.length - 2] >= 0 
        ? 'BEARISH' 
        : 'NEUTRAL',
  };
}

function identifyKeyLevels(candles) {
  if (!candles?.length) return { support: [], resistance: [] };

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];

  // Find swing highs and lows
  const swingHighs = [];
  const swingLows = [];

  for (let i = 2; i < highs.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && 
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push({ price: highs[i], time: candles[i].time });
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && 
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push({ price: lows[i], time: candles[i].time });
    }
  }

  // Cluster nearby levels
  const resistanceLevels = clusterLevels(swingHighs, currentPrice)
    .filter(level => level.price > currentPrice)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  const supportLevels = clusterLevels(swingLows, currentPrice)
    .filter(level => level.price < currentPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  return {
    support: supportLevels,
    resistance: resistanceLevels,
  };
}

function clusterLevels(levels, tolerance = 0.001) {
  if (!levels.length) return [];
  
  const sorted = [...levels].sort((a, b) => a.price - b.price);
  const clusters = [];
  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const avgPrice = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
    if (Math.abs(sorted[i].price - avgPrice) / avgPrice <= tolerance) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push(currentCluster);
      currentCluster = [sorted[i]];
    }
  }
  clusters.push(currentCluster);

  return clusters.map(cluster => ({
    price: cluster.reduce((sum, l) => sum + l.price, 0) / cluster.length,
    strength: Math.min(100, cluster.length * 25),
    touches: cluster.length,
  }));
}
