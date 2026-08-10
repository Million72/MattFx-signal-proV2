import { EMA } from './ema';

export class MACD {
  constructor(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.signalPeriod = signalPeriod;
    this.macdLine = [];
    this.signalLine = [];
    this.histogram = [];
  }

  calculate(data) {
    const closes = Array.isArray(data[0]) ? data.map(d => d.close || d[4]) : data;
    
    const fastEMA = new EMA(this.fastPeriod).calculate(closes);
    const slowEMA = new EMA(this.slowPeriod).calculate(closes);

    // MACD Line = Fast EMA - Slow EMA
    this.macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);

    // Signal Line = EMA of MACD Line
    const signalEMA = new EMA(this.signalPeriod);
    this.signalLine = signalEMA.calculate(this.macdLine);

    // Histogram = MACD Line - Signal Line
    this.histogram = this.macdLine.map((macd, i) => macd - (this.signalLine[i] || 0));

    return {
      macdLine: this.macdLine,
      signalLine: this.signalLine,
      histogram: this.histogram
    };
  }

  getValues() {
    const last = this.macdLine.length - 1;
    return {
      macd: this.macdLine[last] || 0,
      signal: this.signalLine[last] || 0,
      histogram: this.histogram[last] || 0
    };
  }

  getCrossover() {
    if (this.histogram.length < 2) return null;
    
    const current = this.histogram[this.histogram.length - 1];
    const previous = this.histogram[this.histogram.length - 2];
    
    if (current > 0 && previous <= 0) return 'BULLISH';
    if (current < 0 && previous >= 0) return 'BEARISH';
    return null;
  }

  getDivergence(prices) {
    if (this.macdLine.length < 20) return null;
    
    const recentMACD = this.macdLine.slice(-20);
    const recentPrices = prices.slice(-20);
    
    // Check for divergence patterns
    const macdLow1 = Math.min(...recentMACD.slice(0, 10));
    const macdLow2 = Math.min(...recentMACD.slice(10));
    const priceLow1 = Math.min(...recentPrices.slice(0, 10));
    const priceLow2 = Math.min(...recentPrices.slice(10));
    
    if (priceLow2 < priceLow1 && macdLow2 > macdLow1) {
      return 'BULLISH_DIVERGENCE';
    }
    
    const macdHigh1 = Math.max(...recentMACD.slice(0, 10));
    const macdHigh2 = Math.max(...recentMACD.slice(10));
    const priceHigh1 = Math.max(...recentPrices.slice(0, 10));
    const priceHigh2 = Math.max(...recentPrices.slice(10));
    
    if (priceHigh2 > priceHigh1 && macdHigh2 < macdHigh1) {
      return 'BEARISH_DIVERGENCE';
    }
    
    return null;
  }
}

export function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
  const macd = new MACD(fast, slow, signal);
  return macd.calculate(data);
}
