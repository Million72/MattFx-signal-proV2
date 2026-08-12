import { ReconnectingSocket } from './websocket.js'
import { GRANULARITY_MAP } from '../constants/timeframes.js'
import { toDerivSymbol } from '../constants/markets.js'
import { stripUnclosedCandle, genId } from '../utils/helpers.js'

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1089'

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
   * Translates to the real Deriv symbol internally and strips the
   * still-forming last candle to prevent repainting.
   */
  async getCandles(displaySymbol, timeframe, count = 150) {
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
