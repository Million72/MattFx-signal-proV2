export function calculateStandardDeviation(values) {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

export function calculateCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = y.reduce((sum, val) => sum + val, 0) / n;
  
  let numerator = 0;
  let xDiff = 0;
  let yDiff = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiffVal = x[i] - xMean;
    const yDiffVal = y[i] - yMean;
    numerator += xDiffVal * yDiffVal;
    xDiff += xDiffVal * xDiffVal;
    yDiff += yDiffVal * yDiffVal;
  }
  
  return numerator / Math.sqrt(xDiff * yDiff);
}

export function linearRegression(x, y) {
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

export function calculateZScore(value, mean, stdDev) {
  return (value - mean) / stdDev;
}

export function normalizeValue(value, min, max) {
  return (value - min) / (max - min);
}

export function calculateMovingAverage(values, period) {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}
