export async function identifySRLevels(highs, lows, closes) {
  const currentPrice = closes[closes.length - 1];
  
  // Find all swing points
  const swingHighs = findSwingPoints(highs, 'high');
  const swingLows = findSwingPoints(lows, 'low');
  
  // Cluster nearby levels
  const resistanceClusters = clusterLevels(swingHighs, 0.003);
  const supportClusters = clusterLevels(swingLows, 0.003);
  
  // Filter and sort levels
  const resistance = resistanceClusters
    .filter(level => level.price > currentPrice)
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map(level => ({
      ...level,
      type: 'RESISTANCE',
      distance: ((level.price - currentPrice) / currentPrice) * 100,
    }));

  const support = supportClusters
    .filter(level => level.price < currentPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)
    .map(level => ({
      ...level,
      type: 'SUPPORT',
      distance: ((currentPrice - level.price) / currentPrice) * 100,
    }));

  // Find key levels (most tested)
  const allLevels = [...resistance, ...support];
  const keyLevels = allLevels
    .filter(level => level.touches >= 2)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  return {
    resistance,
    support,
    keyLevels,
    nearestResistance: resistance[0] || null,
    nearestSupport: support[0] || null,
  };
}

function findSwingPoints(prices, type, lookback = 5) {
  const points = [];
  for (let i = lookback; i < prices.length - lookback; i++) {
    const slice = prices.slice(i - lookback, i + lookback + 1);
    if (type === 'high' && prices[i] === Math.max(...slice)) {
      points.push(prices[i]);
    } else if (type === 'low' && prices[i] === Math.min(...slice)) {
      points.push(prices[i]);
    }
  }
  return points;
}

function clusterLevels(prices, tolerance) {
  if (!prices.length) return [];
  
  const sorted = [...prices].sort((a, b) => a - b);
  const clusters = [];
  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const avg = currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length;
    if (Math.abs(sorted[i] - avg) / avg <= tolerance) {
      currentCluster.push(sorted[i]);
    } else {
      clusters.push({
        price: currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length,
        touches: currentCluster.length,
        strength: Math.min(100, currentCluster.length * 25),
      });
      currentCluster = [sorted[i]];
    }
  }
  
  if (currentCluster.length > 0) {
    clusters.push({
      price: currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length,
      touches: currentCluster.length,
      strength: Math.min(100, currentCluster.length * 25),
    });
  }
  
  return clusters;
}
