import { ReconnectingSocket } from './websocket.js'
import { GRANULARITY_MAP } from '../constants/timeframes.js'
import { toDerivSymbol } from '../constants/markets.js'
import { stripUnclosedCandle, genId, sleep } from '../utils/helpers.js'

// app_id=1089 is Deriv's SHARED PUBLIC DEMO app id — it's used by
// countless unrelated tutorials and apps worldwide, and gets rate-
// limited hard because of that shared load. Symptoms look exactly like
// "no data available" on every symbol at once, even though the data
// genuinely exists — it's a request-throttling failure, not a data gap.
//
// Register your own free app_id at https://api.deriv.com (Deriv account
// -> Settings -> API Token / Register Application) and replace the
// value below. A personal app_id gets its own rate-limit bucket instead
// of sharing one with the entire internet.
const APP_ID = "1089";

export function derivWS(request, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
    const timer = setTimeout(() => { ws.close(); reject(new Error("Timeout")); }, timeoutMs);
    ws.onopen    = () => ws.send(JSON.stringify(request));
    ws.onmessage = (e) => {
      clearTimeout(timer); ws.close();
      try {
        const d = JSON.parse(e.data);
        if (d.error) return reject(new Error(d.error.message));
        resolve(d);
      } catch (err) { reject(err); }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("WS error")); };
  });
}

// Anti-repainting fix: Deriv's ticks_history with end:"latest" always returns
// the current, STILL-FORMING candle as the last element — its close price
// changes on every tick. If the engine analyzes that candle, a signal can
// silently flip between scans as price moves within the same unfinished bar,
// with no record that anything changed. We strip it here, at the single
// source all data flows through, so nothing downstream can ever see it.
//
// A candle is "closed" once real time has passed its own duration
// (epoch + granularity <= now). We double-check this by time rather than
// just "drop the last one," in case Deriv ever returns a fully-closed final
// candle (e.g. right at a boundary) — we don't want to discard real data.
export async function fetchCandles(derivSymbol, granularity, count = 300) {
  // Request one extra candle so that after dropping the forming one we still
  // return the full requested `count` of genuinely closed candles.
  const d = await derivWS({
    ticks_history: derivSymbol, adjust_start_time: 1,
    count: count + 1, end: "latest", granularity, style: "candles",
  });

  const nowSeconds = Date.now() / 1000;
  let candles = (d.candles || []).map(c => ({
    open: +c.open, high: +c.high, low: +c.low, close: +c.close, time: c.epoch * 1000,
    epoch: c.epoch,
  }));

  // Drop any trailing candle(s) that haven't fully closed yet.
  while (candles.length > 0 && (candles[candles.length - 1].epoch + granularity) > nowSeconds) {
    candles.pop();
  }

  // Trim back down to the requested count (we over-fetched by 1 above).
  if (candles.length > count) {
    candles = candles.slice(candles.length - count);
  }

  // Strip the internal epoch field before returning — not part of the public candle shape.
  candles = candles.map(({ open, high, low, close, time }) => ({ open, high, low, close, time }));

  // livePrice: the close of the last CLOSED candle. This is intentionally
  // NOT the current live tick — using the live tick here would reintroduce
  // exactly the repainting behavior this fix removes, since price at that
  // instant is unstable and doesn't correspond to a fixed point in time.
  const livePrice = candles.length ? candles[candles.length - 1].close : null;

  return { candles, livePrice };
}
