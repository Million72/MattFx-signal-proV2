import { trendAnalysis } from './analysis/trendAnalysis';
import { momentumAnalysis } from './analysis/momentumAnalysis';
import { volatilityAnalysis } from './analysis/volatilityAnalysis';
import { marketRegime } from './analysis/marketRegime';
import { marketStructureAnalysis } from './priceAction/marketStructure';
import { detectBOS } from './priceAction/bos';
import { detectCHoCH } from './priceAction/choch';
import { identifySRLevels } from './priceAction/supportResistance';
import { identifySupplyDemand } from './priceAction/supplyDemand';
import { detectLiquiditySweep } from './priceAction/liquiditySweep';
import { detectBreakout } from './priceAction/breakout';
import { detectRetest } from './priceAction/retest';
import { detectCandlestickPatterns } from './priceAction/candlestickPatterns';
import { detectChartPatterns } from './priceAction/chartPatterns';
import { trendFilter } from './filters/trendFilter';
import { momentumFilter } from './filters/momentumFilter';
import { volatilityFilter } from './filters/volatilityFilter';
import { sessionFilter } from './filters/sessionFilter';

export class ForexEngine {
  constructor() {
    this.analyses = new Map();
  }

  async analyze(candles, timeframe, symbol) {
    if (!candles || candles.length < 50) {
      return null;
    }

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const opens = candles.map(c => c.open);
    const volumes = candles.map(c => c.volume || 0);
    const currentPrice = closes[closes.length - 1];

    // Run all analyses in parallel
    const [
      trend,
      momentum,
      volatility,
      regime,
      structure,
      bos,
      choch,
      srLevels,
      supplyDemand,
      liquidity,
      breakout,
      retest,
      candlePatterns,
      chartPatterns
    ] = await Promise.all([
      trendAnalysis(highs, lows, closes),
      momentumAnalysis(closes, highs, lows),
      volatilityAnalysis(highs, lows, closes),
      marketRegime(highs, lows, closes, volumes),
      marketStructureAnalysis(highs, lows, closes),
      detectBOS(highs, lows, closes),
      detectCHoCH(highs, lows, closes),
      identifySRLevels(highs, lows, closes),
      identifySupplyDemand(highs, lows, closes, volumes),
      detectLiquiditySweep(highs, lows, closes),
      detectBreakout(highs, lows, closes, volumes),
      detectRetest(highs, lows, closes, srLevels),
      detectCandlestickPatterns(opens, highs, lows, closes),
      detectChartPatterns(highs, lows, closes)
    ]);

    // Apply filters
    const passesFilters = this.applyFilters({
      trend,
      momentum,
      volatility,
      regime,
      timeframe,
      symbol
    });

    const analysis = {
      symbol,
      timeframe,
      currentPrice,
      timestamp: Date.now(),
      
      trend,
      momentum,
      volatility,
      regime,
      
      priceAction: {
        structure,
        bos,
        choch,
        srLevels,
        supplyDemand,
        liquidity,
        breakout,
        retest,
        candlePatterns,
        chartPatterns
      },
      
      filters: passesFilters,
      
      // Generate signal based on all analyses
      signal: this.generateSignal({
        trend,
        momentum,
        volatility,
        regime,
        structure,
        bos,
        choch,
        breakout,
        retest,
        candlePatterns,
        currentPrice
      }),
      
      // Calculate confidence
      confidence: this.calculateConfidence({
        trend,
        momentum,
        volatility,
        structure,
        passesFilters
      })
    };

    this.analyses.set(`${symbol}_${timeframe}`, analysis);
    return analysis;
  }

  applyFilters(data) {
    const results = {
      trend: trendFilter(data.trend),
      momentum: momentumFilter(data.momentum),
      volatility: volatilityFilter(data.volatility),
      session: sessionFilter(data.symbol, data.timeframe),
    };

    results.passed = Object.values(results).every(r => r !== false);
    return results;
  }

  generateSignal(data) {
    let score = 0;
    let signal = 'NEUTRAL';
    
    const { trend, momentum, structure, bos, choch, breakout, retest, candlePatterns } = data;

    // Trend analysis scoring
    if (trend.direction === 'STRONG_BULLISH') score += 30;
    else if (trend.direction === 'BULLISH') score += 20;
    else if (trend.direction === 'STRONG_BEARISH') score -= 30;
    else if (trend.direction === 'BEARISH') score -= 20;

    // Momentum scoring
    if (momentum.signal === 'STRONG_BUY') score += 25;
    else if (momentum.signal === 'BUY') score += 15;
    else if (momentum.signal === 'STRONG_SELL') score -= 25;
    else if (momentum.signal === 'SELL') score -= 15;

    // Structure scoring
    if (structure.trend === 'BULLISH') score += 15;
    else if (structure.trend === 'BEARISH') score -= 15;

    // BOS/CHoCH scoring
    if (bos?.direction === 'BULLISH') score += 10;
    if (bos?.direction === 'BEARISH') score -= 10;
    if (choch?.direction === 'BULLISH') score += 15;
    if (choch?.direction === 'BEARISH') score -= 15;

    // Breakout scoring
    if (breakout?.direction === 'BULLISH') score += 10;
    if (breakout?.direction === 'BEARISH') score -= 10;

    // Retest scoring
    if (retest?.active) {
      if (retest.direction === 'BULLISH') score += 10;
      if (retest.direction === 'BEARISH') score -= 10;
    }

    // Candlestick patterns
    if (candlePatterns?.bullish) score += 5;
    if (candlePatterns?.bearish) score -= 5;

    if (score >= 50) signal = 'STRONG_BUY';
    else if (score >= 25) signal = 'BUY';
    else if (score <= -50) signal = 'STRONG_SELL';
    else if (score <= -25) signal = 'SELL';

    return signal;
  }

  calculateConfidence(data) {
    let confidence = 50;
    
    // Trend alignment increases confidence
    if (data.trend.strength > 70) confidence += 15;
    else if (data.trend.strength > 40) confidence += 10;

    // Momentum confirmation
    if (data.momentum.strength > 70) confidence += 10;
    
    // Structure adds confidence
    if (data.structure.quality === 'HIGH') confidence += 10;
    
    // Filters passing adds confidence
    if (data.passesFilters.passed) confidence += 15;
    
    // Cap at 100
    return Math.min(100, confidence);
  }

  getAnalysis(symbol, timeframe) {
    return this.analyses.get(`${symbol}_${timeframe}`);
  }

  clearCache() {
    this.analyses.clear();
  }
}

export const forexEngine = new ForexEngine();
