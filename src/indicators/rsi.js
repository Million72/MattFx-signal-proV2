export class RSI {
  constructor(period = 14) {
    this.period = period;
    this.values = [];
  }

  calculate(data) {
    const closes = Array.isArray(data[0]) ? data.map(d => d.close || d[4]) : data;
    
    if (closes.length < this.period + 1) {
      this.values = new Array(closes.length).fill(50);
      return this.values;
    }

    this.values = [];
    let gains = 0;
    let losses = 0;

    // Initial calculation
    for (let i = 1; i <= this.period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
      this.values.push(50);
    }

    let avgGain = gains / this.period;
    let avgLoss = losses / this.period;
    
    this.values.push(100 - (100 / (1 + avgGain / (avgLoss || 0.001))));

    // Subsequent calculations
    for (let i = this.period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      
      if (diff >= 0) {
        avgGain = (avgGain * (this.period - 1) + diff) / this.period;
        avgLoss = (avgLoss * (this.period - 1)) / this.period;
      } else {
        avgGain = (avgGain * (this.period - 1)) / this.period;
        avgLoss = (avgLoss * (this.period - 1) - diff) / this.period;
      }
      
      this.values.push(100 - (100 / (1 + avgGain / (avgLoss || 0.001))));
    }

    return this.values;
  }

  getValue() {
    return this.values[this.values.length - 1] || 50;
  }

  getSignal() {
    const value = this.getValue();
    if (value > 70) return 'OVERBOUGHT';
    if (value < 30) return 'OVERSOLD';
    return 'NEUTRAL';
  }

  isOverbought() {
    return this.getValue() > 70;
  }

  isOversold() {
    return this.getValue() < 30;
  }

  detectDivergence(prices) {
    if (this.values.length < 10) return null;
    
    const recentRSI = this.values.slice(-10);
    const recentPrices = prices.slice(-10);
    
    // Bullish divergence: price makes lower low, RSI makes higher low
    const priceLow1 = Math.min(...recentPrices.slice(0, 5));
    const priceLow2 = Math.min(...recentPrices.slice(5));
    const rsiLow1 = Math.min(...recentRSI.slice(0, 5));
    const rsiLow2 = Math.min(...recentRSI.slice(5));
    
    if (priceLow2 < priceLow1 && rsiLow2 > rsiLow1) {
      return 'BULLISH';
    }
    
    // Bearish divergence: price makes higher high, RSI makes lower high
    const priceHigh1 = Math.max(...recentPrices.slice(0, 5));
    const priceHigh2 = Math.max(...recentPrices.slice(5));
    const rsiHigh1 = Math.max(...recentRSI.slice(0, 5));
    const rsiHigh2 = Math.max(...recentRSI.slice(5));
    
    if (priceHigh2 > priceHigh1 && rsiHigh2 < rsiHigh1) {
      return 'BEARISH';
    }
    
    return null;
  }
}

export function calculateRSI(data, period = 14) {
  const rsi = new RSI(period);
  return rsi.calculate(data);
}
