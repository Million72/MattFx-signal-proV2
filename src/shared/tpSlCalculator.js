export class TPSLCalculator {
  constructor(atr, currentPrice) {
    this.atr = atr;
    this.currentPrice = currentPrice;
  }

  calculateForBuy() {
    const sl = this.currentPrice - (this.atr * 1.5);
    const tp1 = this.currentPrice + (this.atr * 1.5);
    const tp2 = this.currentPrice + (this.atr * 2.5);
    const tp3 = this.currentPrice + (this.atr * 3.5);

    return {
      entry: this.currentPrice,
      stopLoss: this.roundToTicks(sl),
      takeProfits: [
        { level: 1, price: this.roundToTicks(tp1), rr: 1.0, closePercent: 50 },
        { level: 2, price: this.roundToTicks(tp2), rr: 1.67, closePercent: 30 },
        { level: 3, price: this.roundToTicks(tp3), rr: 2.33, closePercent: 20 },
      ],
      riskReward: 2.33,
      riskPips: this.calculatePips(this.currentPrice, sl),
    };
  }

  calculateForSell() {
    const sl = this.currentPrice + (this.atr * 1.5);
    const tp1 = this.currentPrice - (this.atr * 1.5);
    const tp2 = this.currentPrice - (this.atr * 2.5);
    const tp3 = this.currentPrice - (this.atr * 3.5);

    return {
      entry: this.currentPrice,
      stopLoss: this.roundToTicks(sl),
      takeProfits: [
        { level: 1, price: this.roundToTicks(tp1), rr: 1.0, closePercent: 50 },
        { level: 2, price: this.roundToTicks(tp2), rr: 1.67, closePercent: 30 },
        { level: 3, price: this.roundToTicks(tp3), rr: 2.33, closePercent: 20 },
      ],
      riskReward: 2.33,
      riskPips: this.calculatePips(sl, this.currentPrice),
    };
  }

  calculateDynamicSL(direction, support, resistance) {
    if (direction === 'BUY') {
      return support ? support - (this.atr * 0.5) : this.currentPrice - (this.atr * 1.5);
    } else {
      return resistance ? resistance + (this.atr * 0.5) : this.currentPrice + (this.atr * 1.5);
    }
  }

  calculateTrailingSL(direction, currentPrice, highestHigh, lowestLow) {
    if (direction === 'BUY') {
      return Math.max(
        this.currentPrice - (this.atr * 3),
        highestHigh - (this.atr * 2)
      );
    } else {
      return Math.min(
        this.currentPrice + (this.atr * 3),
        lowestLow + (this.atr * 2)
      );
    }
  }

  roundToTicks(price, tickSize = 0.00001) {
    return Math.round(price / tickSize) * tickSize;
  }

  calculatePips(price1, price2) {
    return Math.abs(price1 - price2) / 0.0001;
  }
  }
