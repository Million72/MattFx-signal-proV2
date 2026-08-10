export class ADX {
  constructor(period = 14) {
    this.period = period;
    this.values = [];
    this.plusDI = [];
    this.minusDI = [];
  }

  calculate(highs, lows, closes) {
    if (highs.length < this.period + 1) {
      return { adx: [], plusDI: [], minusDI: [] };
    }

    const tr = [];
    const plusDM = [];
    const minusDM = [];

    // Calculate True Range and Directional Movement
    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevHigh = highs[i - 1];
      const prevLow = lows[i - 1];
      const prevClose = closes[i - 1];

      // True Range
      tr.push(Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      ));

      // Directional Movement
      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }

    // Smooth with Wilder's method
    let smoothedTR = tr.slice(0, this.period).reduce((sum, val) => sum + val, 0);
    let smoothedPlusDM = plusDM.slice(0, this.period).reduce((sum, val) => sum + val, 0);
    let smoothedMinusDM = minusDM.slice(0, this.period).reduce((sum, val) => sum + val, 0);

    this.values = [];
    this.plusDI = [];
    this.minusDI = [];

    for (let i = this.period; i < tr.length; i++) {
      smoothedTR = smoothedTR - (smoothedTR / this.period) + tr[i];
      smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / this.period) + plusDM[i];
      smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / this.period) + minusDM[i];

      const plusDIValue = (smoothedPlusDM / smoothedTR) * 100;
      const minusDIValue = (smoothedMinusDM / smoothedTR) * 100;
      
      this.plusDI.push(plusDIValue);
      this.minusDI.push(minusDIValue);

      const dx = Math.abs(plusDIValue - minusDIValue) / (plusDIValue + minusDIValue) * 100;
      
      if (this.values.length === 0) {
        this.values.push(dx);
      } else {
        this.values.push(
          (this.values[this.values.length - 1] * (this.period - 1) + dx) / this.period
        );
      }
    }

    return {
      adx: this.values,
      plusDI: this.plusDI,
      minusDI: this.minusDI
    };
  }

  getValue() {
    return this.values[this.values.length - 1] || 0;
  }

  getTrend() {
    const lastPlus = this.plusDI[this.plusDI.length - 1] || 0;
    const lastMinus = this.minusDI[this.minusDI.length - 1] || 0;
    
    if (lastPlus > lastMinus) return 'BULLISH';
    if (lastMinus > lastPlus) return 'BEARISH';
    return 'NEUTRAL';
  }

  getStrength() {
    const value = this.getValue();
    if (value > 50) return 'VERY_STRONG';
    if (value > 40) return 'STRONG';
    if (value > 25) return 'MODERATE';
    if (value > 20) return 'WEAK';
    return 'ABSENT';
  }

  isTrending() {
    return this.getValue() > 20;
  }
}

export function calculateADX(highs, lows, closes, period = 14) {
  const adx = new ADX(period);
  return adx.calculate(highs, lows, closes);
}
