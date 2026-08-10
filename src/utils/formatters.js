/**
 * Format a number to a specified number of decimal places
 */
export function formatNumber(value, decimals = 5) {
  if (typeof value !== 'number' || isNaN(value)) return '0.00000';
  return value.toFixed(decimals);
}

/**
 * Format a price value
 */
export function formatPrice(price, decimals = 5) {
  if (typeof price !== 'number' || isNaN(price)) return '0.00000';
  return price.toFixed(decimals);
}

/**
 * Format a currency value
 */
export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a percentage value
 */
export function formatPercent(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

/**
 * Format a timestamp to time string
 */
export function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a timestamp to date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return '---';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to date and time string
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '---';
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}

/**
 * Format volume with abbreviations
 */
export function formatVolume(volume) {
  if (typeof volume !== 'number' || isNaN(volume)) return '0';
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toString();
}

/**
 * Format pip value
 */
export function formatPipValue(value, decimals = 1) {
  if (typeof value !== 'number' || isNaN(value)) return '0 pips';
  return `${value.toFixed(decimals)} pips`;
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Format a countdown timer (MM:SS)
 */
export function formatCountdown(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Format a signal direction with emoji
 */
export function formatDirection(direction) {
  if (direction === 'BUY') return '🟢 BUY';
  if (direction === 'SELL') return '🔴 SELL';
  return '⚪ NEUTRAL';
}

/**
 * Format risk/reward ratio
 */
export function formatRR(ratio) {
  if (typeof ratio !== 'number' || isNaN(ratio)) return '1:0';
  return `1:${ratio.toFixed(2)}`;
}
