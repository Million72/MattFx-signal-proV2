export class RiskRewardCalculator {
  calculate(entry, stopLoss, takeProfit, accountBalance = 10000, riskPercent = 2) {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    const ratio = reward / risk;

    const riskAmount = accountBalance * (riskPercent / 100);
    const positionSize = riskAmount / risk;
    const potentialProfit = positionSize * reward;
    const potentialLoss = positionSize * risk;

    return {
      entry,
      stopLoss,
      takeProfit,
      risk,
      reward,
      ratio,
      riskPercent,
      riskAmount,
      positionSize,
      potentialProfit,
      potentialLoss,
      isViable: ratio >= 1.5,
      recommendation: this.getRecommendation(ratio),
    };
  }

  calculateOptimalSL(entry, atr, direction, multiplier = 1.5) {
    const slDistance = atr * multiplier;
    return direction === 'BUY' ? entry - slDistance : entry + slDistance;
  }

  calculateOptimalTP(entry, atr, direction, riskRewardTarget = 2.5) {
    const tpDistance = atr * riskRewardTarget;
    return direction === 'BUY' ? entry + tpDistance : entry - tpDistance;
  }

  calculatePartialTPs(entry, stopLoss, takeProfit, levels = 3) {
    const risk = Math.abs(entry - stopLoss);
    const tps = [];

    for (let i = 1; i <= levels; i++) {
      const rr = (i + 1) * 0.75; // Progressive R:R targets
      const tpPrice = entry > stopLoss ? 
        entry + (risk * rr) : 
        entry - (risk * rr);
      
      tps.push({
        level: i,
        price: tpPrice,
        rr: rr,
        percentage: i === levels ? 100 / levels : Math.floor(100 / levels),
      });
    }

    return tps;
  }

  getRecommendation(ratio) {
    if (ratio >= 3) return 'EXCELLENT - Very favorable risk/reward';
    if (ratio >= 2) return 'GOOD - Favorable risk/reward';
    if (ratio >= 1.5) return 'ACCEPTABLE - Minimum viable R:R';
    return 'POOR - Do not take this trade';
  }

  calculatePositionSize(accountBalance, riskPercent, stopLossPips, pipValue = 10) {
    const riskAmount = accountBalance * (riskPercent / 100);
    return riskAmount / (stopLossPips * pipValue);
  }

  calculateKelly(favorableOutcomes, totalOutcomes, winLossRatio) {
    const winProbability = favorableOutcomes / totalOutcomes;
    const lossProbability = 1 - winProbability;
    return (winProbability - (lossProbability / winLossRatio));
  }
}
