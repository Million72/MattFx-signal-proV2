import { ATR } from './atr';

export class Supertrend {
  constructor(period = 10, multiplier = 3) {
    this.period = period;
    this.multiplier = multiplier;
    this.values = [];
    this.trend = [];
  }

  calculate(highs, lows, closes) {
    if (highs.length < this.period) return [];

    const atr = new ATR(this.period);
    const atrValues = atr.calculate(highs, lows, closes);
    
    const hl2 = highs.map((high, i) => (high + lows[i]) / 2);
    
    this.values = [];
    this.trend = [];
    
    let upperBand = [];
    let lowerBand = [];
    let trend = 1; // 1 = bullish, -1 = bearish

    for (let i = 0; i < highs.length; i++) {
      if (i < this.period) {
        this.values.push(hl2[i]);
        this.trend.push(1);
        continue;
      }

      const atrValue = atrValues[i - this.period] || atrValues[atrValues.length - 1];
      
      const basicUpperBand = hl2[i] + (this.multiplier * atrValue);
      const basicLowerBand = hl2[i] - (this.multiplier * atrValue);
      
      // Adjust bands
      if (i === this.period) {
        upperBand.push(basicUpperBand);
        lowerBand.push(basicLowerBand);
      } else {
        upperBand.push(
          basicUpperBand < upperBand[i - 1] || closes[i - 1] > upperBand[i - 1]
            ? basicUpperBand
            : upperBand[i - 1]
        );
        
        lowerBand.push(
          basicLowerBand > lowerBand[i - 1] || closes[i - 1] < lowerBand[i - 1]
            ? basicLowerBand
            : lowerBand[i - 1]
        );
      }

      // Determine trend
      if (trend === 1) {
        if (closes[i] <= lowerBand[i]) {
          trend = -1;
          this.values.push(upperBand[i]);
        } else {
          this.values.push(
            lowerBand[i] > lowerBand[i - 1] ? lowerBand[i] : lowerBand[i - 1]
          );
        }
      } else {
        if (closes[i] >= upperBand[i]) {
          trend = 1;
          this.values.push(lowerBand[i]);
        } else {
          this.values.push(
            upperBand[i] < upperBand[i - 1] ? upperBand[i] : upperBand[i - 1]
          );
        }
      }
      
      this.trend.push(trend);
    }

    return {
      values: this.values,
      trend: this.trend
    };
  }

  getValue() {
    return this.values[this.values.length - 1] || 0;
  }

  getTrend() {
    const last = this.trend[this.trend.length - 1];
    return last === 1 ? 'BULLISH' : last === -1 ? 'BEARISH' : 'NEUTRAL';
  }

  getSignal(close) {
    if (this.values.length === 0) return null;
    
    const prevTrend = this.trend[this.trend.length - 2];
    const currentTrend = this.trend[this.trend.length - 1];
    
    if (prevTrend === -1 && currentTrend === 1) return 'BUY';
    if (prevTrend === 1 && currentTrend === -1) return 'SELL';
    return null;
  }
}

export function calculateSupertrend(highs, lows, closes, period = 10, multiplier = 3) {
  const st = new Supertrend(period, multiplier);
  return st.calculate(highs, lows, closes);
}
