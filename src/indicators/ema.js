export class EMA {
  constructor(period) {
    this.period = period;
    this.multiplier = 2 / (period + 1);
    this.values = [];
  }

  calculate(data) {
    if (!data || data.length === 0) return [];
    
    const closes = Array.isArray(data[0]) ? data.map(d => d.close || d[4]) : data;
    this.values = [closes[0]];
    
    for (let i = 1; i < closes.length; i++) {
      this.values.push(
        (closes[i] - this.values[i - 1]) * this.multiplier + this.values[i - 1]
      );
    }
    
    return this.values;
  }

  getValue() {
    return this.values[this.values.length - 1] || 0;
  }

  getTrend() {
    if (this.values.length < 2) return 'NEUTRAL';
    const current = this.values[this.values.length - 1];
    const previous = this.values[this.values.length - 2];
    return current > previous ? 'BULLISH' : current < previous ? 'BEARISH' : 'NEUTRAL';
  }

  getSlope() {
    if (this.values.length < 5) return 0;
    const recent = this.values.slice(-5);
    return (recent[4] - recent[0]) / recent[0] * 100;
  }
}

export function calculateEMA(data, period) {
  const ema = new EMA(period);
  return ema.calculate(data);
}
