import { ATR } from '../../indicators/atr';
import { ADX } from '../../indicators/adx';
import { VolumeAnalysis } from '../../indicators/volume';

export async function marketRegime(highs, lows, closes, volumes) {
  const adx = new ADX(14);
  const adxResult = adx.calculate(highs, lows, closes);
  
  const atr = new ATR(14);
  const atrValues = atr.calculate(highs, lows, closes);
  
  const volume = new VolumeAnalysis(20);
  const volumeAnalysis = volume.analyze(volumes, closes);

  const adxValue = adx.getValue();
  const adxTrend = adx.getTrend();
  const volatilityRegime = atr.getVolatilityRegime();

  let regime = 'UNKNOWN';
  let description = '';
  let tradingAdvice = '';

  // Determine market regime
  if (adxValue > 40) {
    if (volatilityRegime === 'HIGH') {
      regime = 'STRONG_TRENDING_VOLATILE';
      description = 'Strong trend with high volatility - aggressive trading possible';
      tradingAdvice = 'Trade with trend, use wider stops';
    } else {
      regime = 'STRONG_TRENDING';
      description = 'Strong trend with normal volatility - ideal for trend following';
      tradingAdvice = 'Follow the trend, use trailing stops';
    }
  } else if (adxValue > 25) {
    if (volatilityRegime === 'HIGH') {
      regime = 'TRENDING_VOLATILE';
      description = 'Moderate trend with high volatility';
      tradingAdvice = 'Trade with caution, reduce position size';
    } else {
      regime = 'TRENDING';
      description = 'Moderate trending market';
      tradingAdvice = 'Good for trend following strategies';
    }
  } else if (adxValue > 20) {
    if (volatilityRegime === 'LOW') {
      regime = 'CONSOLIDATING_LOW_VOL';
      description = 'Low volatility consolidation - potential breakout setup';
      tradingAdvice = 'Wait for breakout, avoid range trading';
    } else {
      regime = 'CONSOLIDATING';
      description = 'Market in consolidation phase';
      tradingAdvice = 'Range trading possible, use support/resistance';
    }
  } else {
    if (volatilityRegime === 'LOW') {
      regime = 'DEAD_MARKET';
      description = 'Very low activity - avoid trading';
      tradingAdvice = 'Stay out, wait for volatility to pick up';
    } else {
      regime = 'CHOPPY';
      description = 'Choppy market with no clear direction';
      tradingAdvice = 'Avoid trading, wait for clear trend';
    }
  }

  // Volume confirmation
  const volumeConfirming = volumeAnalysis.confirmsDirection === adxTrend;

  return {
    regime,
    description,
    tradingAdvice,
    adxValue,
    adxTrend,
    volatilityRegime,
    volumeConfirming,
    volumeAnalysis,
    isTradeable: !['DEAD_MARKET', 'CHOPPY'].includes(regime),
  };
}
