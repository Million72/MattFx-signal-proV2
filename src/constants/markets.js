export const FOREX_PAIRS = {
  major: [
    { symbol: 'EURUSD', name: 'EUR/USD', spread: 0.1, pipValue: 10 },
    { symbol: 'GBPUSD', name: 'GBP/USD', spread: 0.2, pipValue: 10 },
    { symbol: 'USDJPY', name: 'USD/JPY', spread: 0.1, pipValue: 9.15 },
    { symbol: 'USDCHF', name: 'USD/CHF', spread: 0.2, pipValue: 10.87 },
    { symbol: 'AUDUSD', name: 'AUD/USD', spread: 0.3, pipValue: 10 },
    { symbol: 'NZDUSD', name: 'NZD/USD', spread: 0.4, pipValue: 10 },
    { symbol: 'USDCAD', name: 'USD/CAD', spread: 0.2, pipValue: 7.45 },
  ],
  minor: [
    { symbol: 'EURGBP', name: 'EUR/GBP', spread: 0.3, pipValue: 12.60 },
    { symbol: 'EURJPY', name: 'EUR/JPY', spread: 0.4, pipValue: 9.15 },
    { symbol: 'GBPJPY', name: 'GBP/JPY', spread: 0.5, pipValue: 9.15 },
    { symbol: 'EURCHF', name: 'EUR/CHF', spread: 0.4, pipValue: 10.87 },
    { symbol: 'AUDJPY', name: 'AUD/JPY', spread: 0.5, pipValue: 9.15 },
  ],
  exotic: [
    { symbol: 'USDTRY', name: 'USD/TRY', spread: 5.0, pipValue: 0.34 },
    { symbol: 'USDMXN', name: 'USD/MXN', spread: 3.0, pipValue: 0.57 },
    { symbol: 'USDZAR', name: 'USD/ZAR', spread: 5.0, pipValue: 0.53 },
  ]
};

export const SYNTHETIC_INDICES = {
  volatility: [
    { symbol: 'VOL10', name: 'Volatility 10', volatility: 'Low' },
    { symbol: 'VOL25', name: 'Volatility 25', volatility: 'Medium' },
    { symbol: 'VOL50', name: 'Volatility 50', volatility: 'Medium-High' },
    { symbol: 'VOL75', name: 'Volatility 75', volatility: 'High' },
    { symbol: 'VOL100', name: 'Volatility 100', volatility: 'Extreme' },
  ],
  crashBoom: [
    { symbol: 'CRASH300', name: 'Crash 300', type: 'Crash' },
    { symbol: 'CRASH500', name: 'Crash 500', type: 'Crash' },
    { symbol: 'CRASH1000', name: 'Crash 1000', type: 'Crash' },
    { symbol: 'BOOM300', name: 'Boom 300', type: 'Boom' },
    { symbol: 'BOOM500', name: 'Boom 500', type: 'Boom' },
    { symbol: 'BOOM1000', name: 'Boom 1000', type: 'Boom' },
  ],
  jump: [
    { symbol: 'JUMP10', name: 'Jump 10', type: 'Jump' },
    { symbol: 'JUMP25', name: 'Jump 25', type: 'Jump' },
    { symbol: 'JUMP50', name: 'Jump 50', type: 'Jump' },
    { symbol: 'JUMP75', name: 'Jump 75', type: 'Jump' },
    { symbol: 'JUMP100', name: 'Jump 100', type: 'Jump' },
  ]
};

export const MARKET_SESSIONS = {
  asian: { start: '00:00', end: '09:00', timezone: 'GMT+8', pairs: ['USDJPY', 'AUDUSD', 'NZDUSD'] },
  london: { start: '08:00', end: '17:00', timezone: 'GMT', pairs: ['EURUSD', 'GBPUSD', 'EURGBP'] },
  newYork: { start: '13:00', end: '22:00', timezone: 'GMT-5', pairs: ['EURUSD', 'GBPUSD', 'USDCAD'] },
};
