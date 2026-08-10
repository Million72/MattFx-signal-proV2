import { RSI } from '../../indicators/rsi';
import { MACD } from '../../indicators/macd';

export async function momentumAnalysis(closes, highs, lows) {
  const rsi14 = new RSI(14);
  const rsiValues = rsi14.calculate(closes);
  
  const rsi7 = new RSI(7);
  const rsi7Values = rsi7.calculate(closes);
  
  const macd = new MACD(12, 26, 9);
  const macdResult = macd.calculate(closes);
  
  const rsi14Value = rsi14.getValue();
  const rsi7Value = rsi7.getValue();
  const macdValues = macd.getValues();
  const crossover = macd.getCrossover();
  const divergence = macd.getDivergence(closes);

  let signal = 'NEUTRAL';
  let strength = 0;

  // RSI analysis
  const rsiBullish = rsi14Value > 50 && rsi14Value < 70 && rsi7Value > rsi14Value;
  const rsiBearish = rsi14Value < 50 && rsi14Value > 30 && rsi7Value < rsi14Value;
  const rsiOversold = rsi14Value < 30;
  const rsiOverbought = rsi14Value > 70;

  // MACD analysis
  const macdBullish = macdValues.histogram > 0 && macdValues.macd > macdValues.signal;
  const macdBearish = macdValues.histogram < 0 && macdValues.macd < macdValues.signal;

  // Combine signals
  if (rsiBullish && macdBullish && crossover === 'BULLISH') {
    signal = 'STRONG_BUY';
    strength = 90;
  } else if (rsiOversold && crossover === 'BULLISH') {
    signal = 'BUY';
    strength = 75;
  } else if (rsiBullish || macdBullish) {
    signal = 'WEAK_BUY';
    strength = 55;
  } else if (rsiBearish && macdBearish && crossover === 'BEARISH') {
    signal = 'STRONG_SELL';
    strength = 90;
  } else if (rsiOverbought && crossover === 'BEARISH') {
    signal = 'SELL';
    strength = 75;
  } else if (rsiBearish || macdBearish) {
    signal = 'WEAK_SELL';
    strength = 55;
  }

  // RSI divergence adds conviction
  if (divergence) {
    if (divergence === 'BULLISH_DIVERGENCE' && signal.includes('BUY')) {
      strength = Math.min(100, strength + 15);
    } else if (divergence === 'BEARISH_DIVERGENCE' && signal.includes('SELL')) {
      strength = Math.min(100, strength + 15);
    }
  }

  return {
    signal,
    strength,
    rsi14: rsi14Value,
    rsi7: rsi7Value,
    rsiSignal: rsi14.getSignal(),
    macd: macdValues,
    crossover,
    divergence,
    oversold: rsiOversold,
    overbought: rsiOverbought,
  };
}
