import React, { useState, useEffect, useCallback } from 'react'

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#f1f5f9',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.reload()
              }}
              style={{
                padding: '12px 32px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================
// SYMBOL MAPPING (display name -> real Deriv API symbol)
// ============================================
// This is the fix: Deriv's ticks_history API does not recognize
// display names like 'VOL10' or plain forex pairs like 'EURUSD'.
// Every symbol sent to the API must be translated first.
const SYMBOL_MAP = {
  // Synthetic indices
  VOL10: 'R_10',
  VOL25: 'R_25',
  VOL50: 'R_50',
  VOL75: 'R_75',
  VOL100: 'R_100',
  CRASH500: 'CRASH500N',
  CRASH1000: 'CRASH1000N',
  BOOM500: 'BOOM500N',
  BOOM1000: 'BOOM1000N',
  JUMP10: 'JD10',
  JUMP25: 'JD25',
  JUMP50: 'JD50',
  // Forex pairs (Deriv requires the 'frx' prefix)
  EURUSD: 'frxEURUSD',
  GBPUSD: 'frxGBPUSD',
  USDJPY: 'frxUSDJPY',
  AUDUSD: 'frxAUDUSD',
  NZDUSD: 'frxNZDUSD',
  USDCAD: 'frxUSDCAD',
  EURGBP: 'frxEURGBP',
  EURJPY: 'frxEURJPY',
  GBPJPY: 'frxGBPJPY',
  USDCHF: 'frxUSDCHF',
}

function toDerivSymbol(displaySymbol) {
  return SYMBOL_MAP[displaySymbol] || displaySymbol
}

// ============================================
// DERIV SERVICE (Built-in for reliability)
// ============================================
class DerivService {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.listeners = new Map()
  }

  async connect() {
    if (this.isConnected) return

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089')

        this.ws.onopen = () => {
          this.isConnected = true
          console.log('✅ Connected to Deriv API')
          resolve()
        }

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data)

          // Surface API-level errors instead of silently resolving empty
          if (data.error) {
            console.error('Deriv API error:', data.error.message, 'for req_id:', data.req_id)
          }

          if (data.req_id && this.listeners.has(data.req_id)) {
            this.listeners.get(data.req_id).forEach(cb => cb(data))
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          this.isConnected = false
          console.log('❌ Disconnected from Deriv API')
        }

        // Timeout after 15 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'))
          }
        }, 15000)
      } catch (error) {
        reject(error)
      }
    })
  }

  send(data) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(data))
    }
  }

  addListener(id, callback) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, [])
    }
    this.listeners.get(id).push(callback)
  }

  removeListener(id, callback) {
    const listeners = this.listeners.get(id)
    if (listeners) {
      this.listeners.set(id, listeners.filter(cb => cb !== callback))
    }
  }

  // symbol passed in here MUST already be the real Deriv symbol code
  // (e.g. 'R_10', 'frxEURUSD') — translation happens in analyzeMarket
  async getCandles(symbol, timeframe, count = 100) {
    const granularityMap = {
      '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800
    }
    const granularity = granularityMap[timeframe] || 60

    return new Promise((resolve) => {
      const requestId = `${symbol}_${timeframe}_${Date.now()}`

      const handler = (data) => {
        if (data.echo_req?.ticks_history === symbol &&
            data.echo_req?.granularity === granularity) {
          this.removeListener(requestId, handler)

          if (data.error) {
            console.error(`Deriv error for ${symbol}:`, data.error.message)
            resolve([])
            return
          }

          if (data.candles && data.candles.length > 0) {
            resolve(data.candles.map(c => ({
              time: parseInt(c.epoch) * 1000,
              open: parseFloat(c.open),
              high: parseFloat(c.high),
              low: parseFloat(c.low),
              close: parseFloat(c.close),
            })))
          } else {
            resolve([])
          }
        }
      }

      this.addListener(requestId, handler)

      this.send({
        ticks_history: symbol,
        granularity: granularity,
        count: count,
        end: 'latest',
        style: 'candles',
        req_id: requestId,
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        this.removeListener(requestId, handler)
        resolve([])
      }, 10000)
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.isConnected = false
    }
  }
}

// Create singleton instance
const derivService = new DerivService()

