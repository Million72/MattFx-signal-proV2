import { EMA } from '../../indicators/ema';
import { ADX } from '../../indicators/adx';
import { Supertrend } from '../../indicators/supertrend';

export async function trendAnalysis(highs, lows, closes) {
  const ema20 = new EMA(20).calculate(closes);
  const ema50 = new EMA(50).calculate(closes);
  const ema100 = new EMA(100).calculate(closes);
  const ema200 = new EMA(200).calculate(closes);
  
  const adx = new ADX(14);
  const adxResult = adx.calculate(highs, lows, closes);
  
  const supertrend = new Supertrend(10, 3);
  const stResult = supertrend.calculate(highs, lows, closes);

  const lastClose = closes[closes.length - 1];
  const lastEMA20 = ema20[ema20.length - 1];
  const lastEMA50 = ema50[ema50.length - 1];
  const lastEMA100 = ema100[ema100.length - 1];
  const lastEMA200 = ema200[ema200.length - 1];

  let direction = 'NEUTRAL';
  let strength = 0;
  let quality = 'LOW';

  // Determine trend direction
  const bullishConditions = [
    lastClose > lastEMA20,
    lastEMA20 > lastEMA50,
    lastEMA50 > lastEMA100,
    lastEMA100 > lastEMA200
  ];

  const bearishConditions = [
    lastClose < lastEMA20,
    lastEMA20 < lastEMA50,
    lastEMA50 < lastEMA100,
    lastEMA100 < lastEMA200
  ];

  const bullishCount = bullishConditions.filter(Boolean).length;
  const bearishCount = bearishConditions.filter(Boolean).length;

  if (bullishCount === 4) {
    direction = 'STRONG_BULLISH';
    strength = 100;
    quality = 'HIGH';
  } else if (bullishCount === 3) {
    direction = 'BULLISH';
    strength = 75;
    quality = 'MEDIUM';
  } else if (bullishCount === 2) {
    direction = 'WEAK_BULLISH';
    strength = 50;
    quality = 'LOW';
  } else if (bearishCount === 4) {
    direction = 'STRONG_BEARISH';
    strength = 100;
    quality = 'HIGH';
  } else if (bearishCount === 3) {
    direction = 'BEARISH';
    strength = 75;
    quality = 'MEDIUM';
  } else if (bearishCount === 2) {
    direction = 'WEAK_BEARISH';
    strength = 50;
    quality = 'LOW';
  }

  // ADX confirmation
  const adxValue = adx.getValue();
  const adxStrength = adx.getStrength();
  const adxTrend = adx.getTrend();

  if (adxValue > 25 && adxTrend === (direction.includes('BULLISH') ? 'BULLISH' : 'BEARISH')) {
    strength = Math.min(100, strength + 15);
  }

  // Supertrend confirmation
  const stTrend = supertrend.getTrend();
  if ((direction.includes('BULLISH') && stTrend === 'BULLISH') ||
      (direction.includes('BEARISH') && stTrend === 'BEARISH')) {
    strength = Math.min(100, strength + 10);
  }

  // Calculate trend slope
  const recentEMA = ema20.slice(-10);
  const slope = ((recentEMA[9] - recentEMA[0]) / recentEMA[0]) * 100;

  return {
    direction,
    strength,
    quality,
    slope,
    emaAlignment: {
      ema20: lastClose > lastEMA20 ? 'BULLISH' : 'BEARISH',
      ema50: lastClose > lastEMA50 ? 'BULLISH' : 'BEARISH',
      ema100: lastClose > lastEMA100 ? 'BULLISH' : 'BEARISH',
      ema200: lastClose > lastEMA200 ? 'BULLISH' : 'BEARISH',
    },
    adx: {
      value: adxValue,
      strength: adxStrength,
      trend: adxTrend,
    },
    supertrend: {
      direction: stTrend,
      value: supertrend.getValue(),
    },
    indicators: {
      ema20: lastEMA20,
      ema50: lastEMA50,
      ema100: lastEMA100,
      ema200: lastEMA200,
    }
  };
}
