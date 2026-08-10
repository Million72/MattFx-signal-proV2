export async function detectChartPatterns(highs, lows, closes) {
  const patterns = [];
  
  // Find swing points
  const swingHighs = findSwings(highs, 'high');
  const swingLows = findSwings(lows, 'low');

  // Head and Shoulders
  if (swingHighs.length >= 5 && swingLows.length >= 4) {
    const recentHighs = swingHighs.slice(-5);
    const recentLows = swingLows.slice(-4);
    
    if (isHeadAndShoulders(recentHighs, recentLows, closes)) {
      patterns.push({
        name: 'HEAD_AND_SHOULDERS',
        type: 'BEARISH',
        strength: 80,
        description: 'Major bearish reversal pattern',
      });
    }
  }

  // Inverse Head and Shoulders
  if (swingLows.length >= 5 && swingHighs.length >= 4) {
    const recentLows = swingLows.slice(-5);
    const recentHighs = swingHighs.slice(-4);
    
    if (isInverseHeadAndShoulders(recentLows, recentHighs, closes)) {
      patterns.push({
        name: 'INVERSE_HEAD_AND_SHOULDERS',
        type: 'BULLISH',
        strength: 80,
        description: 'Major bullish reversal pattern',
      });
    }
  }

  // Double Top
  if (swingHighs.length >= 2) {
    const recentHighs = swingHighs.slice(-2);
    if (isDoubleTop(recentHighs, closes)) {
      patterns.push({
        name: 'DOUBLE_TOP',
        type: 'BEARISH',
        strength: 70,
        description: 'Bearish reversal pattern',
      });
    }
  }

  // Double Bottom
  if (swingLows.length >= 2) {
    const recentLows = swingLows.slice(-2);
    if (isDoubleBottom(recentLows, closes)) {
      patterns.push({
        name: 'DOUBLE_BOTTOM',
        type: 'BULLISH',
        strength: 70,
        description: 'Bullish reversal pattern',
      });
    }
  }

  // Triangle patterns
  const triangle = detectTriangle(swingHighs, swingLows);
  if (triangle) {
    patterns.push(triangle);
  }

  // Flag/Pennant
  const flag = detectFlag(highs, lows, closes);
  if (flag) {
    patterns.push(flag);
  }

  // Wedge
  const wedge = detectWedge(swingHighs, swingLows);
  if (wedge) {
    patterns.push(wedge);
  }

  return {
    patterns,
    active: patterns.length > 0,
    count: patterns.length,
    strongest: patterns.sort((a, b) => b.strength - a.strength)[0] || null,
  };
}

function findSwings(prices, type, period = 5) {
  const swings = [];
  for (let i = period; i < prices.length - period; i++) {
    if (type === 'high' && prices[i] === Math.max(...prices.slice(i - period, i + period + 1))) {
      swings.push(prices[i]);
    } else if (type === 'low' && prices[i] === Math.min(...prices.slice(i - period, i + period + 1))) {
      swings.push(prices[i]);
    }
  }
  return swings;
}

function isHeadAndShoulders(highs, lows, closes) {
  if (highs.length < 3) return false;
  
  const leftShoulder = highs[0];
  const head = highs[1];
  const rightShoulder = highs[2];
  
  return head > leftShoulder && head > rightShoulder &&
         Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.02;
}

function isInverseHeadAndShoulders(lows, highs, closes) {
  if (lows.length < 3) return false;
  
  const leftShoulder = lows[0];
  const head = lows[1];
  const rightShoulder = lows[2];
  
  return head < leftShoulder && head < rightShoulder &&
         Math.abs(leftShoulder - rightShoulder) / leftShoulder < 0.02;
}

function isDoubleTop(highs, closes) {
  if (highs.length < 2) return false;
  
  const first = highs[0];
  const second = highs[1];
  
  return Math.abs(first - second) / first < 0.01;
}

function isDoubleBottom(lows, closes) {
  if (lows.length < 2) return false;
  
  const first = lows[0];
  const second = lows[1];
  
  return Math.abs(first - second) / first < 0.01;
}

function detectTriangle(highs, lows) {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);
  
  const highSlope = (recentHighs[2] - recentHighs[0]) / 2;
  const lowSlope = (recentLows[2] - recentLows[0]) / 2;
  
  if (Math.abs(highSlope) < 0.001 && lowSlope > 0.001) {
    return {
      name: 'ASCENDING_TRIANGLE',
      type: 'BULLISH',
      strength: 65,
      description: 'Bullish continuation pattern',
    };
  }
  
  if (highSlope < -0.001 && Math.abs(lowSlope) < 0.001) {
    return {
      name: 'DESCENDING_TRIANGLE',
      type: 'BEARISH',
      strength: 65,
      description: 'Bearish continuation pattern',
    };
  }
  
  if (Math.abs(highSlope + lowSlope) < 0.001) {
    return {
      name: 'SYMMETRICAL_TRIANGLE',
      type: 'NEUTRAL',
      strength: 50,
      description: 'Breakout imminent',
    };
  }
  
  return null;
}

function detectFlag(highs, lows, closes) {
  if (highs.length < 10) return null;
  
  const recentHighs = highs.slice(-10);
  const recentLows = lows.slice(-10);
  
  const highSlope = (recentHighs[9] - recentHighs[0]) / 9;
  const lowSlope = (recentLows[9] - recentLows[0]) / 9;
  
  if (Math.abs(highSlope - lowSlope) < 0.0001 && Math.abs(highSlope) > 0.0001) {
    return {
      name: highSlope < 0 ? 'BULLISH_FLAG' : 'BEARISH_FLAG',
      type: highSlope < 0 ? 'BULLISH' : 'BEARISH',
      strength: 60,
      description: 'Continuation pattern',
    };
  }
  
  return null;
}

function detectWedge(highs, lows) {
  if (highs.length < 3 || lows.length < 3) return null;
  
  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);
  
  const highSlope = (recentHighs[2] - recentHighs[0]) / 2;
  const lowSlope = (recentLows[2] - recentLows[0]) / 2;
  
  if (highSlope < 0 && lowSlope < 0 && Math.abs(highSlope) > Math.abs(lowSlope)) {
    return {
      name: 'FALLING_WEDGE',
      type: 'BULLISH',
      strength: 65,
      description: 'Bullish reversal pattern',
    };
  }
  
  if (highSlope > 0 && lowSlope > 0 && Math.abs(lowSlope) > Math.abs(highSlope)) {
    return {
      name: 'RISING_WEDGE',
      type: 'BEARISH',
      strength: 65,
      description: 'Bearish reversal pattern',
    };
  }
  
  return null;
}
