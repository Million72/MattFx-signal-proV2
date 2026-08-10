import { trendAnalysis } from '../forex/analysis/trendAnalysis';
import { momentumAnalysis } from '../forex/analysis/momentumAnalysis';
import { volatilityAnalysis } from '../forex/analysis/volatilityAnalysis';
import { marketRegime } from '../forex/analysis/marketRegime';

export class SyntheticEngine {
  constructor() {
    this.analyses = new Map();
    this.syntheticConfig = {
      volatility: {
        adjustATR: true,
        volatilityMultiplier: 1.5,
      },
      crashBoom: {
        detectSpikes: true,
        spikeThreshold: 0.5,
      },
    };
  }

  async analyze(candles, timeframe, symbol) {
    if (!candles || candles.length < 50) return null;

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume || Math.random() * 1000);
    const currentPrice = closes[closes.length - 1];

    // Determine synthetic type
    const isVolatility = symbol.startsWith('VOL');
    const isCrashBoom = symbol.startsWith('CRASH') || symbol.startsWith('BOOM');
    const isJump = symbol.startsWith('JUMP');

    const [trend, momentum, volatility, regime] = await Promise.all([
      trendAnalysis(highs, lows, closes),
      momentumAnalysis(closes, highs, lows),
      volatilityAnalysis(highs, lows, closes),
      marketRegime(highs, lows, closes, volumes),
    ]);

    // Adjust analysis for synthetic indices
    if (isVolatility) {
      volatility.atr = volatility.atr * this.syntheticConfig.volatility.volatilityMultiplier;
    }

    if (isCrashBoom) {
      const spikes = this.detectSpikes(candles);
      if (spikes.recent) {
        regime.tradingAdvice = 'Recent spike detected - use caution';
      }
    }

    const analysis = {
      symbol,
      timeframe,
      currentPrice,
      timestamp: Date.now(),
      type: isVolatility ? 'VOLATILITY' : isCrashBoom ? 'CRASH_BOOM' : isJump ? 'JUMP' : 'UNKNOWN',
      trend,
      momentum,
      volatility,
      regime,
      signal: this.generateSyntheticSignal(trend, momentum, volatility, symbol),
      confidence: this.calculateSyntheticConfidence(trend, momentum, regime, symbol),
      tradeable: this.isTradeable(volatility, regime, symbol),
    };

    this.analyses.set(`${symbol}_${timeframe}`, analysis);
    return analysis;
  }

  detectSpikes(candles) {
    const recent = candles.slice(-10);
    const avgRange = recent.reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / recent.length;
    
    const spikes = recent.filter(c => 
      Math.abs(c.high - c.low) > avgRange * this.syntheticConfig.crashBoom.spikeThreshold
    );

    return {
      recent: spikes.length > 0,
      count: spikes.length,
      lastSpike: spikes[spikes.length - 1] || null,
    };
  }

  generateSyntheticSignal(trend, momentum, volatility, symbol) {
    let score = 0;

    if (trend.direction.includes('BULLISH')) score += 20;
    if (trend.direction.includes('BEARISH')) score -= 20;
    if (momentum.signal.includes('BUY')) score += 15;
    if (momentum.signal.includes('SELL')) score -= 15;

    // Synthetic-specific adjustments
    if (symbol.startsWith('VOL')) {
      if (volatility.regime === 'HIGH') score *= 0.7;
      if (volatility.regime === 'LOW') score *= 1.3;
    }

    if (score > 25) return 'BUY';
    if (score < -25) return 'SELL';
    return 'NEUTRAL';
  }

  calculateSyntheticConfidence(trend, momentum, regime, symbol) {
    let confidence = 50;
    
    if (trend.strength > 60) confidence += 15;
    if (momentum.strength > 60) confidence += 10;
    if (regime.isTradeable) confidence += 10;
    
    if (symbol.startsWith('VOL')) confidence -= 5;
    if (symbol.startsWith('CRASH') || symbol.startsWith('BOOM')) confidence -= 10;
    
    return Math.min(100, Math.max(0, confidence));
  }

  isTradeable(volatility, regime, symbol) {
    if (!regime.isTradeable) return false;
    
    if (symbol.startsWith('VOL')) {
      return volatility.atrPercentile > 20 && volatility.atrPercentile < 90;
    }
    
    if (symbol.startsWith('CRASH') || symbol.startsWith('BOOM')) {
      return volatility.regime !== 'LOW';
    }
    
    return true;
  }

  getAnalysis(symbol, timeframe) {
    return this.analyses.get(`${symbol}_${timeframe}`);
  }

  clearCache() {
    this.analyses.clear();
  }
}

export const syntheticEngine = new SyntheticEngine();
