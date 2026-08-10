export const TIMEFRAMES = [
  { value: '1m', label: '1M', seconds: 60 },
  { value: '5m', label: '5M', seconds: 300 },
  { value: '15m', label: '15M', seconds: 900 },
  { value: '30m', label: '30M', seconds: 1800 },
  { value: '1h', label: '1H', seconds: 3600 },
  { value: '4h', label: '4H', seconds: 14400 },
  { value: '1d', label: '1D', seconds: 86400 },
  { value: '1w', label: '1W', seconds: 604800 },
];

export const TIMEFRAME_HIERARCHY = {
  '1m': {
    ltf: ['30s'],
    current: '1m',
    mtf: ['5m', '15m'],
    htf: ['30m', '1h', '4h']
  },
  '5m': {
    ltf: ['1m'],
    current: '5m',
    mtf: ['15m', '30m'],
    htf: ['1h', '4h', '1d']
  },
  '15m': {
    ltf: ['5m', '1m'],
    current: '15m',
    mtf: ['30m', '1h'],
    htf: ['4h', '1d', '1w']
  },
  '30m': {
    ltf: ['15m', '5m'],
    current: '30m',
    mtf: ['1h', '4h'],
    htf: ['1d', '1w']
  },
  '1h': {
    ltf: ['30m', '15m'],
    current: '1h',
    mtf: ['4h', '1d'],
    htf: ['1w', '1M']
  },
  '4h': {
    ltf: ['1h', '30m'],
    current: '4h',
    mtf: ['1d', '1w'],
    htf: ['1w', '1M']
  },
  '1d': {
    ltf: ['4h', '1h'],
    current: '1d',
    mtf: ['1w', '1M'],
    htf: ['1M', '3M']
  },
  '1w': {
    ltf: ['1d', '4h'],
    current: '1w',
    mtf: ['1M', '3M'],
    htf: ['3M', '6M']
  }
};

export const TIMEFRAME_WEIGHTS = {
  ltf: 0.20,
  current: 0.35,
  mtf: 0.25,
  htf: 0.20
};
