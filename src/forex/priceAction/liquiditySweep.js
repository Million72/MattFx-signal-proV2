export async function detectLiquiditySweep(highs, lows, closes) {
  const currentPrice = closes[closes.length - 1];
  
  // Find equal highs and lows (liquidity pools)
  const equalHighs = findEqualLevels(highs, 0.0005);
  const equalLows = findEqualLevels(lows, 0.0005);
  
  const sweeps = [];

  // Check for liquidity sweeps (price breaks level and reverses)
  for (const level of equalHighs) {
    const priceAbove = closes.some((c, i) => i > level.indices[level.indices.length - 1] && c > level.price);
    const reversed = currentPrice < level.price;
    
    if (priceAbove && reversed) {
      sweeps.push({
        type: 'BUYSIDE_LIQUIDITY_SWEEP',
        level: level.price,
        swept: true,
        reversed: true,
        time: Date.now(),
      });
    }
  }

  for (const level of equalLows) {
    const priceBelow = closes.some((c, i) => i > level.indices[level.indices.length - 1] && c < level.price);
    const reversed = currentPrice > level.price;
    
    if (priceBelow && reversed) {
      sweeps.push({
        type: 'SELLSIDE_LIQUIDITY_SWEEP',
        level: level.price,
        swept: true,
        reversed: true,
        time: Date.now(),
      });
    }
  }

  return {
    sweeps,
    recentSweep: sweeps[sweeps.length - 1] || null,
    hasRecentSweep: sweeps.length > 0,
    buySideSweeps: sweeps.filter(s => s.type.includes('BUYSIDE')),
    sellSideSweeps: sweeps.filter(s => s.type.includes('SELLSIDE')),
  };
}

function findEqualLevels(prices, tolerance) {
  const levels = [];
  const used = new Set();

  for (let i = 0; i < prices.length; i++) {
    if (used.has(i)) continue;
    
    const level = {
      price: prices[i],
      indices: [i],
      count: 1,
    };

    for (let j = i + 1; j < prices.length; j++) {
      if (used.has(j)) continue;
      
      if (Math.abs(prices[j] - level.price) / level.price <= tolerance) {
        level.indices.push(j);
        level.count++;
        used.add(j);
      }
    }

    if (level.count >= 2) {
      level.price = level.indices.reduce((sum, idx) => sum + prices[idx], 0) / level.count;
      levels.push(level);
    }
  }

  return levels;
}
