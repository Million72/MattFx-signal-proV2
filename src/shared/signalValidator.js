export class SignalValidator {
  constructor() {
    this.rules = [
      this.validateTrendConsistency,
      this.validateMomentumAlignment,
      this.validateVolatilityBounds,
      this.validatePriceStructure,
      this.validateRiskReward,
      this.validateMarketHours,
    ];
  }

  async validate(signal, marketData) {
    const results = [];
    let passed = true;

    for (const rule of this.rules) {
      const result = rule.call(this, signal, marketData);
      results.push({
        rule: rule.name,
        passed: result.passed,
        message: result.message,
      });

      if (!result.passed) {
        passed = false;
        if (result.critical) break;
      }
    }

    return {
      isValid: passed,
      results,
      passedCount: results.filter(r => r.passed).length,
      failedCount: results.filter(r => !r.passed).length,
    };
  }

  validateTrendConsistency(signal, marketData) {
    const trend = marketData?.trend;
    if (!trend) return { passed: false, message: 'No trend data', critical: true };

    const directionMatch = 
      (signal.direction === 'BUY' && trend.direction.includes('BULLISH')) ||
      (signal.direction === 'SELL' && trend.direction.includes('BEARISH'));

    return {
      passed: directionMatch,
      message: directionMatch ? 'Trend aligned' : 'Trend not aligned with signal',
      critical: true,
    };
  }

  validateMomentumAlignment(signal, marketData) {
    const momentum = marketData?.momentum;
    if (!momentum) return { passed: false, message: 'No momentum data', critical: false };

    const alignment = 
      (signal.direction === 'BUY' && momentum.signal.includes('BUY')) ||
      (signal.direction === 'SELL' && momentum.signal.includes('SELL'));

    return {
      passed: alignment,
      message: alignment ? 'Momentum confirms' : 'Momentum does not confirm',
      critical: false,
    };
  }

  validateVolatilityBounds(signal, marketData) {
    const volatility = marketData?.volatility;
    if (!volatility) return { passed: false, message: 'No volatility data', critical: false };

    const withinBounds = volatility.isTradeable;

    return {
      passed: withinBounds,
      message: withinBounds ? 'Volatility acceptable' : 'Volatility outside bounds',
      critical: false,
    };
  }

  validatePriceStructure(signal, marketData) {
    const structure = marketData?.structure;
    if (!structure) return { passed: false, message: 'No structure data', critical: false };

    const validStructure = structure.quality !== 'LOW';

    return {
      passed: validStructure,
      message: validStructure ? 'Structure valid' : 'Poor market structure',
      critical: false,
    };
  }

  validateRiskReward(signal) {
    const minRR = 1.5;
    const rr = parseFloat(signal.riskReward);

    return {
      passed: rr >= minRR,
      message: rr >= minRR ? 
        `Good R:R (1:${rr})` : 
        `Poor R:R (1:${rr}), minimum 1:${minRR} required`,
      critical: true,
    };
  }

  validateMarketHours(signal) {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    // Weekend check
    if (day === 0 || day === 6) {
      return {
        passed: false,
        message: 'Market closed (weekend)',
        critical: true,
      };
    }

    // Low liquidity hours
    if (hour >= 21 || hour < 1) {
      return {
        passed: false,
        message: 'Low liquidity period',
        critical: false,
      };
    }

    return {
      passed: true,
      message: 'Market hours valid',
      critical: false,
    };
  }
}
