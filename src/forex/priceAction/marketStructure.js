export async function marketStructureAnalysis(highs, lows, closes) {
  const swingHighs = findSwingPoints(highs, 'high');
  const swingLows = findSwingPoints(lows, 'low');
  
  const structure = {
    highs: swingHighs.slice(-5),
    lows: swingLows.slice(-5),
    trend: 'NEUTRAL',
    pattern: 'NONE',
    quality: 'LOW',
  };

  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-2);
    const recentLows = swingLows.slice(-2);
    
    // Determine market structure
    const higherHigh = recentHighs[1].price > recentHighs[0].price;
    const higherLow = recentLows[1].price > recentLows[0].price;
    const lowerHigh = recentHighs[1].price < recentHighs[0].price;
    const lowerLow = recentLows[1].price < recentLows[0].price;

    if (higherHigh && higherLow) {
      structure.trend = 'BULLISH';
      structure.pattern = 'HH_HL';
      structure.quality = 'HIGH';
    } else if (lowerHigh && lowerLow) {
      structure.trend = 'BEARISH';
      structure.pattern = 'LH_LL';
      structure.quality = 'HIGH';
    } else if (higherHigh && !higherLow) {
      structure.trend = 'WEAK_BULLISH';
      structure.pattern = 'HH_LL';
      structure.quality = 'MEDIUM';
    } else if (lowerHigh && !lowerLow) {
      structure.trend = 'WEAK_BEARISH';
      structure.pattern = 'LH_HL';
      structure.quality = 'MEDIUM';
    }
  }

  const currentPrice = closes[closes.length - 1];
  const nearestHigh = findNearestLevel(swingHighs, currentPrice, 'above');
  const nearestLow = findNearestLevel(swingLows, currentPrice, 'below');

  return {
    ...structure,
    nearestHigh: nearestHigh?.price,
    nearestLow: nearestLow?.price,
    distanceToHigh: nearestHigh ? ((nearestHigh.price - currentPrice) / currentPrice) * 100 : null,
    distanceToLow: nearestLow ? ((currentPrice - nearestLow.price) / currentPrice) * 100 : null,
  };
}

function findSwingPoints(prices, type, lookback = 3) {
  const points = [];
  
  for (let i = lookback; i < prices.length - lookback; i++) {
    const slice = prices.slice(i - lookback, i + lookback + 1);
    const current = prices[i];
    
    if (type === 'high' && current === Math.max(...slice)) {
      points.push({ index: i, price: current });
    } else if (type === 'low' && current === Math.min(...slice)) {
      points.push({ index: i, price: current });
    }
  }
  
  return points;
}

function findNearestLevel(levels, currentPrice, direction) {
  if (!levels.length) return null;
  
  if (direction === 'above') {
    const above = levels.filter(l => l.price > currentPrice);
    return above.length ? above.reduce((a, b) => a.price < b.price ? a : b) : null;
  } else {
    const below = levels.filter(l => l.price < currentPrice);
    return below.length ? below.reduce((a, b) => a.price > b.price ? a : b) : null;
  }
  }
