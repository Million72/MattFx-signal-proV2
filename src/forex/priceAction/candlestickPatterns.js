export async function detectCandlestickPatterns(opens, highs, lows, closes) {
  const patterns = [];
  const last = closes.length - 1;
  
  if (last < 2) return { patterns: [], bullish: false, bearish: false };

  const candle = {
    open: opens[last],
    high: highs[last],
    low: lows[last],
    close: closes[last],
    body: Math.abs(closes[last] - opens[last]),
    upperWick: highs[last] - Math.max(opens[last], closes[last]),
    lowerWick: Math.min(opens[last], closes[last]) - lows[last],
    isBullish: closes[last] > opens[last],
    isBearish: closes[last] < opens[last],
  };

  const prevCandle = {
    open: opens[last - 1],
    high: highs[last - 1],
    low: lows[last - 1],
    close: closes[last - 1],
    body: Math.abs(closes[last - 1] - opens[last - 1]),
    isBullish: closes[last - 1] > opens[last - 1],
    isBearish: closes[last - 1] < opens[last - 1],
  };

  // Doji
  if (candle.body <= (candle.high - candle.low) * 0.1) {
    patterns.push({
      name: 'DOJI',
      type: 'NEUTRAL',
      strength: 30,
      description: 'Market indecision',
    });
  }

  // Hammer
  if (candle.lowerWick > candle.body * 2 && candle.upperWick < candle.body * 0.5) {
    patterns.push({
      name: 'HAMMER',
      type: 'BULLISH',
      strength: 65,
      description: 'Potential bullish reversal',
    });
  }

  // Shooting Star
  if (candle.upperWick > candle.body * 2 && candle.lowerWick < candle.body * 0.5) {
    patterns.push({
      name: 'SHOOTING_STAR',
      type: 'BEARISH',
      strength: 65,
      description: 'Potential bearish reversal',
    });
  }

  // Engulfing Bullish
  if (candle.isBullish && prevCandle.isBearish && 
      candle.open < prevCandle.close && candle.close > prevCandle.open) {
    patterns.push({
      name: 'BULLISH_ENGULFING',
      type: 'BULLISH',
      strength: 75,
      description: 'Strong bullish reversal signal',
    });
  }

  // Engulfing Bearish
  if (candle.isBearish && prevCandle.isBullish && 
      candle.open > prevCandle.close && candle.close < prevCandle.open) {
    patterns.push({
      name: 'BEARISH_ENGULFING',
      type: 'BEARISH',
      strength: 75,
      description: 'Strong bearish reversal signal',
    });
  }

  // Morning Star (3-candle pattern)
  if (last >= 2) {
    const prevPrevCandle = {
      close: closes[last - 2],
      open: opens[last - 2],
      isBearish: closes[last - 2] < opens[last - 2],
    };

    if (prevPrevCandle.isBearish && 
        Math.abs(prevCandle.body) < Math.abs(prevPrevCandle.close - prevPrevCandle.open) * 0.3 &&
        candle.isBullish && candle.close > (prevPrevCandle.open + prevPrevCandle.close) / 2) {
      patterns.push({
        name: 'MORNING_STAR',
        type: 'BULLISH',
        strength: 80,
        description: 'Strong bullish reversal pattern',
      });
    }
  }

  // Three White Soldiers
  if (last >= 2) {
    const candle1 = { close: closes[last - 2], open: opens[last - 2] };
    const candle2 = { close: closes[last - 1], open: opens[last - 1] };
    
    if (candle1.close > candle1.open && 
        candle2.close > candle2.open && 
        candle.close > candle.open &&
        candle2.close > candle1.close && 
        candle.close > candle2.close) {
      patterns.push({
        name: 'THREE_WHITE_SOLDIERS',
        type: 'BULLISH',
        strength: 85,
        description: 'Strong bullish continuation',
      });
    }
  }

  // Three Black Crows
  if (last >= 2) {
    const candle1 = { close: closes[last - 2], open: opens[last - 2] };
    const candle2 = { close: closes[last - 1], open: opens[last - 1] };
    
    if (candle1.close < candle1.open && 
        candle2.close < candle2.open && 
        candle.close < candle.open &&
        candle2.close < candle1.close && 
        candle.close < candle2.close) {
      patterns.push({
        name: 'THREE_BLACK_CROWS',
        type: 'BEARISH',
        strength: 85,
        description: 'Strong bearish continuation',
      });
    }
  }

  // Piercing Pattern
  if (prevCandle.isBearish && candle.isBullish &&
      candle.open < prevCandle.low &&
      candle.close > (prevCandle.open + prevCandle.close) / 2) {
    patterns.push({
      name: 'PIERCING_PATTERN',
      type: 'BULLISH',
      strength: 70,
      description: 'Bullish reversal signal',
    });
  }

  // Dark Cloud Cover
  if (prevCandle.isBullish && candle.isBearish &&
      candle.open > prevCandle.high &&
      candle.close < (prevCandle.open + prevCandle.close) / 2) {
    patterns.push({
      name: 'DARK_CLOUD_COVER',
      type: 'BEARISH',
      strength: 70,
      description: 'Bearish reversal signal',
    });
  }

  const bullish = patterns.filter(p => p.type === 'BULLISH').length > 0;
  const bearish = patterns.filter(p => p.type === 'BEARISH').length > 0;

  return {
    patterns,
    bullish,
    bearish,
    strongestPattern: patterns.sort((a, b) => b.strength - a.strength)[0] || null,
    count: patterns.length,
  };
}
