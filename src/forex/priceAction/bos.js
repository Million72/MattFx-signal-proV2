export async function detectBOS(highs, lows, closes) {
  const swingHighs = findSwingHighs(highs);
  const swingLows = findSwingLows(lows);
  
  if (swingHighs.length < 3 || swingLows.length < 3) {
    return { detected: false, direction: null, recent: false };
  }

  const recent = [];
  
  // Detect Bullish BOS (price breaks above previous swing high)
  for (let i = 2; i < swingHighs.length; i++) {
    const currentHigh = swingHighs[i];
    const previousHigh = swingHighs[i - 1];
    const prevPrevHigh = swingHighs[i - 2];
    
    if (prevPrevHigh.price > previousHigh.price && currentHigh.price > prevPrevHigh.price) {
      recent.push({
        type: 'BULLISH_BOS',
        price: currentHigh.price,
        index: currentHigh.index,
        broken: previousHigh.price,
        time: new Date().getTime(),
      });
    }
  }
  
  // Detect Bearish BOS (price breaks below previous swing low)
  for (let i = 2; i < swingLows.length; i++) {
    const currentLow = swingLows[i];
    const previousLow = swingLows[i - 1];
    const prevPrevLow = swingLows[i - 2];
    
    if (prevPrevLow.price < previousLow.price && currentLow.price < prevPrevLow.price) {
      recent.push({
        type: 'BEARISH_BOS',
        price: currentLow.price,
        index: currentLow.index,
        broken: previousLow.price,
        time: new Date().getTime(),
      });
    }
  }

  const lastBOS = recent[recent.length - 1];
  const isRecent = lastBOS && (highs.length - lastBOS.index) < 10;

  return {
    detected: recent.length > 0,
    direction: lastBOS?.type?.includes('BULLISH') ? 'BULLISH' : 'BEARISH',
    recent: isRecent,
    count: recent.length,
    lastBreak: lastBOS,
    all: recent,
  };
}

function findSwingHighs(highs, period = 5) {
  const swings = [];
  for (let i = period; i < highs.length - period; i++) {
    if (highs[i] === Math.max(...highs.slice(i - period, i + period + 1))) {
      swings.push({ price: highs[i], index: i });
    }
  }
  return swings;
}

function findSwingLows(lows, period = 5) {
  const swings = [];
  for (let i = period; i < lows.length - period; i++) {
    if (lows[i] === Math.min(...lows.slice(i - period, i + period + 1))) {
      swings.push({ price: lows[i], index: i });
    }
  }
  return swings;
}
