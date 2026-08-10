export function trendFilter(trendAnalysis) {
  if (!trendAnalysis) return false;

  const { direction, strength } = trendAnalysis;

  // Reject if no clear trend
  if (direction === 'NEUTRAL') return false;
  
  // Reject weak trends
  if (strength < 40) return false;
  
  // Reject if trend is weakening
  if (trendAnalysis.slope && Math.abs(trendAnalysis.slope) < 0.05) return false;

  return true;
}
