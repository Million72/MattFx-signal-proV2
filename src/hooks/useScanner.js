import { useState, useCallback, useRef } from 'react';
import { derivService } from '../services/deriv';
import { FOREX_PAIRS, SYNTHETIC_INDICES } from '../constants/markets';
import { TIMEFRAME_HIERARCHY } from '../constants/timeframes';
import { EMA } from '../indicators/ema';
import { RSI } from '../indicators/rsi';
import { MACD } from '../indicators/macd';
import { ATR } from '../indicators/atr';
import { ADX } from '../indicators/adx';

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [signals, setSignals] = useState([]);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [lastScan, setLastScan] = useState(null);
  const scanAbortRef = useRef(false);

  const analyzeSymbol = async (symbol, timeframe) => {
    try {
      const hierarchy = TIMEFRAME_HIERARCHY[timeframe];
      if (!hierarchy) return null;

      const allTimeframes = [
        ...hierarchy.ltf,
        hierarchy.current,
        ...hierarchy.mtf,
        ...hierarchy.htf,
      ];

      // Get candles for current timeframe
      const candles = await derivService.getCandles(symbol, timeframe, 100);
      
      if (!candles || candles.length < 50) return null;

      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const currentPrice = closes[closes.length - 1];

      // Calculate indicators
      const ema20 = new EMA(20).calculate(closes);
      const ema50 = new EMA(50).calculate(closes);
      const ema200 = new EMA(200).calculate(closes);
      const rsi = new RSI(14).calculate(closes);
      const macd = new MACD().calculate(closes);
      const atr = new ATR(14).calculate(highs, lows, closes);
      const adx = new ADX(14).calculate(highs, lows, closes);

      const lastEMA20 = ema20[ema20.length - 1];
      const lastEMA50 = ema50[ema50.length - 1];
      const lastEMA200 = ema200[ema200.length - 1];
      const lastRSI = rsi[rsi.length - 1];
      const lastATR = atr[atr.length - 1];
      const lastADX = adx.adx[adx.adx.length - 1] || 0;
      const macdValues = macd.getValues();
      const macdCrossover = macd.getCrossover();

      // Determine trend
      let trend = 'NEUTRAL';
      let trendStrength = 0;

      if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50 && lastEMA50 > lastEMA200) {
        trend = 'STRONG_BULLISH';
        trendStrength = 85;
      } else if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50) {
        trend = 'BULLISH';
        trendStrength = 65;
      } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50 && lastEMA50 < lastEMA200) {
        trend = 'STRONG_BEARISH';
        trendStrength = 85;
      } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50) {
        trend = 'BEARISH';
        trendStrength = 65;
      } else if (currentPrice > lastEMA20) {
        trend = 'WEAK_BULLISH';
        trendStrength = 45;
      } else if (currentPrice < lastEMA20) {
        trend = 'WEAK_BEARISH';
        trendStrength = 45;
      }

      // ADX confirmation
      if (lastADX > 25) {
        trendStrength = Math.min(100, trendStrength + 10);
      }

      // Determine signal
      let signal = 'NEUTRAL';
      let confidence = 0;

      const isBullish = trend.includes('BULLISH');
      const isBearish = trend.includes('BEARISH');
      const rsiBullish = lastRSI > 50 && lastRSI < 70;
      const rsiBearish = lastRSI < 50 && lastRSI > 30;
      const macdBullish = macdValues.histogram > 0 && macdCrossover === 'BULLISH';
      const macdBearish = macdValues.histogram < 0 && macdCrossover === 'BEARISH';

      if (isBullish && rsiBullish && macdBullish) {
        signal = 'BUY';
        confidence = Math.min(95, trendStrength + 10);
      } else if (isBearish && rsiBearish && macdBearish) {
        signal = 'SELL';
        confidence = Math.min(95, trendStrength + 10);
      } else if (isBullish && rsiBullish) {
        signal = 'BUY';
        confidence = Math.min(80, trendStrength);
      } else if (isBearish && rsiBearish) {
        signal = 'SELL';
        confidence = Math.min(80, trendStrength);
      } else if (isBullish) {
        signal = 'BUY';
        confidence = Math.min(65, trendStrength * 0.8);
      } else if (isBearish) {
        signal = 'SELL';
        confidence = Math.min(65, trendStrength * 0.8);
      }

      // Get MTF confirmations
      const mtfConfirmed = [];
      const htfConfirmed = [];

      // Check MTF timeframes
      for (const tf of hierarchy.mtf) {
        try {
          const tfCandles = await derivService.getCandles(symbol, tf, 50);
          if (tfCandles && tfCandles.length > 0) {
            const tfCloses = tfCandles.map(c => c.close);
            const tfEMA20 = new EMA(20).calculate(tfCloses);
            const tfLastClose = tfCloses[tfCloses.length - 1];
            const tfLastEMA20 = tfEMA20[tfEMA20.length - 1];
            
            if ((signal === 'BUY' && tfLastClose > tfLastEMA20) || 
                (signal === 'SELL' && tfLastClose < tfLastEMA20)) {
              mtfConfirmed.push(tf);
            }
          }
        } catch (e) {
          // Skip failed timeframe
        }
      }

      // Check HTF timeframes
      for (const tf of hierarchy.htf) {
        try {
          const tfCandles = await derivService.getCandles(symbol, tf, 50);
          if (tfCandles && tfCandles.length > 0) {
            const tfCloses = tfCandles.map(c => c.close);
            const tfEMA20 = new EMA(20).calculate(tfCloses);
            const tfLastClose = tfCloses[tfCloses.length - 1];
            const tfLastEMA20 = tfEMA20[tfEMA20.length - 1];
            
            if ((signal === 'BUY' && tfLastClose > tfLastEMA20) || 
                (signal === 'SELL' && tfLastClose < tfLastEMA20)) {
              htfConfirmed.push(tf);
            }
          }
        } catch (e) {
          // Skip failed timeframe
        }
      }

      // MTF bonus confidence
      const totalMTFChecks = hierarchy.mtf.length + hierarchy.htf.length;
      const totalConfirmed = mtfConfirmed.length + htfConfirmed.length;
      const mtfBonus = totalMTFChecks > 0 ? (totalConfirmed / totalMTFChecks) * 15 : 0;
      confidence = Math.min(98, confidence + mtfBonus);

      // Only return high-confidence signals
      if (confidence < 65 || signal === 'NEUTRAL') return null;

      // Calculate SL and TP
      const atrValue = lastATR || currentPrice * 0.001;
      const slDistance = atrValue * 1.5;
      const tpDistance = atrValue * 2.5;

      const entry = currentPrice;
      const stopLoss = signal === 'BUY' ? entry - slDistance : entry + slDistance;
      const takeProfit = signal === 'BUY' ? entry + tpDistance : entry - tpDistance;

      return {
        id: `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        type: FOREX_PAIRS.includes(symbol) ? 'forex' : 'synthetic',
        direction: signal,
        confidence,
        entry,
        stopLoss,
        takeProfit,
        riskReward: (tpDistance / slDistance).toFixed(2),
        trend,
        trendStrength,
        rsi: lastRSI,
        atr: atrValue,
        adx: lastADX,
        mtfConfirmed,
        htfConfirmed,
        timestamp: Date.now(),
        status: 'ACTIVE',
      };
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  };

  const scanAllMarkets = useCallback(async (timeframe) => {
    if (isScanning) return;

    setIsScanning(true);
    setSignals([]);
    scanAbortRef.current = false;

    const allMarkets = [...FOREX_PAIRS, ...SYNTHETIC_INDICES];
    setScanProgress({ current: 0, total: allMarkets.length });

    try {
      // Ensure connection
      if (!derivService.isConnected) {
        await derivService.connect();
      }

      const results = [];

      // Scan markets in batches of 3
      for (let i = 0; i < allMarkets.length; i += 3) {
        if (scanAbortRef.current) break;

        const batch = allMarkets.slice(i, i + 3);

        const batchResults = await Promise.all(
          batch.map(symbol => analyzeSymbol(symbol, timeframe))
        );

        results.push(...batchResults.filter(Boolean));
        setScanProgress({ current: Math.min(i + 3, allMarkets.length), total: allMarkets.length });
      }

      // Sort by confidence
      const sortedSignals = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 20);

      setSignals(sortedSignals);
      setLastScan(Date.now());
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  return {
    isScanning,
    signals,
    scanProgress,
    lastScan,
    scanAllMarkets,
  };
}
