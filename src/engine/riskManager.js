export class RiskManager {
  constructor(config = {}) {
    this.config = {
      maxRiskPerTrade: 2, // 2% of account
      maxDailyRisk: 6,    // 6% daily max
      maxOpenTrades: 5,
      minRiskRewardRatio: 1.5,
      maxCorrelationExposure: 3,
      ...config,
    };

    this.openTrades = [];
    this.dailyPnL = 0;
    this.dailyRiskUsed = 0;
  }

  canOpenTrade(trade, accountBalance) {
    // Check number of open trades
    if (this.openTrades.length >= this.config.maxOpenTrades) {
      return { allowed: false, reason: 'Maximum open trades reached' };
    }

    // Check risk per trade
    const riskAmount = Math.abs(trade.entry - trade.stopLoss) * trade.positionSize;
    const riskPercent = (riskAmount / accountBalance) * 100;

    if (riskPercent > this.config.maxRiskPerTrade) {
      return { allowed: false, reason: `Risk per trade (${riskPercent.toFixed(1)}%) exceeds maximum (${this.config.maxRiskPerTrade}%)` };
    }

    // Check daily risk
    if ((this.dailyRiskUsed + riskPercent) > this.config.maxDailyRisk) {
      return { allowed: false, reason: 'Daily risk limit would be exceeded' };
    }

    // Check risk/reward ratio
    const reward = Math.abs(trade.takeProfit - trade.entry);
    const rr = reward / riskAmount;

    if (rr < this.config.minRiskRewardRatio) {
      return { allowed: false, reason: `Risk/Reward ratio (1:${rr.toFixed(2)}) below minimum (1:${this.config.minRiskRewardRatio})` };
    }

    // Check correlation exposure
    const correlatedTrades = this.getCorrelatedTrades(trade.symbol);
    if (correlatedTrades.length >= this.config.maxCorrelationExposure) {
      return { allowed: false, reason: 'Maximum correlation exposure reached' };
    }

    return { allowed: true };
  }

  addTrade(trade) {
    this.openTrades.push({
      ...trade,
      openedAt: Date.now(),
      riskAmount: Math.abs(trade.entry - trade.stopLoss) * trade.positionSize,
    });

    this.dailyRiskUsed += (trade.riskAmount / trade.accountBalance) * 100;
  }

  closeTrade(tradeId, exitPrice, pnl) {
    const tradeIndex = this.openTrades.findIndex(t => t.id === tradeId);
    
    if (tradeIndex !== -1) {
      const trade = this.openTrades[tradeIndex];
      this.openTrades.splice(tradeIndex, 1);
      this.dailyPnL += pnl;
      
      return {
        trade,
        pnl,
        holdingPeriod: Date.now() - trade.openedAt,
        win: pnl > 0,
      };
    }

    return null;
  }

  getCorrelatedTrades(symbol) {
    const correlationGroups = {
      'EURUSD': ['GBPUSD', 'EURGBP', 'EURJPY'],
      'GBPUSD': ['EURUSD', 'EURGBP', 'GBPJPY'],
      'USDJPY': ['EURJPY', 'GBPJPY', 'AUDJPY'],
    };

    const correlatedSymbols = correlationGroups[symbol] || [];
    return this.openTrades.filter(t => correlatedSymbols.includes(t.symbol));
  }

  calculatePositionSize(accountBalance, riskPercent, stopLossPips, pipValue = 10) {
    const riskAmount = accountBalance * (riskPercent / 100);
    return riskAmount / (stopLossPips * pipValue);
  }

  getDailyStats() {
    return {
      openTrades: this.openTrades.length,
      dailyPnL: this.dailyPnL,
      dailyRiskUsed: this.dailyRiskUsed,
      remainingRisk: this.config.maxDailyRisk - this.dailyRiskUsed,
      remainingTrades: this.config.maxOpenTrades - this.openTrades.length,
    };
  }

  resetDaily() {
    this.dailyPnL = 0;
    this.dailyRiskUsed = 0;
  }
                                                                  }
