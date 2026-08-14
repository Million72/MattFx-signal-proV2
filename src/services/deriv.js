import { ReconnectingSocket } from './websocket.js'
import { GRANULARITY_MAP } from '../constants/timeframes.js'
import { toDerivSymbol } from '../constants/markets.js'
import { stripUnclosedCandle, genId, sleep } from '../utils/helpers.js'

// Deriv's current official WebSocket endpoint is ws.derivws.com — this
// project previously pointed at ws.binaryws.com, the older Binary.com
// domain from before Deriv's rebrand. That stale endpoint can fail
// consistently (not just under load), which looks identical to rate-
// limiting but doesn't recover with retries/backoff the way real
// throttling does. This is the corrected, current endpoint.
//
// app_id below is your registered "MattFx signal proV2" app on Deriv —
// no longer the shared public demo id. This gives your requests their
// own dedicated rate-limit bucket instead of sharing 1089 with every
// other app on the internet.
const DERIV_APP_ID = '346FVETnQPomWGtjKqK2T'
const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000

class DerivService {
  constructor() {
    this.socket = new ReconnectingSocket(DERIV_WS_URL)
  }

  get isConnected() {
    return this.socket.isConnected
  }

  onStatusChange(cb) {
    this.socket.onStatusChange = cb
  }

  async connect() {
    if (this.isConnected) return
    await this.socket.connect()
  }

  disconnect() {
    this.socket.disconnect()
  }

  /**
   * Fetch closed candles for a display symbol (e.g. 'VOL10').
   * Translates to the real Deriv symbol internally, strips the
   * still-forming last candle to prevent repainting, and retries with
   * backoff on failure — a single dropped/rate-limited request should
   * not silently show as "no data" when a retry would succeed.
   */
  async getCandles(displaySymbol, timeframe, count = 150) {
    let lastError = 'unknown'

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const result = await this._getCandlesOnce(displaySymbol, timeframe, count)
      if (!result.error) return result

      lastError = result.error
      // Not worth retrying if we're simply not connected — that needs
      // a reconnect, not a request retry.
      if (result.error === 'not_connected') break

      if (attempt < MAX_RETRIES) {
        const jitter = Math.random() * 300
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1) + jitter)
      }
    }

    return { candles: [], error: lastError }
  }

  async _getCandlesOnce(displaySymbol, timeframe, count) {
    const derivSymbol = toDerivSymbol(displaySymbol)
    const granularity = GRANULARITY_MAP[timeframe] || 60
    const reqId = genId('candles')

    return new Promise((resolve) => {
      const handler = (data) => {
        this.socket.removeListener(reqId, handler)

        if (data.error) {
          console.error(`Deriv error for ${displaySymbol} (${derivSymbol}):`, data.error.message)
          resolve({ candles: [], error: data.error.message })
          return
        }

        if (!data.candles || data.candles.length === 0) {
          resolve({ candles: [], error: 'no_data' })
          return
        }

        const parsed = data.candles.map((c) => ({
          time: parseInt(c.epoch, 10) * 1000,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: c.volume ? parseFloat(c.volume) : 0
        }))

        resolve({ candles: stripUnclosedCandle(parsed), error: null })
      }

      this.socket.addListener(reqId, handler)

      const sent = this.socket.send({
        ticks_history: derivSymbol,
        granularity,
        count: count + 1, // +1 because we strip the unclosed candle
        end: 'latest',
        style: 'candles',
        req_id: reqId
      })

      if (!sent) {
        this.socket.removeListener(reqId, handler)
        resolve({ candles: [], error: 'not_connected' })
        return
      }

      setTimeout(() => {
        this.socket.removeListener(reqId, handler)
        resolve({ candles: [], error: 'timeout' })
      }, 12000)
    })
  }

  /**
   * Fetch the current spot price for a display symbol via a single tick.
   */
  async getCurrentPrice(displaySymbol) {
    const derivSymbol = toDerivSymbol(displaySymbol)
    const reqId = genId('tick')

    return new Promise((resolve) => {
      const handler = (data) => {
        this.socket.removeListener(reqId, handler)
        if (data.error || !data.tick) {
          resolve(null)
          return
        }
        resolve(parseFloat(data.tick.quote))
      }

      this.socket.addListener(reqId, handler)
      const sent = this.socket.send({ ticks: derivSymbol, req_id: reqId, subscribe: 0 })

      if (!sent) {
        this.socket.removeListener(reqId, handler)
        resolve(null)
        return
      }

      setTimeout(() => {
        this.socket.removeListener(reqId, handler)
        resolve(null)
      }, 8000)
    })
  }
}

export const derivService = new DerivService()
