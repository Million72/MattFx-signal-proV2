export class ConfidenceScore {
  calculate(analyses) {
    const scores = {
      trendScore: this.calculateTrendScore(analyses.trend),
      momentumScore: this.calculateMomentumScore(analyses.momentum),
      volatilityScore: this.calculateVolatilityScore(analyses.volatility),
      structureScore: this.calculateStructureScore(analyses.structure),
      volumeScore: this.calculateVolumeScore(analyses.volume),
      regimeScore: this.calculateRegimeScore(analyses.regime),
      confluenceBonus: this.calculateConfluenceBonus(analyses),
    };

    const weights = {
      trendScore: 0.25,
      momentumScore: 0.20,
      volatilityScore: 0.10,
      structureScore: 0.20,
      volumeScore: 0.10,
      regimeScore: 0.10,
      confluenceBonus: 0.05,
    };

    const totalScore = Object.entries(scores).reduce(
      (sum, [key, value]) => sum + value * weights[key],
      0
    );

    const grade = this.getGrade(totalScore);

    return {
      score: Math.round(totalScore),
      grade,
      components: scores,
      isReliable: totalScore >= 70,
      interpretation: this.interpretScore(totalScore),
    };
  }

  calculateTrendScore(trend) {
    if (!trend) return 0;
    let score = 50;
    if (trend.strength > 70) score += 30;
    else if (trend.strength > 50) score += 20;
    if (trend.quality === 'HIGH') score += 20;
    return Math.min(100, score);
  }

  calculateMomentumScore(momentum) {
    if (!momentum) return 0;
    let score = 50;
    if (momentum.strength > 70) score += 30;
    else if (momentum.strength > 50) score += 20;
    if (momentum.crossover) score += 20;
    return Math.min(100, score);
  }

  calculateVolatilityScore(volatility) {
    if (!volatility) return 0;
    let score = 50;
    if (volatility.isTradeable) score += 30;
    if (volatility.regime === 'NORMAL') score += 20;
    return score;
  }

  calculateStructureScore(structure) {
    if (!structure) return 0;
    let score = 0;
    if (structure.quality === 'HIGH') score += 60;
    else if (structure.quality === 'MEDIUM') score += 30;
    if (structure.pattern && structure.pattern !== 'NONE') score += 40;
    return score;
  }

  calculateVolumeScore(volume) {
    if (!volume) return 0;
    let score = 50;
    if (volume.confirmsDirection) score += 40;
    if (volume.volumeSpike) score += 10;
    return score;
  }

  calculateRegimeScore(regime) {
    if (!regime) return 0;
    let score = 0;
    if (regime.isTradeable) score += 50;
    if (regime.volumeConfirming) score += 30;
    if (regime.regime === 'TRENDING' || regime.regime === 'STRONG_TRENDING') score += 20;
    return score;
  }

  calculateConfluenceBonus(analyses) {
    let bonus = 0;
    const signals = [];

    if (analyses.trend?.direction?.includes('BULLISH')) signals.push('BULLISH');
    if (analyses.trend?.direction?.includes('BEARISH')) signals.push('BEARISH');
    if (analyses.momentum?.signal?.includes('BUY')) signals.push('BULLISH');
    if (analyses.momentum?.signal?.includes('SELL')) signals.push('BEARISH');
    if (analyses.structure?.trend === 'BULLISH') signals.push('BULLISH');
    if (analyses.structure?.trend === 'BEARISH') signals.push('BEARISH');

    const bullishCount = signals.filter(s => s === 'BULLISH').length;
    const bearishCount = signals.filter(s => s === 'BEARISH').length;
    const maxConfluence = Math.max(bullishCount, bearishCount);

    if (maxConfluence >= 4) bonus = 100;
    else if (maxConfluence >= 3) bonus = 75;
    else if (maxConfluence >= 2) bonus = 50;
    else bonus = 25;

    return bonus;
  }

  getGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  interpretScore(score) {
    if (score >= 90) return 'Exceptional signal quality - very high probability';
    if (score >= 80) return 'Excellent signal quality - high probability';
    if (score >= 70) return 'Good signal quality - reliable setup';
    if (score >= 60) return 'Moderate signal quality - use caution';
    if (score >= 50) return 'Low signal quality - consider passing';
    return 'Poor signal quality - avoid trading';
  }
}
