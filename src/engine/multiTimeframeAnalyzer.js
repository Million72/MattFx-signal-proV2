import { EMA } from '../indicators/ema';
import { RSI } from '../indicators/rsi';
import { MACD } from '../indicators/macd';
import { ATR } from '../indicators/atr';
import { TIMEFRAME_HIERARCHY, TIMEFRAME_WEIGHTS } from '../constants/timeframes';

export class MultiTimeframeAnalyzer {
  constructor(marketData, selectedTimeframe) {
    this.marketData = marketData;
    this.selectedTF = selectedTimeframe;
    this.hierarchy = TIMEFRAME_HIERARCHY[selectedTimeframe];
    this.results = {
      ltf: {},
      current: {},
      mtf: {},
      htf: {},
      overall: {
        direction: null,
        strength: 0,
        confidence: 0,
        confluence: [],
      },
    };
  }

  async analyze() {
    const [ltfAnalysis, currentAnalysis, mtfAnalysis, htfAnalysis] = await Promise.all([
      this.analyzeTimeframeGroup(this.hierarchy.ltf, 'ltf'),
      this.analyzeTimeframeGroup([this.hierarchy.current], 'current'),
      this.analyzeTimeframeGroup(this.hierarchy.mtf, 'mtf'),
      this.analyzeTimeframeGroup(this.hierarchy.htf, 'htf'),
    ]);

    this.results.ltf = ltfAnalysis;
    this.results.current = currentAnalysis;
    this.results.mtf = mtfAnalysis;
    this.results.htf = htfAnalysis;

    this.calculateConfluence();
    return this.results;
  }

  async analyzeTimeframeGroup(timeframes, groupType) {
    const analyses = {};

    for (const tf of timeframes) {
      analyses[tf] = await this.analyzeSingleTimeframe(tf);
    }

    return {
      individual: analyses,
      aggregated: this.aggregateGroupAnalysis(analyses, groupType),
    };
  }

  async analyzeSingleTimeframe(timeframe) {
    const data = this.marketData[timeframe];
    if (!data) return null;

    const closes = data.map(c => c.close);
    const highs = data.map(c => c.high);
    const lows = data.map(c => c.low);

    const ema20 = new EMA(20).calculate(closes);
    const ema50 = new EMA(50).calculate(closes);
    const rsi = new RSI(14).calculate(closes);
    const macd = new MACD().calculate(closes);
    const atr = new ATR(14).calculate(highs, lows, closes);

    const lastClose = closes[closes.length - 1];
    const lastEMA20 = ema20[ema20.length - 1];
    const lastEMA50 = ema50[ema50.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const lastATR = atr[atr.length - 1];

    let signal = 'NEUTRAL';
    let strength = 0;

    if (lastClose > lastEMA20 && lastEMA20 > lastEMA50 && lastRSI > 50) {
      signal = 'BUY';
      strength = 70 + (lastRSI - 50) * 0.5;
    } else if (lastClose < lastEMA20 && lastEMA20 < lastEMA50 && lastRSI < 50) {
      signal = 'SELL';
      strength = 70 + (50 - lastRSI) * 0.5;
    } else if (lastClose > lastEMA20) {
      signal = 'BUY';
      strength = 50;
    } else if (lastClose < lastEMA20) {
      signal = 'SELL';
      strength = 50;
    }

    return {
      signal,
      strength: Math.min(100, strength),
      trend: lastClose > lastEMA20 ? 'BULLISH' : 'BEARISH',
      rsi: lastRSI,
      atr: lastATR,
    };
  }

  aggregateGroupAnalysis(analyses, groupType) {
    const signals = Object.values(analyses).filter(a => a);
    if (!signals.length) return { signal: 'NEUTRAL', strength: 0 };

    const buyCount = signals.filter(s => s.signal === 'BUY').length;
    const sellCount = signals.filter(s => s.signal === 'SELL').length;
    const total = signals.length;

    const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / total;

    let signal = 'NEUTRAL';
    if (buyCount > sellCount && buyCount / total >= 0.6) signal = 'BUY';
    else if (sellCount > buyCount && sellCount / total >= 0.6) signal = 'SELL';

    return {
      signal,
      strength: avgStrength,
      consensus: Math.max(buyCount, sellCount) / total,
    };
  }

  calculateConfluence() {
    const allSignals = [];
    const weights = { BUY: 0, SELL: 0, NEUTRAL: 0 };

    for (const [groupName, group] of Object.entries(this.results)) {
      if (groupName === 'overall' || !group.individual) continue;
      
      const groupWeight = TIMEFRAME_WEIGHTS[groupName];

      for (const [tf, analysis] of Object.entries(group.individual)) {
        if (!analysis) continue;
        
        const weight = groupWeight / Object.keys(group.individual).length;
        
        allSignals.push({
          timeframe: tf,
          group: groupName,
          signal: analysis.signal,
          strength: analysis.strength,
          weight,
        });

        weights[analysis.signal] += weight;
      }
    }

    const totalWeight = weights.BUY + weights.SELL + weights.NEUTRAL;
    const buyPercent = (weights.BUY / totalWeight) * 100;
    const sellPercent = (weights.SELL / totalWeight) * 100;

    let direction = 'NEUTRAL';
    let confidence = 0;

    if (buyPercent > 60) {
      direction = 'BUY';
      confidence = buyPercent;
    } else if (sellPercent > 60) {
      direction = 'SELL';
      confidence = sellPercent;
    } else if (buyPercent > sellPercent && buyPercent > 50) {
      direction = 'BUY';
      confidence = buyPercent * 0.8;
    } else if (sellPercent > buyPercent && sellPercent > 50) {
      direction = 'SELL';
      confidence = sellPercent * 0.8;
    }

    const confluence = allSignals.filter(
      s => s.signal === direction && s.strength > 60
    );

    this.results.overall = {
      direction,
      strength: Math.max(buyPercent, sellPercent),
      confidence,
      confluence,
      isHighQuality: confidence >= 70 && confluence.length >= 3,
    };
  }
}
