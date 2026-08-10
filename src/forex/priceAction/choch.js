export async function detectCHoCH(highs, lows, closes) {
  // CHoCH (Change of Character) - When market structure shifts
  const swingHighs = findSwings(highs, 'high');
  const swingLows = findSwings(lows, 'low');
  
  if (swingHighs.length < 3 || swingLows.length < 3) {
    return { detected: false, direction: null, recent: false };
  }

  const patterns = [];

  // Bullish CHoCH: Higher Low formed after a Lower Low
  for (let i = 2; i < swingLows.length; i++) {
    const low1 = swingLows[i - 2];
    const low2 = swingLows[i - 1];
    const low3 = swingLows[i];
    
    if (low2.price < low1.price && low3.price > low2.price) {
      patterns.push({
        type: 'BULLISH_CHOCH',
        price: low3.price,
        index: low3.index,
        description: 'Change from bearish to bullish structure',
        time: Date.now(),
      });
    }
  }

  // Bearish CHoCH: Lower High formed after a Higher High
  for (let i = 2; i < swingHighs.length; i++) {
    const high1 = swingHighs[i - 2];
    const high2 = swingHighs[i - 1];
    const high3 = swingHighs[i];
    
    if (high2.price > high1.price && high3.price < high2.price) {
      patterns.push({
        type: 'BEARISH_CHOCH',
        price: high3.price,
        index: high3.index,
        description: 'Change from bullish to bearish structure',
        time: Date.now(),
      });
    }
  }

  const lastCHoCH = patterns[patterns.length - 1];
  const isRecent = lastCHoCH && (highs.length - lastCHoCH.index) < 8;

  return {
    detected: patterns.length > 0,
    direction: lastCHoCH?.type?.includes('BULLISH') ? 'BULLISH' : 'BEARISH',
    recent: isRecent,
    count: patterns.length,
    lastChange: lastCHoCH,
    all: patterns,
  };
}

function findSwings(prices, type, period = 5) {
  const swings = [];
  for (let i = period; i < prices.length - period; i++) {
    const slice = prices.slice(i - period, i + period + 1);
    if (type === 'high' && prices[i] === Math.max(...slice)) {
      swings.push({ price: prices[i], index: i });
    } else if (type === 'low' && prices[i] === Math.min(...slice)) {
      swings.push({ price: prices[i], index: i });
    }
  }
  return swings;
}
