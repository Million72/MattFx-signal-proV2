export function momentumFilter(momentumAnalysis) {
  if (!momentumAnalysis) return false;

  const { rsi14, rsi7, macd } = momentumAnalysis;

  // Avoid overbought/oversold without momentum shift
  if (rsi14 > 80 || rsi14 < 20) return false;

  // RSI divergence (RSI vs price)
  if (rsi14 > 60 && rsi7 < rsi14) return false; // Weakening momentum
  if (rsi14 < 40 && rsi7 > rsi14) return false; // Weakening momentum

  // MACD histogram declining
  if (macd && Math.abs(macd.histogram) < 0.00001) return false;

  return true;
}
