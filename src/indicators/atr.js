export class ATR {
  constructor(period = 14) {
    this.period = period;
    this.values = [];
    this.trueRanges = [];
  }

  calculate(highs, lows, closes) {
    if (highs.length < 2) return [];

    this.trueRanges = [];
    
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      this.trueRanges.push(tr);
    }

    this.values = [];
    
    // Initial ATR
    if (this.trueRanges.length >= this.period) {
      const initialATR = this.trueRanges.slice(0, this.period).reduce((sum, tr) => sum + tr, 0) / this.period;
      this.values.push(initialATR);
      
      // Subsequent ATRs
      for (let i = this.period; i < this.trueRanges.length; i++) {
        const atr = (this.values[this.values.length - 1] * (this.period - 1) + this.trueRanges[i]) / this.period;
        this.values.push(atr);
      }
    }

    return this.values;
  }

  getValue() {
    return this.values[this.values.length - 1] || 0;
  }

  getNormalized(price) {
    const atr = this.getValue();
    return price ? (atr / price) * 100 : atr;
  }

  getPercentile(lookback = 100) {
    if (this.values.length === 0) return 50;
    
    const current = this.getValue();
    const slice = this.values.slice(-lookback);
    const count = slice.filter(v => v <= current).length;
    
    return (count / slice.length) * 100;
  }

  getVolatilityRegime() {
    const percentile = this.getPercentile();
    if (percentile > 80) return 'HIGH';
    if (percentile > 60) return 'ABOVE_NORMAL';
    if (percentile > 40) return 'NORMAL';
    if (percentile > 20) return 'BELOW_NORMAL';
    return 'LOW';
  }
}

export function calculateATR(highs, lows, closes, period = 14) {
  const atr = new ATR(period);
  return atr.calculate(highs, lows, closes);
}
