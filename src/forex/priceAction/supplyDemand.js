export async function identifySupplyDemand(highs, lows, closes, volumes) {
  const zones = [];
  const currentPrice = closes[closes.length - 1];
  
  // Find rally-base-rally and drop-base-drop patterns
  for (let i = 10; i < closes.length - 10; i++) {
    // Check for supply zone (drop-base-drop)
    if (isSupplyZone(highs, lows, closes, i)) {
      zones.push({
        type: 'SUPPLY',
        price: highs[i],
        low: lows[i],
        index: i,
        strength: calculateZoneStrength(highs, lows, closes, volumes, i, 'SUPPLY'),
        active: highs[i] > currentPrice,
      });
    }
    
    // Check for demand zone (rally-base-rally)
    if (isDemandZone(highs, lows, closes, i)) {
      zones.push({
        type: 'DEMAND',
        price: lows[i],
        high: highs[i],
        index: i,
        strength: calculateZoneStrength(highs, lows, closes, volumes, i, 'DEMAND'),
        active: lows[i] < currentPrice,
      });
    }
  }

  const supplyZones = zones
    .filter(z => z.type === 'SUPPLY' && z.active)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  const demandZones = zones
    .filter(z => z.type === 'DEMAND' && z.active)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  return {
    supplyZones,
    demandZones,
    nearestSupply: supplyZones[0] || null,
    nearestDemand: demandZones[0] || null,
    totalZones: zones.length,
  };
}

function isSupplyZone(highs, lows, closes, index) {
  // Drop-base-drop pattern
  const leftDrop = closes[index - 1] < closes[index - 2];
  const base = Math.abs(closes[index] - closes[index - 1]) < Math.abs(closes[index - 1] - closes[index - 2]) * 0.3;
  const rightDrop = closes[index + 1] < closes[index];
  
  return leftDrop && base && rightDrop && highs[index] > highs[index - 1];
}

function isDemandZone(highs, lows, closes, index) {
  // Rally-base-rally pattern
  const leftRally = closes[index - 1] > closes[index - 2];
  const base = Math.abs(closes[index] - closes[index - 1]) < Math.abs(closes[index - 1] - closes[index - 2]) * 0.3;
  const rightRally = closes[index + 1] > closes[index];
  
  return leftRally && base && rightRally && lows[index] < lows[index - 1];
}

function calculateZoneStrength(highs, lows, closes, volumes, index, type) {
  let strength = 50;
  
  // Volume at zone
  if (volumes && volumes[index] > volumes[index - 1]) strength += 15;
  
  // Zone size (smaller = stronger)
  const zoneSize = Math.abs(highs[index] - lows[index]);
  const avgSize = calculateAverageRange(highs, lows, 20);
  if (zoneSize < avgSize * 0.5) strength += 15;
  
  // Price rejection
  if (type === 'SUPPLY' && closes[index + 1] < lows[index]) strength += 20;
  if (type === 'DEMAND' && closes[index + 1] > highs[index]) strength += 20;
  
  return Math.min(100, strength);
}

function calculateAverageRange(highs, lows, period) {
  let sum = 0;
  for (let i = Math.max(0, highs.length - period); i < highs.length; i++) {
    sum += Math.abs(highs[i] - lows[i]);
  }
  return sum / Math.min(period, highs.length);
}