// ============================================
// INDICATOR CALCULATIONS
// ============================================
function calculateEMA(data, period) {
  if (!data || data.length === 0) return []
  const k = 2 / (period + 1)
  const ema = [data[0]]
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50

  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period
      avgLoss = (avgLoss * (period - 1)) / period
    } else {
      avgGain = (avgGain * (period - 1)) / period
      avgLoss = (avgLoss * (period - 1) - diff) / period
    }
  }

  if (avgLoss === 0) return 100
  return 100 - (100 / (1 + avgGain / avgLoss))
}

function calculateATR(highs, lows, closes, period = 14) {
  const trs = []
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ))
  }
  return trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period
}

// ============================================
// MARKET DATA
// ============================================
const MARKETS = {
  forex: [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD',
    'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'USDCHF'
  ],
  synthetic: [
    'VOL10', 'VOL25', 'VOL50', 'VOL75', 'VOL100',
    'CRASH500', 'CRASH1000', 'BOOM500', 'BOOM1000',
    'JUMP10', 'JUMP25', 'JUMP50'
  ]
}

const ALL_MARKETS = [...MARKETS.forex, ...MARKETS.synthetic]

const TIMEFRAMES = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '30m', label: '30M' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
]

// ============================================
// ANALYZE SINGLE MARKET
// ============================================
async function analyzeMarket(symbol, timeframe) {
  try {
    // Translate the display name (e.g. 'VOL10') into the real
    // Deriv API symbol code (e.g. 'R_10') before fetching.
    const derivSymbol = toDerivSymbol(symbol)
    const candles = await derivService.getCandles(derivSymbol, timeframe, 100)

    if (!candles || candles.length < 50) {
      return null
    }

    const closes = candles.map(c => c.close)
    const highs = candles.map(c => c.high)
    const lows = candles.map(c => c.low)
    const currentPrice = closes[closes.length - 1]

    // Calculate indicators
    const ema20 = calculateEMA(closes, 20)
    const ema50 = calculateEMA(closes, 50)
    const ema200 = calculateEMA(closes, 200)
    const rsi = calculateRSI(closes)
    const atr = calculateATR(highs, lows, closes)

    const lastEMA20 = ema20[ema20.length - 1]
    const lastEMA50 = ema50[ema50.length - 1]
    const lastEMA200 = ema200[ema200.length - 1]

    // Determine trend
    let trend = 'NEUTRAL'
    let trendStrength = 0

    if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50 && lastEMA50 > lastEMA200) {
      trend = 'STRONG_BULLISH'
      trendStrength = 85
    } else if (currentPrice > lastEMA20 && lastEMA20 > lastEMA50) {
      trend = 'BULLISH'
      trendStrength = 65
    } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50 && lastEMA50 < lastEMA200) {
      trend = 'STRONG_BEARISH'
      trendStrength = 85
    } else if (currentPrice < lastEMA20 && lastEMA20 < lastEMA50) {
      trend = 'BEARISH'
      trendStrength = 65
    } else if (currentPrice > lastEMA20) {
      trend = 'WEAK_BULLISH'
      trendStrength = 45
    } else if (currentPrice < lastEMA20) {
      trend = 'WEAK_BEARISH'
      trendStrength = 45
    }

    // Determine signal
    let signal = 'NEUTRAL'
    let confidence = 0

    const isBullish = trend.includes('BULLISH')
    const isBearish = trend.includes('BEARISH')
    const rsiOk = rsi > 40 && rsi < 70

    if (isBullish && rsi > 50 && rsiOk) {
      signal = 'BUY'
      confidence = Math.min(95, trendStrength + (rsi - 50))
    } else if (isBearish && rsi < 50 && rsiOk) {
      signal = 'SELL'
      confidence = Math.min(95, trendStrength + (50 - rsi))
    } else if (isBullish) {
      signal = 'BUY'
      confidence = trendStrength * 0.8
    } else if (isBearish) {
      signal = 'SELL'
      confidence = trendStrength * 0.8
    }

    // Only return high-confidence signals
    if (confidence < 65 || signal === 'NEUTRAL') return null

    // Calculate SL and TP
    const atrValue = atr || currentPrice * 0.001
    const slDistance = atrValue * 1.5
    const tpDistance = atrValue * 2.5

    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol, // keep the display name (e.g. 'VOL10') for the UI
      direction: signal,
      confidence: Math.round(confidence),
      entry: currentPrice,
      stopLoss: signal === 'BUY' ? currentPrice - slDistance : currentPrice + slDistance,
      takeProfit: signal === 'BUY' ? currentPrice + tpDistance : currentPrice - tpDistance,
      riskReward: (tpDistance / slDistance).toFixed(2),
      trend,
      rsi: Math.round(rsi),
      atr: atrValue,
      mtfConfirmed: [],
      htfConfirmed: [],
      timestamp: Date.now(),
    }

  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error.message)
    return null
  }
}

