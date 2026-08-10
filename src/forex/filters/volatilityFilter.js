export function volatilityFilter(volatilityAnalysis) {
  if (!volatilityAnalysis) return false;

  const { state, atrPercentile, isTradeable } = volatilityAnalysis;

  // Reject if not tradeable
  if (!isTradeable) return false;

  // Reject during squeeze
  if (state === 'SQUEEZE') return false;

  // Reject extreme volatility
  if (atrPercentile > 95) return false;

  // Reject very low volatility
  if (atrPercentile < 10) return false;

  return true;
}
