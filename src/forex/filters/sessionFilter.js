export function sessionFilter(symbol, timeframe) {
  // Get current time in different sessions
  const now = new Date();
  const utcHour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();

  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // Determine current session
  const asianSession = utcHour >= 0 && utcHour < 9;
  const londonSession = utcHour >= 8 && utcHour < 17;
  const newYorkSession = utcHour >= 13 && utcHour < 22;

  // Filter based on symbol and session
  const asianPairs = ['USDJPY', 'AUDUSD', 'NZDUSD', 'AUDJPY'];
  const londonPairs = ['EURUSD', 'GBPUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
  const nyPairs = ['EURUSD', 'GBPUSD', 'USDCAD', 'USDCHF'];

  if (asianSession && !asianPairs.includes(symbol)) return false;
  if (londonSession && !londonPairs.includes(symbol) && !asianPairs.includes(symbol)) return false;

  // Avoid low liquidity periods
  if (utcHour >= 22 || utcHour < 1) return false;

  return true;
}
