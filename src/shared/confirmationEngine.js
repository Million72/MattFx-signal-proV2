export class ConfirmationEngine {
  constructor() {
    this.confirmations = {
      trend: { weight: 0.3, required: true },
      momentum: { weight: 0.25, required: true },
      volatility: { weight: 0.15, required: false },
      structure: { weight: 0.2, required: true },
      volume: { weight: 0.1, required: false },
    };
  }

  async confirm(analyses) {
    const results = {};
    let totalWeight = 0;
    let confirmedWeight = 0;
    let allRequiredMet = true;

    for (const [name, config] of Object.entries(this.confirmations)) {
      const analysis = analyses[name];
      const confirmation = this.checkConfirmation(name, analysis, analyses);
      
      results[name] = {
        passed: confirmation.passed,
        weight: config.weight,
        required: config.required,
        details: confirmation.details,
      };

      if (confirmation.passed) {
        confirmedWeight += config.weight;
      } else if (config.required) {
        allRequiredMet = false;
      }
      
      totalWeight += config.weight;
    }

    const confirmationScore = (confirmedWeight / totalWeight) * 100;

    return {
      confirmed: allRequiredMet && confirmationScore >= 60,
      score: confirmationScore,
      results,
      requiredMet: allRequiredMet,
      details: this.generateConfirmationDetails(results),
    };
  }

  checkConfirmation(name, analysis, allAnalyses) {
    switch (name) {
      case 'trend':
        return this.confirmTrend(analysis);
      case 'momentum':
        return this.confirmMomentum(analysis);
      case 'volatility':
        return this.confirmVolatility(analysis);
      case 'structure':
        return this.confirmStructure(analysis);
      case 'volume':
        return this.confirmVolume(analysis);
      default:
        return { passed: false, details: 'Unknown confirmation type' };
    }
  }

  confirmTrend(trend) {
    if (!trend) return { passed: false, details: 'No trend analysis' };
    
    const passed = trend.strength >= 50 && trend.direction !== 'NEUTRAL';
    
    return {
      passed,
      details: passed ? 
        `Strong ${trend.direction} trend (${trend.strength}%)` :
        `Weak or neutral trend (${trend.strength}%)`,
    };
  }

  confirmMomentum(momentum) {
    if (!momentum) return { passed: false, details: 'No momentum analysis' };
    
    const passed = momentum.strength >= 50;
    
    return {
      passed,
      details: passed ?
        `${momentum.signal} momentum (${momentum.strength}%)` :
        `Weak momentum (${momentum.strength}%)`,
    };
  }

  confirmVolatility(volatility) {
    if (!volatility) return { passed: false, details: 'No volatility analysis' };
    
    const passed = volatility.isTradeable;
    
    return {
      passed,
      details: passed ?
        `Tradeable volatility (${volatility.state})` :
        `Untradeable volatility (${volatility.state})`,
    };
  }

  confirmStructure(structure) {
    if (!structure) return { passed: false, details: 'No structure analysis' };
    
    const passed = structure.quality === 'HIGH';
    
    return {
      passed,
      details: passed ?
        `Clear market structure (${structure.pattern})` :
        `Unclear market structure`,
    };
  }

  confirmVolume(volume) {
    if (!volume) return { passed: false, details: 'No volume analysis' };
    
    const passed = volume.confirmsDirection !== false;
    
    return {
      passed,
      details: passed ?
        `Volume confirming direction` :
        `Volume not confirming`,
    };
  }

  generateConfirmationDetails(results) {
    const passed = Object.values(results).filter(r => r.passed).length;
    const total = Object.values(results).length;
    return `${passed}/${total} confirmations passed`;
  }
}
