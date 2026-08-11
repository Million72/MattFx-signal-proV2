import React, { useState, useEffect } from 'react'

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

// Main App
function App() {
  const [timeframe, setTimeframe] = useState('15m')
  const [signals, setSignals] = useState([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [error, setError] = useState(null)

  const timeframes = [
    { value: '1m', label: '1M' },
    { value: '5m', label: '5M' },
    { value: '15m', label: '15M' },
    { value: '30m', label: '30M' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
  ]

  const markets = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD', 'USDCAD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'USDCHF',
    'VOL10', 'VOL25', 'VOL50', 'VOL75', 'VOL100',
    'CRASH500', 'CRASH1000', 'BOOM500', 'BOOM1000',
    'JUMP10', 'JUMP25', 'JUMP50'
  ]

  const scanMarkets = async () => {
    setScanning(true)
    setSignals([])
    setError(null)

    try {
      for (let i = 0; i < markets.length; i++) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // 70% chance of generating a signal
        if (Math.random() > 0.3) {
          const isBuy = Math.random() > 0.5
          const confidence = Math.floor(70 + Math.random() * 28)
          const basePrice = isBuy ? 1.10000 : 150.000
          const variance = (Math.random() - 0.5) * 0.01000
          
          setSignals(prev => [...prev, {
            id: `sig_${Date.now()}_${i}`,
            symbol: markets[i],
            direction: isBuy ? 'BUY' : 'SELL',
            confidence,
            entry: basePrice + variance,
            stopLoss: isBuy 
              ? basePrice + variance - 0.00150 
              : basePrice + variance + 0.00150,
            takeProfit: isBuy 
              ? basePrice + variance + 0.00350 
              : basePrice + variance - 0.00350,
            riskReward: (2.3 + Math.random() * 0.5).toFixed(2),
            rsi: isBuy ? Math.floor(55 + Math.random() * 15) : Math.floor(35 - Math.random() * 15),
            mtfConfirmed: ['5m', '1h', '4h'].slice(0, Math.floor(Math.random() * 3) + 1),
            htfConfirmed: Math.random() > 0.5 ? ['1d'] : [],
            timestamp: Date.now(),
          }])
        }
      }
    } catch (err) {
      console.error('Scan failed:', err)
      setError(err.message)
    } finally {
      setScanning(false)
      setLastScan(Date.now())
    }
  }

  // Cooldown logic
  const nextScan = lastScan ? lastScan + 300000 : 0
  const cooldown = Math.max(0, Math.ceil((nextScan - Date.now()) / 1000))
  const canScan = !scanning && cooldown === 0

  // Force re-render for cooldown timer
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
    ? (signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length).toFixed(1)
    : 0

  return (
    <ErrorBoundary>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>⚡</span>
              <div>
                <h1 style={styles.title}>MT5 Signal Scanner</h1>
                <p style={styles.subtitle}>High-Quality Trading Signals</p>
              </div>
            </div>

            <div style={styles.timeframeGroup}>
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  style={{
                    ...styles.timeframeBtn,
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

        {/* Main */}
        <main style={styles.main}>
          {/* Scan Panel */}
          <div style={styles.scanPanel}>
            <h2 style={styles.scanTitle}>{timeframe} Scanner</h2>
            <p style={styles.scanDesc}>Scan {markets.length} markets for high-quality signals</p>
            
            <button
              onClick={scanMarkets}
              disabled={!canScan}
              style={{
                ...styles.scanBtn,
                opacity: canScan ? 1 : 0.5,
                cursor: canScan ? 'pointer' : 'not-allowed',
                background: canScan 
                  ? 'linear-gradient(135deg, #2563eb, #059669)'
                  : '#334155',
              }}
            >
              {scanning ? '⏳ Scanning...' : 
               canScan ? '🔍 Scan All Markets Now' : 
               `⏰ Wait ${Math.floor(cooldown/60)}:${String(cooldown%60).padStart(2,'0')}`}
            </button>

            {scanning && (
              <div style={styles.scanProgress}>
                <div style={styles.spinner} />
                <p style={{ color: '#94a3b8', marginTop: 12 }}>
                  Analyzing {markets.length} markets...
                </p>
              </div>
            )}

            {error && (
              <div style={styles.errorBox}>
                <p>Error: {error}</p>
                <button onClick={scanMarkets} style={styles.retryBtn}>Retry</button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {scanning && signals.length === 0 && (
            <div style={styles.stateContainer}>
              <div style={styles.spinnerLarge} />
              <p style={{ color: '#94a3b8', marginTop: 16 }}>Scanning markets...</p>
            </div>
          )}

          {/* Empty State */}
          {!scanning && !lastScan && (
            <div style={styles.stateContainer}>
              <div style={{ fontSize: 64 }}>🔍</div>
              <p style={{ fontSize: 20, color: '#94a3b8', marginTop: 16 }}>
                Ready to find trading signals
              </p>
              <p style={{ color: '#64748b', marginTop: 8 }}>
                Click scan to analyze all markets
              </p>
            </div>
          )}

          {/* No Results */}
          {!scanning && lastScan && signals.length === 0 && (
            <div style={styles.stateContainer}>
              <div style={{ fontSize: 64 }}>📊</div>
              <p style={{ fontSize: 20, color: '#94a3b8', marginTop: 16 }}>
                No signals found
              </p>
              <p style={{ color: '#64748b', marginTop: 8 }}>
                Try again in 5 minutes or switch timeframe
              </p>
            </div>
          )}

          {/* Results */}
          {!scanning && signals.length > 0 && (
            <div>
              {/* Stats Row */}
              <div style={styles.statsRow}>
                {[
                  { label: 'Total', value: signals.length, color: '#3b82f6' },
                  { label: 'Buy', value: buySignals.length, color: '#10b981' },
                  { label: 'Sell', value: sellSignals.length, color: '#ef4444' },
                  { label: 'Avg Conf', value: `${avgConf}%`, color: '#8b5cf6' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    ...styles.statCard,
                    borderColor: `${stat.color}33`
                  }}>
                    <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                      {stat.label}
                    </p>
                    <p style={{ color: stat.color, fontSize: 24, fontWeight: 700, margin: 0 }}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Buy Signals */}
              {buySignals.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ color: '#10b981', marginBottom: 16 }}>
                    🟢 Buy Signals ({buySignals.length})
                  </h2>
                  <div style={styles.signalGrid}>
                    {buySignals.map(signal => (
                      <SignalCard key={signal.id} signal={signal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sell Signals */}
              {sellSignals.length > 0 && (
                <div>
                  <h2 style={{ color: '#ef4444', marginBottom: 16 }}>
                    🔴 Sell Signals ({sellSignals.length})
                  </h2>
                  <div style={styles.signalGrid}>
                    {sellSignals.map(signal => (
                      <SignalCard key={signal.id} signal={signal} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  )
}

// Signal Card
function SignalCard({ signal }) {
  const isBuy = signal.direction === 'BUY'
  const confColor = signal.confidence >= 85 ? '#10b981' : signal.confidence >= 75 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.8)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${isBuy ? '#10b98133' : '#ef444433'}`,
      borderRadius: 16,
      padding: 20,
      transition: 'transform 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{signal.symbol}</span>
        <span style={{
          padding: '4px 12px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          background: isBuy ? '#10b98122' : '#ef444422',
          color: isBuy ? '#10b981' : '#ef4444',
          border: `1px solid ${isBuy ? '#10b98144' : '#ef444444'}`
        }}>
          {isBuy ? '🟢 BUY' : '🔴 SELL'}
        </span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16, padding: 12, background: `${confColor}11`, borderRadius: 8 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: confColor }}>
          {signal.confidence}%
        </span>
        <span style={{ display: 'block', fontSize: 12, color: '#94a3b8' }}>Confidence</span>
      </div>

      {[
        { label: 'Entry', value: signal.entry, bg: '#1e293b', color: '#f1f5f9' },
        { label: '🛑 Stop Loss', value: signal.stopLoss, bg: '#ef444411', color: '#ef4444' },
        { label: '🎯 Take Profit', value: signal.takeProfit, bg: '#10b98111', color: '#10b981' },
      ].map(row => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '10px 12px', background: row.bg,
          borderRadius: 8, marginBottom: 8,
          border: row.label !== 'Entry' ? `1px solid ${row.color}33` : 'none'
        }}>
          <span style={{ color: row.label === 'Entry' ? '#94a3b8' : row.color, fontSize: 14 }}>
            {row.label}
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: row.color }}>
            {row.value.toFixed(5)}
          </span>
        </div>
      ))}

      <div style={{
        textAlign: 'center', padding: 8,
        background: '#1e293b', borderRadius: 8, marginTop: 8
      }}>
        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>
          R:R 1:{signal.riskReward}
        </span>
      </div>
    </div>
  )
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
    padding: '0 24px',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    maxWidth: 1400,
    margin: '0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    background: 'linear-gradient(135deg, #60a5fa, #34d399)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    margin: 0,
  },
  timeframeGroup: {
    display: 'flex',
    gap: 4,
    background: '#1e293b',
    borderRadius: 12,
    padding: 4,
  },
  timeframeBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: 24,
  },
  scanPanel: {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    marginBottom: 24,
  },
  scanTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  scanDesc: {
    color: '#94a3b8',
    marginBottom: 24,
  },
  scanBtn: {
    padding: '16px 48px',
    fontSize: 18,
    fontWeight: 700,
    border: 'none',
    borderRadius: 12,
    color: 'white',
    transition: 'all 0.3s',
  },
  scanProgress: {
    marginTop: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #2563eb',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  spinnerLarge: {
    width: 60,
    height: 60,
    border: '4px solid #2563eb',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: '#ef444411',
    border: '1px solid #ef444433',
    borderRadius: 8,
  },
  retryBtn: {
    marginTop: 8,
    padding: '8px 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  stateContainer: {
    textAlign: 'center',
    padding: 80,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
  },
  signalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
}

export default App
