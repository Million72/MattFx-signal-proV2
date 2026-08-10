export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

export function sortByKey(array, key, ascending = true) {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return ascending ? -1 : 1;
    if (a[key] > b[key]) return ascending ? 1 : -1;
    return 0;
  });
}

export function filterUnique(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function calculatePnL(entry, exit, direction, size = 1) {
  if (direction === 'BUY') {
    return (exit - entry) * size;
  } else {
    return (entry - exit) * size;
  }
}

export function calculateRiskAmount(accountBalance, riskPercent) {
  return accountBalance * (riskPercent / 100);
}

export function calculatePositionSize(riskAmount, stopLossPips, pipValue = 10) {
  return riskAmount / (stopLossPips * pipValue);
}

export function roundToTick(value, tickSize = 0.00001) {
  return Math.round(value / tickSize) * tickSize;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry(fn, retries = 3, delay = 1000) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await fn();
        return resolve(result);
      } catch (error) {
        if (i === retries - 1) return reject(error);
        await sleep(delay * Math.pow(2, i));
      }
    }
  });
  }
