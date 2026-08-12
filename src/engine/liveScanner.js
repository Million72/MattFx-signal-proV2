import { derivService } from '../services/deriv.js'
import { runFactorVotes, classifyStatus } from '../shared/factorVotes.js'
import { calculateTpSlLadder, distanceToPips } from '../shared/tpSlCalculator.js'
import { analyzeTrend } from '../forex/analysis/trendAnalysis.js'
import { marketCategory } from '../constants/markets.js'
import { genId } from '../utils/helpers.js'

/**
 * Scans a single symbol and returns a full snapshot regardless of
 * whether it qualifies for a directional call — WAIT symbols are still
 * returned so the dashboard can show every market live, matching a
 * real scanner's "27 live" behavior.
 */
export async function scanMarketSnapshot(symbol, timeframe) {
  const { candles, error } = await derivService.getCandles(symbol, timeframe, 150)

  if (error || !candles || candles.length < 60) {
    return {
      id: genId('snap'),
      symbol,
      market: marketCategory(symbol),
      timeframe,
      status: 'WAIT',
      error: error || 'insufficient_data',
      price: null,
      timestamp: Date.now()
    }
  }

  const opens = candles.map((c) => c.open)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)
  const price = closes[closes.length - 1]

  const factorResult = runFactorVotes({ opens, highs, lows, closes })
  const { status, confluence } = classifyStatus(factorResult)

  // HTF bias + structure badge (HH/HL vs LH/LL), for display badges
  const trend = analyzeTrend(highs, lows, closes)
  const htfBadge = trend.finalBias === 'BULLISH' ? 'HTF BULL' : trend.finalBias === 'BEARISH' ? 'HTF BEAR' : 'HTF FLAT'
  const structureBadge = factorResult.structureBias === 'BULLISH' ? 'HH/HL' : factorResult.structureBias === 'BEARISH' ? 'LH/LL' : null

  let ladder = null
  let pips = null
  let riskReward = null

  if (status !== 'WAIT') {
    const direction = status
    ladder = calculateTpSlLadder({ entry: price, direction, atr: factorResult.atr })
    riskReward = ladder.riskReward
    pips = marketCategory(symbol) === 'forex'
      ? distanceToPips(ladder.slDistance, symbol)
      : Number(ladder.slDistance.toFixed(2)) // synthetic: raw index points
  }

  return {
    id: genId('snap'),
    symbol,
    market: marketCategory(symbol),
    timeframe,
    status,
    direction: status !== 'WAIT' ? status : null,
    price,
    confluence,
    bullVotes: factorResult.bullVotes,
    bearVotes: factorResult.bearVotes,
    totalFactors: factorResult.totalFactors,
    directionalTotal: factorResult.directionalTotal,
    votes: factorResult.votes,
    paPatternsCount: factorResult.paPatternsCount,
    chartPatternsCount: factorResult.chartPatternsCount,
    rsi: factorResult.rsi,
    atr: factorResult.atr,
    adx: factorResult.adx,
    macdDirection: factorResult.macdDirection,
    htfBadge,
    structureBadge,
    entry: price,
    stopLoss: ladder?.stopLoss ?? null,
    takeProfit1: ladder?.takeProfit1 ?? null,
    takeProfit2: ladder?.takeProfit2 ?? null,
    riskReward,
    pips,
    timestamp: Date.now()
  }
}

export async function scanAllMarketsLive(symbols, timeframe, { onProgress, batchSize = 4 } = {}) {
  const results = []
  let completed = 0

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((symbol) => scanMarketSnapshot(symbol, timeframe).catch((err) => ({
        id: genId('snap'),
        symbol,
        market: marketCategory(symbol),
        timeframe,
        status: 'WAIT',
        error: err.message,
        price: null,
        timestamp: Date.now()
      })))
    )
    results.push(...batchResults)
    completed += batch.length
    if (typeof onProgress === 'function') {
      onProgress({ current: Math.min(completed, symbols.length), total: symbols.length })
    }
  }

  // BUY/SELL first (highest confluence first), WAIT last
  return results.sort((a, b) => {
    if (a.status === 'WAIT' && b.status !== 'WAIT') return 1
    if (a.status !== 'WAIT' && b.status === 'WAIT') return -1
    return (b.confluence || 0) - (a.confluence || 0)
  })
}
