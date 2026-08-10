import { AdvancedSignalGenerator } from './advancedSignalGenerator';
import { SignalValidator } from '../shared/signalValidator';
import { ConfidenceScore } from '../shared/confidenceScore';
import { RiskRewardCalculator } from '../shared/riskReward';
import { TPSLCalculator } from '../shared/tpSlCalculator';
import { RiskManager } from './riskManager';
import { MultiTimeframeAnalyzer } from './multiTimeframeAnalyzer';
import { ForexEngine } from '../forex/forexEngine';
import { SyntheticEngine } from '../synthetic/syntheticEngine';
import { TIMEFRAME_HIERARCHY } from '../constants/timeframes';
import { FOREX_PAIRS, SYNTHETIC_INDICES } from '../constants/markets';

export class SignalManager {
  constructor(config = {}) {
    // Configuration
    this.config = {
      minConfidenceThreshold: 70,
      minTimeframeConfluence: 3,
      requireMTFConfirmation: true,
      requireHTFAlignment: true,
      maxSignalsPerHour: 20,
      signalCooldownMs: 300000, // 5 minutes
      maxActiveSignals: 15,
      maxHistorySize: 1000,
      ...config,
    };

    // Core engines
    this.signalGenerator = new AdvancedSignalGenerator(this.config);
    this.signalValidator = new SignalValidator();
    this.confidenceScore = new ConfidenceScore();
    this.riskRewardCalculator = new RiskRewardCalculator();
    this.tpSlCalculator = null;
    this.riskManager = new RiskManager({
      maxRiskPerTrade: 2,
      maxDailyRisk: 6,
      maxOpenTrades: 5,
      minRiskRewardRatio: 1.5,
    });

    // Market engines
    this.forexEngine = new ForexEngine();
    this.syntheticEngine = new SyntheticEngine();

    // Signal storage
    this.signals = {
      current: null,
      active: [],
      history: [],
      archived: [],
      performance: [],
    };

    // Tracking
    this.signalStats = this.initializeStats();
    this.signalCooldowns = new Map();
    this.signalQueue = [];
    this.isProcessing = false;
    this.lastScanTime = null;
    this.scanCount = 0;

    // Listeners
    this.listeners = new Map();
    this.eventHistory = [];

    console.log('📡 SignalManager initialized');
  }

  // ============================================
  // MAIN SCAN & SIGNAL GENERATION
  // ============================================

  async scanAllMarkets(selectedTimeframe) {
    // Check cooldown
    if (this.isInCooldown()) {
      const remaining = this.getCooldownRemaining();
      console.log(`⏰ Scan cooldown active: ${Math.ceil(remaining / 1000)}s remaining`);
      return {
        success: false,
        reason: 'COOLDOWN_ACTIVE',
        remainingMs: remaining,
        message: `Please wait ${Math.ceil(remaining / 1000)} seconds before next scan`,
      };
    }

    // Check if already scanning
    if (this.isProcessing) {
      console.log('⚠️ Scan already in progress');
      return {
        success: false,
        reason: 'SCAN_IN_PROGRESS',
        message: 'A scan is already in progress',
      };
    }

    this.isProcessing = true;
    this.scanCount++;
    const scanId = this.generateScanId();
    
    console.log(`🔍 Starting scan #${this.scanCount} (${scanId})`);
    console.log(`⏰ Timeframe: ${selectedTimeframe}`);
    this.emit('scan:started', { scanId, timeframe: selectedTimeframe });

    try {
      const allMarkets = [
        ...FOREX_PAIRS.map(s => ({ symbol: s, type: 'forex' })),
        ...SYNTHETIC_INDICES.map(s => ({ symbol: s, type: 'synthetic' })),
      ];

      const results = [];
      const errors = [];
      let processedCount = 0;

      // Process markets in batches for performance
      const batchSize = 5;
      for (let i = 0; i < allMarkets.length; i += batchSize) {
        const batch = allMarkets.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(market => 
            this.analyzeMarket(market.symbol, market.type, selectedTimeframe)
          )
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else if (result.status === 'rejected') {
            errors.push({
              symbol: batch[index].symbol,
              error: result.reason?.message || 'Unknown error',
            });
          }
        });

        processedCount += batch.length;
        
        // Emit progress
        this.emit('scan:progress', {
          scanId,
          current: processedCount,
          total: allMarkets.length,
          signalsFound: results.length,
        });
      }

