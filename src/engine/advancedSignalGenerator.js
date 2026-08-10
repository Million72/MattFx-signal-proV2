// src/engine/advancedSignalGenerator.js
import { MultiTimeframeAnalyzer } from './multiTimeframeAnalyzer';
import { SignalValidator } from '../shared/signalValidator';
import { ConfidenceScore } from '../shared/confidenceScore';
import { RiskRewardCalculator } from '../shared/riskReward';

export class AdvancedSignalGenerator {
  constructor(config = {}) {
    this.config = {
      minConfidenceThreshold: 75,
      minTimeframeConfluence: 3,
      requireMTFConfirmation: true,
      requireHTFAlignment: true,
      maxSignalsPerHour: 5,
      ...config
    };
    
    this.recentSignals = [];
    this.signalCooldown = new Map();
  }

  async generateSignal(marketData, selectedTimeframe, marketType) {
    // Step 1: Multi-timeframe analysis
    const mtfAnalyzer = new MultiTimeframeAnalyzer(marketData, selectedTimeframe);
    const mtfResults = await mtfAnalyzer.analyze();

    // Step 2: Check if overall analysis is high quality
    if (!mtfResults.overall.isHighQuality) {
      return this.createNoSignalResult('LOW_QUALITY_ANALYSIS', mtfResults);
    }

    // Step 3: Validate signal with strict criteria
    const validator = new SignalValidator();
    const validationResult = await validator.validate({
      mtfResults,
      marketType,
      selectedTimeframe,
      config: this.config
    });

    if (!validationResult.isValid) {
      return this.createNoSignalResult(validationResult.reason, mtfResults);
    }

    // Step 4: Calculate confidence score
    const confidenceCalculator = new ConfidenceScore();
    const confidenceScore = await confidenceCalculator.calculate({
      mtfResults,
      validationResult,
      marketType,
      selectedTimeframe
    });

    if (confidenceScore.score < this.config.minConfidenceThreshold) {
      return this.createNoSignalResult('LOW_CONFIDENCE', mtfResults, confidenceScore);
    }

    // Step 5: Calculate entry, TP, and SL
    const riskRewardCalculator = new RiskRewardCalculator();
    const tradeSetup = await riskRewardCalculator.calculate({
      direction: mtfResults.overall.direction,
      marketData: marketData[selectedTimeframe],
      mtfResults,
      confidenceScore
    });

    // Step 6: Check signal cooldown
    if (this.isInCooldown(marketData.symbol, selectedTimeframe)) {
      return this.createNoSignalResult('COOLDOWN_ACTIVE', mtfResults, confidenceScore);
    }

    // Step 7: Generate final signal
    const signal = this.buildFinalSignal({
      mtfResults,
      validationResult,
      confidenceScore,
      tradeSetup,
      selectedTimeframe,
      marketType
    });

    // Step 8: Update cooldown
    this.setCooldown(marketData.symbol, selectedTimeframe);
    this.recentSignals.push(signal);

    return signal;
  }

  buildFinalSignal(data) {
    const { mtfResults, confidenceScore, tradeSetup, selectedTimeframe } = data;

    return {
      id: this.generateSignalId(),
      timestamp: Date.now(),
      symbol: tradeSetup.symbol,
      direction: mtfResults.overall.direction,
      entry: tradeSetup.entry,
      stopLoss: tradeSetup.stopLoss,
      takeProfits: tradeSetup.takeProfits,
      riskRewardRatio: tradeSetup.riskReward,
      positionSize: tradeSetup.positionSize,
      confidence: confidenceScore.score,
      quality: confidenceScore.grade,
      
      // Multi-timeframe analysis
      multiTimeframe: {
        selected: selectedTimeframe,
        ltfConfluence: mtfResults.ltf.aggregated.signal === mtfResults.overall.direction,
        mtfConfluence: mtfResults.mtf.aggregated.signal === mtfResults.overall.direction,
        htfAlignment: mtfResults.htf.aggregated.signal === mtfResults.overall.direction,
        confluenceCount: mtfResults.overall.confluence.length
      },
      
      // Signal components
      components: {
        trendStrength: mtfResults.current.individual[selectedTimeframe].trend.strength,
        momentum: mtfResults.current.individual[selectedTimeframe].momentum.overallMomentum,
        volatility: mtfResults.current.individual[selectedTimeframe].volatility.regime,
        priceAction: mtfResults.current.individual[selectedTimeframe].priceAction.marketStructure
      },
      
      // Risk management
      risk: {
        riskPercentage: tradeSetup.riskPercentage,
        maxLoss: tradeSetup.maxLoss,
        riskRewardRatio: tradeSetup.riskReward,
        volatility: tradeSetup.volatility
      },
      
      // Metadata
      metadata: {
        generatedBy: 'Advanced MTF Signal System',
        version: '3.0.0',
        validationChecks: data.validationResult.checks,
        timeframeMatrix: this.buildTimeframeMatrix(mtfResults)
      }
    };
  }

  buildTimeframeMatrix(mtfResults) {
    const matrix = [];
    
    for (const [group, data] of Object.entries(mtfResults)) {
      if (group === 'overall' || !data.individual) continue;
      
      for (const [tf, analysis] of Object.entries(data.individual)) {
        matrix.push({
          timeframe: tf,
          group: group,
          direction: analysis.signal,
          strength: analysis.strength,
          trend: analysis.trend?.direction,
          momentum: analysis.momentum?.overallMomentum
        });
      }
    }
    
    return matrix;
  }

  createNoSignalResult(reason, mtfResults = null, confidenceScore = null) {
    return {
      id: this.generateSignalId(),
      timestamp: Date.now(),
      type: 'NO_SIGNAL',
      reason: reason,
      mtfResults: mtfResults?.overall,
      confidence: confidenceScore?.score,
      message: this.getNoSignalMessage(reason)
    };
  }

  getNoSignalMessage(reason) {
    const messages = {
      'LOW_QUALITY_ANALYSIS': 'Insufficient multi-timeframe confluence for a high-quality signal',
      'LOW_CONFIDENCE': 'Signal confidence below minimum threshold',
      'COOLDOWN_ACTIVE': 'Signal cooldown period active to prevent overtrading',
      'TREND_CONFLICT': 'HTF trend conflicts with LTF setup',
      'LOW_VOLATILITY': 'Market volatility too low for profitable setup',
      'HIGH_SPREAD': 'Current spread exceeds maximum allowed for signal',
      'MARKET_CLOSED': 'Market is currently closed',
      'INSUFFICIENT_DATA': 'Not enough historical data for analysis'
    };
    
    return messages[reason] || 'No valid signal generated';
  }

  isInCooldown(symbol, timeframe) {
    const key = `${symbol}_${timeframe}`;
    const lastSignal = this.signalCooldown.get(key);
    
    if (!lastSignal) return false;
    
    const cooldownPeriod = this.getCooldownPeriod(timeframe);
    return Date.now() - lastSignal < cooldownPeriod;
  }

  setCooldown(symbol, timeframe) {
    const key = `${symbol}_${timeframe}`;
    this.signalCooldown.set(key, Date.now());
  }

  getCooldownPeriod(timeframe) {
    const periods = {
      '1m': 60000,     // 1 minute
      '5m': 300000,    // 5 minutes
      '15m': 900000,   // 15 minutes
      '30m': 1800000,  // 30 minutes
      '1h': 3600000,   // 1 hour
      '4h': 14400000,  // 4 hours
      '1d': 86400000   // 24 hours
    };
    
    return periods[timeframe] || 300000;
  }

  generateSignalId() {
    return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
      }
