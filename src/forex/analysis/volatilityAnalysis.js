import { ATR } from '../../indicators/atr';
import { calculateBollingerBands } from '../../utils/math';

export async function volatilityAnalysis(highs, lows, closes) {
  const atr = new ATR(14);
  const atrValues = atr.calculate(highs, lows, closes);
  const atrValue = atr.getValue();
  const atrPercentile = atr.getPercentile();
  const volatilityRegime = atr.getVolatilityRegime();
  
  const currentPrice = closes[closes.length - 1];
  const normalizedATR = (atrValue / currentPrice) * 100;

  // Bollinger Bands
  const bb = calculateBollingerBands(closes, 20, 2);
  
  // Calculate BB width
  const bbWidth = ((bb.upper[bb.upper.length - 1] - bb.lower[bb.lower.length - 1]) / bb.middle[bb.middle.length - 1]) * 100;
  
  // Check for squeeze
  const recentBBWidth = [];
  for (let i = Math.max(0, bb.upper.length - 20); i < bb.upper.length; i++) {
    recentBBWidth.push(
      ((bb.upper[i] - bb.lower[i]) / bb.middle[i]) * 100
    );
  }
  
  const minBBWidth = Math.min(...recentBBWidth);
  const isSqueezing = bbWidth < minBBWidth * 1.1;

  // Determine volatility state
  let state = 'NORMAL';
  let riskLevel = 'MEDIUM';

  if (isSqueezing) {
    state = 'SQUEEZE';
    riskLevel = 'HIGH';
  } else if (volatilityRegime === 'HIGH') {
    state = 'EXPANDING';
    riskLevel = 'HIGH';
  } else if (volatilityRegime === 'LOW') {
    state = 'CONTRACTING';
    riskLevel = 'LOW';
  } else if (atrPercentile > 70) {
    state = 'ELEVATED';
    riskLevel = 'MEDIUM_HIGH';
  }

  return {
    state,
    riskLevel,
    atr: atrValue,
    normalizedATR,
    atrPercentile,
    regime: volatilityRegime,
    bollingerBands: {
      upper: bb.upper[bb.upper.length - 1],
      middle: bb.middle[bb.middle.length - 1],
      lower: bb.lower[bb.lower.length - 1],
      width: bbWidth,
      percentB: bb.percentB,
      squeezing: isSqueezing,
    },
    isTradeable: !isSqueezing && volatilityRegime !== 'LOW',
  };
}
