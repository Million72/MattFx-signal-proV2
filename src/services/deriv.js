import { ReconnectingSocket } from './websocket.js'
import { GRANULARITY_MAP } from '../constants/timeframes.js'
import { toDerivSymbol } from '../constants/markets.js'
import { stripUnclosedCandle, sleep } from '../utils/helpers.js'

// Deriv retired the legacy WebSocket API (ws.derivws.com/websockets/v3
// and the numeric app_id system) entirely. This connects to their
// CURRENT public market-data endpoint instead, confirmed directly
// against Deriv's own published schema at developers.deriv.com:
//
//   wss://api.derivws.com/trading/v1/options/ws/public
//
// Confirmed differences from the old legacy protocol that this file
// accounts for:
//   - No app_id / auth required for this public channel at all — this
//     removes the shared-rate-limit problem at its root rather than
//     just working around it (no more sharing one bucket with every
//     other app on the internet).
//   - req_id must be a JSON *integer*, not a string. The old code used
//     string IDs like "candles_VOL10_...", which the new API's schema
//     rejects outright.
//   - `echo_req` in the response is no longer guaranteed to be present.
//     The old code matched responses to requests by checking
//     echo_req.ticks_history/granularity — that check is removed here;
//     matching now relies purely on req_id-based listener routing,
//     which is correct and doesn't need echo_req at all.
//   - Candle field names (open/high/low/close/epoch) are unchanged.
const DERIV_WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public'

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000

// Sequential integer req_id generator, as the new API's schema requires.
let reqIdCounter = 1
function nextReqId() {
  reqIdCounter += 1
  return reqIdCounter
}

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
   * backoff on failure.
   */
  async getCandles(displaySymbol, timeframe, count = 150) {
    let lastError = 'unknown'

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const result = await this._getCandlesOnce(displaySymbol, timeframe, count)
      if (!result.error) return result

      lastError = result.error
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
    const reqId = nextReqId()

    return new Promise((resolve) => {
      // Because this listener is added and removed per unique req_id,
      // any response that reaches this handler IS the response to this
      // exact request — no need to double-check echo_req, which the
      // new API doesn't guarantee will even be present.
      const handler = (data) => {
        this.socket.removeListener(reqId, handler)

        if (data.error) {
          console.error(`Deriv error for ${displaySymbol} (${derivSymbol}):`, data.error.message)
          resolve({ candles: [], error: data.error.message })
          return
        }

        if (data.errors && data.errors.length > 0) {
          console.error(`Deriv validation error for ${displaySymbol}:`, data.errors[0].message)
          resolve({ candles: [], error: data.errors[0].message })
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
    const reqId = nextReqId()

    return new Promise((resolve) => {
      const handler = (data) => {
        this.socket.removeListener(reqId, handler)
        if (data.error || data.errors || !data.tick) {
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