      // Process and filter signals
      const validSignals = this.processScanResults(results, selectedTimeframe);

      // Update signal storage
      this.updateSignals(validSignals);

      // Update scan info
      this.lastScanTime = Date.now();
      this.setCooldown();

      // Emit completion
      this.emit('scan:completed', {
        scanId,
        totalSignals: validSignals.length,
        totalMarkets: allMarkets.length,
        errors: errors.length,
        duration: Date.now() - this.lastScanTime,
      });

      console.log(`✅ Scan complete: ${validSignals.length} signals found`);
      console.log(`❌ Errors: ${errors.length} markets failed`);

      return {
        success: true,
        scanId,
        signals: validSignals,
        stats: {
          total: validSignals.length,
          buy: validSignals.filter(s => s.direction === 'BUY').length,
          sell: validSignals.filter(s => s.direction === 'SELL').length,
          avgConfidence: validSignals.length > 0
            ? validSignals.reduce((sum, s) => sum + s.confidence, 0) / validSignals.length
            : 0,
        },
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      console.error('❌ Scan failed:', error);
      this.emit('scan:error', { scanId, error: error.message });
      
      return {
        success: false,
        reason: 'SCAN_ERROR',
        message: error.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  async analyzeMarket(symbol, type, timeframe) {
    try {
      // Get market engine
      const engine = type === 'forex' ? this.forexEngine : this.syntheticEngine;
      
      // Get candles for all required timeframes
      const hierarchy = TIMEFRAME_HIERARCHY[timeframe];
      const allTimeframes = [
        ...hierarchy.ltf,
        hierarchy.current,
        ...hierarchy.mtf,
        ...hierarchy.htf,
      ];

      const marketData = {};
      
      // Fetch candles for each timeframe
      for (const tf of allTimeframes) {
        const candles = await this.fetchCandles(symbol, tf);
        if (candles && candles.length >= 50) {
          marketData[tf] = candles;
        }
      }

      if (!marketData[timeframe]) {
        return null;
      }

      // Run full analysis
      const analysis = await engine.analyze(
        marketData[timeframe],
        timeframe,
        symbol
      );

      if (!analysis) return null;

      // Multi-timeframe analysis
      const mtfAnalyzer = new MultiTimeframeAnalyzer(marketData, timeframe);
      const mtfResults = await mtfAnalyzer.analyze();

      // Generate signal if analysis is valid
      if (analysis.signal && analysis.signal !== 'NEUTRAL') {
        return this.generateSignal(symbol, type, timeframe, analysis, mtfResults);
      }

      return null;

    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  async generateSignal(symbol, type, timeframe, analysis, mtfResults) {
    // Validate signal
    const validation = this.signalValidator.validate({
      direction: analysis.signal,
      analysis,
      mtfResults,
      type,
      timeframe,
    });

    if (!validation.isValid) {
      return null;
    }

    // Calculate confidence
    const confidence = this.confidenceScore.calculate({
      analysis,
      mtfResults,
      validation,
      type,
    });

    if (confidence.score < this.config.minConfidenceThreshold) {
      return null;
    }

    // Calculate entry, SL, TP
    const currentPrice = analysis.currentPrice;
    const atr = analysis.volatility?.atr || currentPrice * 0.001;
    
    this.tpSlCalculator = new TPSLCalculator(atr, currentPrice);
    
    const tradeSetup = analysis.signal === 'BUY'
      ? this.tpSlCalculator.calculateForBuy()
      : this.tpSlCalculator.calculateForSell();

    // Calculate risk/reward
    const riskReward = this.riskRewardCalculator.calculate(
      tradeSetup.entry,
      tradeSetup.stopLoss,
      tradeSetup.takeProfits[0].price
    );

    // Build signal object
    const signal = {
      id: this.generateSignalId(),
      symbol,
      type,
      direction: analysis.signal === 'BUY' ? 'BUY' : 'SELL',
      timeframe,
      timestamp: Date.now(),
      
      // Price levels
      entry: tradeSetup.entry,
      stopLoss: tradeSetup.stopLoss,
      takeProfit: tradeSetup.takeProfits[0].price,
      takeProfits: tradeSetup.takeProfits,
      
      // Analysis results
      confidence: confidence.score,
      grade: confidence.grade,
      riskReward: riskReward.ratio,
      riskPips: tradeSetup.riskPips,
      
      // Market analysis
      trend: analysis.trend?.direction,
      trendStrength: analysis.trend?.strength,
      momentum: analysis.momentum?.signal,
      rsi: analysis.momentum?.rsi14,
      volatility: analysis.volatility?.state,
      
      // Multi-timeframe
      mtfConfirmed: this.getConfirmingTimeframes(mtfResults, analysis.signal, 'mtf'),
      htfConfirmed: this.getConfirmingTimeframes(mtfResults, analysis.signal, 'htf'),
      mtfConfluence: mtfResults.overall?.confluence?.length || 0,
      
      // Price action
      structure: analysis.structure?.pattern,
      bos: analysis.bos?.recent,
      choch: analysis.choch?.recent,
      candlePattern: analysis.candlePatterns?.strongest?.name,
      
      // Risk management
      positionSize: this.riskManager.calculatePositionSize(
        10000, // Default account size
        2,     // Default risk %
        tradeSetup.riskPips
      ),
      
      // Metadata
      quality: this.getSignalQuality(confidence),
      expiresAt: Date.now() + (this.config.signalCooldownMs * 2),
      status: 'ACTIVE',
    };

    return signal;
  }

  // ============================================
  // SIGNAL MANAGEMENT
  // ============================================

  processScanResults(results, timeframe) {
    // Filter out null results
    const validResults = results.filter(r => r !== null);

    // Remove duplicates (same symbol, same direction)
    const uniqueSignals = this.removeDuplicateSignals(validResults);

    // Sort by confidence
    const sortedSignals = uniqueSignals.sort((a, b) => b.confidence - a.confidence);

    // Limit signals
    const limitedSignals = sortedSignals.slice(0, this.config.maxActiveSignals);

    return limitedSignals;
  }

  updateSignals(newSignals) {
    // Archive current signals
    if (this.signals.current) {
      this.signals.history.push({
        ...this.signals.current,
        archivedAt: Date.now(),
      });
    }

    // Update current signals
    this.signals.current = newSignals;
    this.signals.active = newSignals.filter(s => s.status === 'ACTIVE');

    // Trim history
    if (this.signals.history.length > this.config.maxHistorySize) {
      this.signals.history = this.signals.history.slice(-this.config.maxHistorySize);
    }

    // Update stats
    this.updateSignalStats(newSignals);

    // Emit update
    this.emit('signals:updated', {
      current: this.signals.current,
      active: this.signals.active,
      stats: this.signalStats,
    });
  }

  closeSignal(signalId, reason, exitPrice = null) {
    const signalIndex = this.signals.active.findIndex(s => s.id === signalId);
    
    if (signalIndex === -1) {
      console.warn(`Signal ${signalId} not found`);
      return null;
    }

    const signal = this.signals.active[signalIndex];
    
    // Update signal
    signal.status = 'CLOSED';
    signal.closedAt = Date.now();
    signal.closeReason = reason;
    signal.exitPrice = exitPrice;

    // Calculate P&L if exit price provided
    if (exitPrice) {
      signal.pnl = this.calculatePnL(signal, exitPrice);
      signal.result = signal.pnl > 0 ? 'WIN' : signal.pnl < 0 ? 'LOSS' : 'BREAKEVEN';
    }

    // Move to history
    this.signals.history.push(signal);
    this.signals.active.splice(signalIndex, 1);
    
    // Update performance
    if (signal.result) {
      this.signals.performance.push({
        signalId,
        symbol: signal.symbol,
        direction: signal.direction,
        result: signal.result,
        pnl: signal.pnl,
        confidence: signal.confidence,
        timestamp: signal.closedAt,
      });
    }

    // Emit event
    this.emit('signal:closed', {
      signalId,
      reason,
      exitPrice,
      pnl: signal.pnl,
      result: signal.result,
    });

    return signal;
  }

  updateSignalStatus(signalId, currentPrice) {
    const signal = this.signals.active.find(s => s.id === signalId);
    if (!signal) return;

    // Check if TP hit
    if (signal.direction === 'BUY') {
      if (currentPrice >= signal.takeProfit) {
        this.closeSignal(signalId, 'TP_HIT', currentPrice);
        return;
      }
    } else {
      if (currentPrice <= signal.takeProfit) {
        this.closeSignal(signalId, 'TP_HIT', currentPrice);
        return;
      }
    }

    // Check if SL hit
    if (signal.direction === 'BUY') {
      if (currentPrice <= signal.stopLoss) {
        this.closeSignal(signalId, 'SL_HIT', currentPrice);
        return;
      }
    } else {
      if (currentPrice >= signal.stopLoss) {
        this.closeSignal(signalId, 'SL_HIT', currentPrice);
        return;
      }
    }

    // Check expiry
    if (Date.now() > signal.expiresAt) {
      this.closeSignal(signalId, 'EXPIRED', currentPrice);
    }
  }

  // ============================================
  // PERFORMANCE & STATISTICS
  // ============================================

  getPerformanceReport() {
    const closedTrades = this.signals.performance;
    
    if (closedTrades.length === 0) {
      return this.getEmptyPerformanceReport();
    }

    const wins = closedTrades.filter(t => t.result === 'WIN');
    const losses = closedTrades.filter(t => t.result === 'LOSS');
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossProfit = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

    return {
      totalTrades: closedTrades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate: (wins.length / closedTrades.length) * 100,
      
      totalPnL,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit,
      
      averageWin: wins.length > 0 ? grossProfit / wins.length : 0,
      averageLoss: losses.length > 0 ? grossLoss / losses.length : 0,
      
      largestWin: Math.max(...wins.map(t => t.pnl || 0), 0),
      largestLoss: Math.min(...losses.map(t => t.pnl || 0), 0),
      
      sharpeRatio: this.calculateSharpeRatio(closedTrades),
      maxDrawdown: this.calculateMaxDrawdown(closedTrades),
      
      consecutiveWins: this.calculateConsecutiveWins(closedTrades),
      consecutiveLosses: this.calculateConsecutiveLosses(closedTrades),
      
      avgConfidenceWins: wins.length > 0 
        ? wins.reduce((sum, t) => sum + (t.confidence || 0), 0) / wins.length 
        : 0,
      avgConfidenceLosses: losses.length > 0 
        ? losses.reduce((sum, t) => sum + (t.confidence || 0), 0) / losses.length 
        : 0,
      
      expectancy: this.calculateExpectancy(closedTrades),
      systemQuality: this.calculateSystemQuality(closedTrades),
    };
  }

  calculateSharpeRatio(trades) {
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => t.pnl || 0);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252);
  }

  calculateMaxDrawdown(trades) {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of trades) {
      runningPnL += trade.pnl || 0;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return maxDrawdown;
  }

  calculateConsecutiveWins(trades) {
    let maxStreak = 0;
    let currentStreak = 0;

    for (const trade of trades) {
      if (trade.result === 'WIN') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }

  calculateConsecutiveLosses(trades) {
    let maxStreak = 0;
    let currentStreak = 0;

    for (const trade of trades) {
      if (trade.result === 'LOSS') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }

  calculateExpectancy(trades) {
    if (trades.length === 0) return 0;
    
    const wins = trades.filter(t => t.result === 'WIN');
    const losses = trades.filter(t => t.result === 'LOSS');
    
    const avgWin = wins.length > 0 
      ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length 
      : 0;
    const avgLoss = losses.length > 0 
      ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0)) / losses.length 
      : 0;
    
    const winRate = wins.length / trades.length;
    const lossRate = losses.length / trades.length;
    
    return (winRate * avgWin) - (lossRate * avgLoss);
  }

  calculateSystemQuality(trades) {
    const winRate = trades.filter(t => t.result === 'WIN').length / trades.length;
    const profitFactor = this.calculateProfitFactor(trades);
    const sharpeRatio = this.calculateSharpeRatio(trades);
    
    const qualityScore = (winRate * 40) + (Math.min(profitFactor, 3) / 3 * 40) + (Math.min(sharpeRatio, 3) / 3 * 20);
    
    return {
      score: qualityScore,
      grade: qualityScore >= 80 ? 'A' : qualityScore >= 60 ? 'B' : qualityScore >= 40 ? 'C' : 'D',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async fetchCandles(symbol, timeframe) {
    try {
      const derivService = (await import('../services/deriv')).derivService;
      return await derivService.getCandles(symbol, timeframe, 100);
    } catch (error) {
      console.error(`Failed to fetch candles for ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  getConfirmingTimeframes(mtfResults, signal, group) {
    if (!mtfResults?.[group]?.individual) return [];
    
    return Object.entries(mtfResults[group].individual)
      .filter(([_, analysis]) => analysis?.signal === signal)
      .map(([tf]) => tf);
  }

  removeDuplicateSignals(signals) {
    const seen = new Map();
    
    return signals.filter(signal => {
      const key = `${signal.symbol}_${signal.direction}`;
      if (seen.has(key)) {
        // Keep the one with higher confidence
        const existing = seen.get(key);
        if (signal.confidence > existing.confidence) {
          seen.set(key, signal);
          return true;
        }
        return false;
      }
      seen.set(key, signal);
      return true;
    });
  }

  calculatePnL(signal, exitPrice) {
    const pipValue = signal.type === 'forex' ? 10 : 1;
    
    if (signal.direction === 'BUY') {
      return (exitPrice - signal.entry) * signal.positionSize * pipValue;
    } else {
      return (signal.entry - exitPrice) * signal.positionSize * pipValue;
    }
  }

  getSignalQuality(confidence) {
    if (confidence.score >= 95) return 'A+';
    if (confidence.score >= 90) return 'A';
    if (confidence.score >= 85) return 'A-';
    if (confidence.score >= 80) return 'B+';
    if (confidence.score >= 75) return 'B';
    if (confidence.score >= 70) return 'B-';
    if (confidence.score >= 65) return 'C+';
    if (confidence.score >= 60) return 'C';
    return 'D';
  }

  // ============================================
  // COOLDOWN MANAGEMENT
  // ============================================

  isInCooldown() {
    if (!this.lastScanTime) return false;
    return Date.now() - this.lastScanTime < this.config.signalCooldownMs;
  }

  getCooldownRemaining() {
    if (!this.lastScanTime) return 0;
    const elapsed = Date.now() - this.lastScanTime;
    return Math.max(0, this.config.signalCooldownMs - elapsed);
  }

  setCooldown() {
    this.lastScanTime = Date.now();
  }

  // ============================================
  // EVENT SYSTEM
  // ============================================

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        this.listeners.set(event, listeners.filter(cb => cb !== callback));
      }
    };
  }

  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    });

    // Add to event history
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now(),
    });

    // Trim event history
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  generateScanId() {
    return `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSignalId() {
    return `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initializeStats() {
    return {
      totalSignalsGenerated: 0,
      totalScans: 0,
      avgSignalsPerScan: 0,
      bestSymbol: null,
      bestConfidence: 0,
      lastUpdated: null,
    };
  }

  updateSignalStats(newSignals) {
    this.signalStats.totalSignalsGenerated += newSignals.length;
    this.signalStats.totalScans = this.scanCount;
    this.signalStats.avgSignalsPerScan = 
      this.signalStats.totalSignalsGenerated / Math.max(1, this.scanCount);
    this.signalStats.lastUpdated = Date.now();

    // Track best signal
    const bestSignal = newSignals.sort((a, b) => b.confidence - a.confidence)[0];
    if (bestSignal && bestSignal.confidence > this.signalStats.bestConfidence) {
      this.signalStats.bestSymbol = bestSignal.symbol;
      this.signalStats.bestConfidence = bestSignal.confidence;
    }
  }

  getEmptyPerformanceReport() {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgConfidenceWins: 0,
      avgConfidenceLosses: 0,
      expectancy: 0,
      systemQuality: { score: 0, grade: 'N/A' },
    };
  }

  // ============================================
  // CLEANUP
  // ============================================

  reset() {
    this.signals = {
      current: null,
      active: [],
      history: [],
      archived: [],
      performance: [],
    };
    this.signalStats = this.initializeStats();
    this.signalCooldowns.clear();
    this.signalQueue = [];
    this.isProcessing = false;
    this.lastScanTime = null;
    this.scanCount = 0;
    this.eventHistory = [];
    
    console.log('🔄 SignalManager reset');
    this.emit('reset', { timestamp: Date.now() });
  }

  destroy() {
    this.reset();
    this.listeners.clear();
    console.log('💀 SignalManager destroyed');
  }
}

// Export singleton instance
export const signalManager = new SignalManager();

export default SignalManager;