// ============================================
// MAIN APP
// ============================================
function App() {
  const [timeframe, setTimeframe] = useState('15m')
  const [signals, setSignals] = useState([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  // Connect on mount
  useEffect(() => {
    setConnectionStatus('connecting')
    derivService.connect()
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('error'))

    return () => derivService.disconnect()
  }, [])

  // Scan all markets
  const scanMarkets = async () => {
    setScanning(true)
    setSignals([])
    setError(null)
    setProgress({ current: 0, total: ALL_MARKETS.length })

    try {
      // Ensure connection
      if (!derivService.isConnected) {
        setConnectionStatus('connecting')
        await derivService.connect()
        setConnectionStatus('connected')
      }

      const results = []

      // Scan markets in batches of 3
      for (let i = 0; i < ALL_MARKETS.length; i += 3) {
        const batch = ALL_MARKETS.slice(i, i + 3)

        const batchResults = await Promise.all(
          batch.map(symbol => analyzeMarket(symbol, timeframe))
        )

        results.push(...batchResults.filter(Boolean))
        setProgress({ current: Math.min(i + 3, ALL_MARKETS.length), total: ALL_MARKETS.length })
      }

      // Sort by confidence
      const sortedSignals = results
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 20)

      setSignals(sortedSignals)
      setLastScan(Date.now())
    } catch (err) {
      console.error('Scan failed:', err)
      setError(err.message)
      setConnectionStatus('error')
    } finally {
      setScanning(false)
    }
  }

  // Cooldown logic
  const nextScan = lastScan ? lastScan + 300000 : 0
  const cooldown = Math.max(0, Math.ceil((nextScan - Date.now()) / 1000))
  const canScan = !scanning && cooldown === 0 && connectionStatus === 'connected'

  const [, tick] = useState(0)
  useEffect(() => {
    if (!canScan && !scanning) {
      const timer = setInterval(() => tick(t => t + 1), 1000)
      return () => clearInterval(timer)
    }
  }, [canScan, scanning])

  const buySignals = signals.filter(s => s.direction === 'BUY')
  const sellSignals = signals.filter(s => s.direction === 'SELL')
  const avgConf = signals.length > 0
    ? Math.round(signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length)
    : 0

  const formatPrice = (value, symbol) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—'
    const decimals = value >= 100 ? 2 : value >= 1 ? 4 : 5
    return value.toFixed(decimals)
  }

  return (
    <ErrorBoundary>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {/* Connection Status Bar */}
        <div style={{
          padding: '6px 24px',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 500,
          background: connectionStatus === 'connected' ? '#10b98122' :
                      connectionStatus === 'connecting' ? '#f59e0b22' : '#ef444422',
          color: connectionStatus === 'connected' ? '#10b981' :
                 connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444',
          borderBottom: `1px solid ${
            connectionStatus === 'connected' ? '#10b98133' :
            connectionStatus === 'connecting' ? '#f59e0b33' : '#ef444433'
          }`
        }}>
          {connectionStatus === 'connected' && '✅ Connected to Deriv API - Real market data'}
          {connectionStatus === 'connecting' && '⏳ Connecting to Deriv API...'}
          {connectionStatus === 'error' && '❌ Connection failed - Using fallback mode'}
        </div>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 64, maxWidth: 1400, margin: '0 auto', flexWrap: 'wrap', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <div>
                <h1 style={{
                  fontSize: 22, fontWeight: 700, margin: 0,
                  background: 'linear-gradient(135deg, #60a5fa, #34d399)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                  MT5 Signal Scanner
                </h1>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Real-time Deriv API • {ALL_MARKETS.length} Markets
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, background: '#1e293b', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: timeframe === tf.value ? '#2563eb' : 'transparent',
                    color: timeframe === tf.value ? '#fff' : '#94a3b8',
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
          {/* Scan Panel */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 24
          }}>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>{timeframe} Scanner</h2>
            <p style={{ color: '#94a3b8', marginBottom: 24 }}>
              Scanning {ALL_MARKETS.length} markets via Deriv API for high-quality signals
            </p>

            <button
              onClick={scanMarkets}
              disabled={!canScan}
              style={{
                padding: '16px 48px', fontSize: 18, fontWeight: 700,
                border: 'none', borderRadius: 12, color: 'white',
                background: canScan
                  ? 'linear-gradient(135deg, #2563eb, #059669)'
                  : '#334155',
                opacity: canScan ? 1 : 0.5,
                cursor: canScan ? 'pointer' : 'not-allowed',
              }}
            >
              {scanning ? '⏳ Scanning Markets...' :
               !derivService.isConnected ? '🔄 Connect to Deriv API' :
               canScan ? '🔍 Scan All Markets Now' :
               `⏰ Next scan in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`}
            </button>

            {/* Progress */}
            {scanning && (
              <div style={{ marginTop: 16 }}>
                <div style={{ color: '#94a3b8', marginBottom: 8 }}>
                  Scanning {progress.current}/{progress.total} markets
                </div>
                <div style={{
                  height: 4, background: '#1e293b', borderRadius: 2,
                  maxWidth: 400, margin: '0 auto', overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #2563eb, #059669)',
                    borderRadius: 2,
                    width: `${(progress.current / progress.total) * 100}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                marginTop: 16, padding: 12,
                background: '#ef444411', border: '1px solid #ef444433',
                borderRadius: 8, color: '#ef4444'
              }}>
                Error: {error}
                <button onClick={scanMarkets} style={{
                  marginLeft: 12, padding: '6px 16px',
                  background: '#2563eb', color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer'
                }}>
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          {!scanning && signals.length > 0 && (
            <div>
              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12, marginBottom: 24
              }}>
                {[
                  { label: 'Total', value: signals.length, color: '#3b82f6' },
                  { label: 'Buy', value: buySignals.length, color: '#10b981' },
                  { label: 'Sell', value: sellSignals.length, color: '#ef4444' },
                  { label: 'Avg Confidence', value: `${avgConf}%`, color: '#8b5cf6' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Signal Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 16
              }}>
                {signals.map(sig => {
                  const isBuy = sig.direction === 'BUY'
                  const confColor = sig.confidence >= 85 ? '#10b981' :
                                     sig.confidence >= 70 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={sig.id} style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: `1px solid ${isBuy ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: 16,
                      padding: 24
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 20, fontWeight: 700 }}>{sig.symbol}</span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 20,
                          background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          border: `1px solid ${isBuy ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                          color: isBuy ? '#10b981' : '#ef4444',
                          fontWeight: 700, fontSize: 13
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: isBuy ? '#10b981' : '#ef4444'
                          }} />
                          {sig.direction}
                        </span>
                      </div>

                      <div style={{
                        background: 'rgba(15,23,42,0.6)', borderRadius: 12,
                        padding: '20px 16px', textAlign: 'center', marginBottom: 16
                      }}>
                        <div style={{ fontSize: 36, fontWeight: 800, color: confColor }}>
                          {sig.confidence}%
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                          Confidence
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', color: '#94a3b8' }}>
                        <span>Entry</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                          {formatPrice(sig.entry, sig.symbol)}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px', margin: '8px 0', borderRadius: 10,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)'
                      }}>
                        <span style={{ color: '#ef4444' }}>🛑 Stop Loss</span>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                          {formatPrice(sig.stopLoss, sig.symbol)}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px', margin: '8px 0', borderRadius: 10,
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)'
                      }}>
                        <span style={{ color: '#10b981' }}>🎯 Take Profit</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>
                          {formatPrice(sig.takeProfit, sig.symbol)}
                        </span>
                      </div>

                      <div style={{ textAlign: 'center', color: '#8b5cf6', fontWeight: 700, marginTop: 12 }}>
                        R:R 1:{sig.riskReward}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!scanning && signals.length === 0 && lastScan && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
              No high-confidence signals found on the last scan. Try again after the cooldown.
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
   
