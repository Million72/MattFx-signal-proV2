import { TIMEFRAME_HIERARCHY } from '../constants/timeframes';

class DerivService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.candleData = new Map();
    this.listeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('Connected to Deriv WS');
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('Disconnected from Deriv WS');
          // Auto reconnect after 5 seconds
          setTimeout(() => this.connect(), 5000);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async subscribeToCandles(symbol, timeframe) {
    const granularity = this.getGranularity(timeframe);
    const subscriptionKey = `${symbol}_${timeframe}`;

    if (this.subscriptions.has(subscriptionKey)) return;

    const request = {
      ticks_history: symbol,
      granularity: granularity,
      count: 500,
      end: 'latest',
      style: 'candles',
      subscribe: 1
    };

    this.ws.send(JSON.stringify(request));
    this.subscriptions.set(subscriptionKey, true);
  }

  async subscribeToMultipleTimeframes(symbol, selectedTimeframe) {
    const hierarchy = TIMEFRAME_HIERARCHY[selectedTimeframe];
    const allTimeframes = [
      ...hierarchy.ltf,
      hierarchy.current,
      ...hierarchy.mtf,
      ...hierarchy.htf
    ];

    // Subscribe to all timeframes
    for (const tf of allTimeframes) {
      await this.subscribeToCandles(symbol, tf);
    }
  }

  handleMessage(data) {
    if (data.error) {
      console.error('Deriv API Error:', data.error);
      return;
    }

    if (data.msg_type === 'candles' || data.msg_type === 'ohlc') {
      const symbol = data.echo_req.ticks_history;
      const granularity = data.echo_req.granularity;
      const timeframe = this.getTimeframeFromGranularity(granularity);
      
      const candles = data.candles.map(candle => ({
        time: parseInt(candle.epoch) * 1000,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: 0 // Deriv doesn't provide volume for forex
      }));

      // Store candle data
      this.candleData.set(`${symbol}_${timeframe}`, candles);

      // Notify listeners
      this.notifyListeners(symbol, timeframe, candles);
    }
  }

  notifyListeners(symbol, timeframe, data) {
    const key = `${symbol}_${timeframe}`;
    const listeners = this.listeners.get(key) || [];
    listeners.forEach(callback => callback(data));
  }

  addListener(symbol, timeframe, callback) {
    const key = `${symbol}_${timeframe}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  removeListener(symbol, timeframe, callback) {
    const key = `${symbol}_${timeframe}`;
    const listeners = this.listeners.get(key) || [];
    this.listeners.set(
      key,
      listeners.filter(cb => cb !== callback)
    );
  }

  getGranularity(timeframe) {
    const map = {
      '30s': 30,
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
      '1w': 604800,
      '1M': 2592000
    };
    return map[timeframe] || 60;
  }

  getTimeframeFromGranularity(granularity) {
    const map = {
      30: '30s',
      60: '1m',
      300: '5m',
      900: '15m',
      1800: '30m',
      3600: '1h',
      14400: '4h',
      86400: '1d',
      604800: '1w',
      2592000: '1M'
    };
    return map[granularity] || '1m';
  }

  async getActiveSymbols() {
    return new Promise((resolve) => {
      const request = {
        active_symbols: 'brief',
        product_type: 'basic'
      };

      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.msg_type === 'active_symbols') {
          this.ws.removeEventListener('message', handler);
          resolve(data.active_symbols);
        }
      };

      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify(request));
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }
}

export const derivService = new DerivService();
