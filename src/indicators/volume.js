export class VolumeAnalysis {
  constructor(period = 20) {
    this.period = period;
    this.averageVolume = 0;
    this.volumeTrend = 'NEUTRAL';
  }

  analyze(volumes, closes) {
    if (!volumes || volumes.length < this.period) {
      return {
        averageVolume: 0,
        currentVolume: 0,
        trend: 'NEUTRAL',
        relativeVolume: 1,
        volumeSpike: false,
      };
    }

    // Calculate average volume
    const recentVolumes = volumes.slice(-this.period);
    this.averageVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / this.period;
    
    const currentVolume = volumes[volumes.length - 1];
    const relativeVolume = currentVolume / this.averageVolume;

    // Determine volume trend
    const firstHalf = recentVolumes.slice(0, Math.floor(this.period / 2));
    const secondHalf = recentVolumes.slice(Math.floor(this.period / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) {
      this.volumeTrend = 'INCREASING';
    } else if (secondAvg < firstAvg * 0.9) {
      this.volumeTrend = 'DECREASING';
    } else {
      this.volumeTrend = 'STABLE';
    }

    // Check for volume spike
    const volumeSpike = relativeVolume > 2.0;

    // Volume confirms price direction
    let confirmsDirection = false;
    if (closes && closes.length > 1) {
      const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
      if (priceChange > 0 && relativeVolume > 1.2) {
        confirmsDirection = 'BULLISH';
      } else if (priceChange < 0 && relativeVolume > 1.2) {
        confirmsDirection = 'BEARISH';
      }
    }

    return {
      averageVolume: this.averageVolume,
      currentVolume,
      trend: this.volumeTrend,
      relativeVolume,
      volumeSpike,
      confirmsDirection,
    };
  }

  getVolumeProfile(volumes, prices, levels = 10) {
    if (!volumes.length || !prices.length) return [];
    
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    const priceStep = (priceMax - priceMin) / levels;
    
    const profile = [];
    
    for (let i = 0; i < levels; i++) {
      const levelLow = priceMin + (i * priceStep);
      const levelHigh = levelLow + priceStep;
      
      let volumeAtLevel = 0;
      for (let j = 0; j < prices.length; j++) {
        if (prices[j] >= levelLow && prices[j] < levelHigh) {
          volumeAtLevel += volumes[j] || 0;
        }
      }
      
      profile.push({
        priceLevel: (levelLow + levelHigh) / 2,
        volume: volumeAtLevel,
      });
    }
    
    return profile.sort((a, b) => b.volume - a.volume);
  }

  getHighVolumeNodes(profile) {
    if (!profile.length) return [];
    
    const maxVolume = Math.max(...profile.map(p => p.volume));
    return profile
      .filter(p => p.volume > maxVolume * 0.7)
      .sort((a, b) => a.priceLevel - b.priceLevel);
  }
}

export function analyzeVolume(volumes, closes, period = 20) {
  const va = new VolumeAnalysis(period);
  return va.analyze(volumes, closes);
}
