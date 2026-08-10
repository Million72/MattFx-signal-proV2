export async function detectRetest(highs, lows, closes, srLevels) {
  const currentPrice = closes[closes.length - 1];
  const retests = [];

  // Check for retest of broken support/resistance
  const allLevels = [
    ...(srLevels?.resistance || []).map(l => ({ ...l, originalType: 'RESISTANCE' })),
    ...(srLevels?.support || []).map(l => ({ ...l, originalType: 'SUPPORT' })),
  ];

  for (const level of allLevels) {
    const distance = Math.abs(currentPrice - level.price) / currentPrice;
    
    // Price is near the level (within 0.2%)
    if (distance <= 0.002) {
      // Check if level was previously broken
      const wasBroken = level.originalType === 'RESISTANCE' ?
        closes.some(c => c > level.price * 1.005) :
        closes.some(c => c < level.price * 0.995);

      if (wasBroken) {
        retests.push({
          level: level.price,
          originalType: level.originalType,
          newType: level.originalType === 'RESISTANCE' ? 'SUPPORT' : 'RESISTANCE',
          type: 'BROKEN_LEVEL_RETEST',
          strength: level.strength,
          distance: distance * 100,
        });
      }
    }
  }

  // Check for retest of trendline
  const trendlineRetest = checkTrendlineRetest(highs, lows, closes);

  if (trendlineRetest) {
    retests.push({
      level: trendlineRetest.price,
      type: 'TRENDLINE_RETEST',
      direction: trendlineRetest.direction,
      strength: trendlineRetest.strength,
    });
  }

  const active = retests.length > 0;
  const strongestRetest = retests.sort((a, b) => b.strength - a.strength)[0];

  return {
    active,
    retests,
    count: retests.length,
    strongest: strongestRetest || null,
    direction: strongestRetest?.direction || null,
  };
}

function checkTrendlineRetest(highs, lows, closes) {
  // Simple trendline detection using recent swing points
  const swingLows = [];
  const swingHighs = [];
  
  for (let i = 5; i < lows.length - 5; i++) {
    if (lows[i] === Math.min(...lows.slice(i - 5, i + 6))) {
      swingLows.push({ price: lows[i], index: i });
    }
    if (highs[i] === Math.max(...highs.slice(i - 5, i + 6))) {
      swingHighs.push({ price: highs[i], index: i });
    }
  }

  if (swingLows.length >= 2) {
    const lastTwoLows = swingLows.slice(-2);
    const slope = (lastTwoLows[1].price - lastTwoLows[0].price) / 
                 (lastTwoLows[1].index - lastTwoLows[0].index);
    
    if (slope > 0) {
      const currentTrendlineValue = lastTwoLows[0].price + 
        slope * (closes.length - 1 - lastTwoLows[0].index);
      const distance = Math.abs(closes[closes.length - 1] - currentTrendlineValue) / 
                      closes[closes.length - 1];
      
      if (distance < 0.003) {
        return {
          price: currentTrendlineValue,
          direction: 'BULLISH',
          strength: 70,
        };
      }
    }
  }

  return null;
}
