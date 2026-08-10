export async function detectBreakout(highs, lows, closes, volumes) {
  const currentPrice = closes[closes.length - 1];
  const currentVolume = volumes ? volumes[volumes.length - 1] : 0;
  
  // Find consolidation zones
  const consolidation = findConsolidation(highs, lows, closes, 20);
  
  if (!consolidation) {
    return {
      detected: false,
      direction: null,
      active: false,
    };
  }

  const { upperBound, lowerBound, averageVolume } = consolidation;
  const rangeSize = upperBound - lowerBound;
  
  // Check for breakout
  const breakoutUp = currentPrice > upperBound;
  const breakoutDown = currentPrice < lowerBound;
  
  if (!breakoutUp && !breakoutDown) {
    return {
      detected: false,
      direction: null,
      active: false,
      consolidation: {
        upperBound,
        lowerBound,
        rangeSize,
        inRange: true,
      },
    };
  }

  // Volume confirmation
  const volumeSpike = currentVolume > averageVolume * 1.5;
  
  // Check for false breakout
  const previousCandle = closes[closes.length - 2];
  const isFalseBreakout = (breakoutUp && previousCandle < upperBound && currentPrice < previousCandle) ||
                          (breakoutDown && previousCandle > lowerBound && currentPrice > previousCandle);

  const direction = breakoutUp ? 'BULLISH' : 'BEARISH';
  const confirmed = volumeSpike && !isFalseBreakout;

  // Calculate breakout strength
  const breakoutSize = breakoutUp ? 
    ((currentPrice - upperBound) / rangeSize) * 100 :
    ((lowerBound - currentPrice) / rangeSize) * 100;

  return {
    detected: true,
    direction,
    active: true,
    confirmed,
    volumeSpike,
    isFalseBreakout,
    breakoutSize,
    consolidation: {
      upperBound,
      lowerBound,
      rangeSize,
      inRange: false,
    },
    targetProjection: breakoutUp ?
      currentPrice + rangeSize :
      currentPrice - rangeSize,
  };
}

function findConsolidation(highs, lows, closes, period) {
  if (highs.length < period) return null;
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  
  const maxHigh = Math.max(...recentHighs);
  const minLow = Math.min(...recentLows);
  const range = maxHigh - minLow;
  const avgPrice = (maxHigh + minLow) / 2;
  
  // Check if market is consolidating (range less than 1% of price)
  if (range / avgPrice > 0.01) return null;
  
  // Check if highs and lows are staying within bounds
  const highBreaks = recentHighs.filter(h => h > maxHigh * 1.002).length;
  const lowBreaks = recentLows.filter(l => l < minLow * 0.998).length;
  
  if (highBreaks > 2 || lowBreaks > 2) return null;
  
  const averageVolume = 0; // Would need volume data
  
  return {
    upperBound: maxHigh,
    lowerBound: minLow,
    averageVolume,
  };
}
