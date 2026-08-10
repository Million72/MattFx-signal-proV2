import { useState, useEffect, useCallback, useRef } from 'react';
import { AdvancedSignalGenerator } from '../engine/advancedSignalGenerator';
import { SignalManager } from '../engine/signalManager';

export function useSignalEngine(marketData, selectedTimeframe, marketType) {
  const [signals, setSignals] = useState({
    current: null,
    active: [],
    history: [],
    quality: {
      trend: 0,
      momentum: 0,
      volatility: 0,
      volume: 0,
      mtfConfluence: 0,
    },
  });
  const [activeSignals, setActiveSignals] = useState([]);
  const [performance, setPerformance] = useState(null);
  
  const signalGeneratorRef = useRef(null);
  const signalManagerRef = useRef(null);

  useEffect(() => {
    signalGeneratorRef.current = new AdvancedSignalGenerator({
      minConfidenceThreshold: 75,
      minTimeframeConfluence: 3,
      requireMTFConfirmation: true,
      requireHTFAlignment: true,
      maxSignalsPerHour: 5,
    });

    signalManagerRef.current = new SignalManager();

    return () => {
      // Cleanup
    };
  }, []);

  useEffect(() => {
    if (!marketData?.current || !signalGeneratorRef.current) return;

    const generateSignal = async () => {
      try {
        const signal = await signalGeneratorRef.current.generateSignal(
          marketData,
          selectedTimeframe,
          marketType
        );

        setSignals(prev => ({
          ...prev,
          current: signal,
          active: signal.type !== 'NO_SIGNAL' 
            ? [...prev.active.slice(-19), signal]
            : prev.active,
          history: [...prev.history.slice(-99), signal],
          quality: calculateQualityMetrics(signal, marketData),
        }));

        // Update active signals
        if (signal.type !== 'NO_SIGNAL') {
          setActiveSignals(prev => [...prev.slice(-9), signal]);
        }

        // Update performance metrics
        updatePerformance();
      } catch (error) {
        console.error('Signal generation error:', error);
      }
    };

    // Debounce signal generation
    const timeoutId = setTimeout(generateSignal, 1000);
    return () => clearTimeout(timeoutId);
  }, [marketData?.current?.close, selectedTimeframe, marketType]);

  const updatePerformance = useCallback(() => {
    if (!signalManagerRef.current) return;

    const report = signalManagerRef.current.getPerformanceReport();
    setPerformance({
      winRate: report.winRate,
      totalTrades: report.totalTrades,
      winningTrades: report.winningTrades,
      losingTrades: report.losingTrades,
      totalPnL: report.totalPnL,
      averageWin: report.averageWin,
      averageLoss: report.averageLoss,
      profitFactor: report.profitFactor,
      sharpeRatio: report.sharpeRatio,
      maxDrawdown: report.maxDrawdown,
      averageRR: report.averageRR,
      consecutiveWins: report.consecutiveWins,
      consecutiveLosses: report.consecutiveLosses,
      expectancy: report.expectancy,
      systemQuality: report.systemQuality,
    });
  }, []);

  return {
    signals,
    activeSignals,
    performance,
  };
}

function calculateQualityMetrics(signal, marketData) {
  if (!signal || signal.type === 'NO_SIGNAL') {
    return {
      trend: 0,
      momentum: 0,
      volatility: 0,
      volume: 0,
      mtfConfluence: 0,
    };
  }

  return {
    trend: signal.components?.trendStrength || 0,
    momentum: signal.components?.momentum || 0,
    volatility: signal.components?.volatility || 0,
    volume: signal.components?.volume || 0,
    mtfConfluence: signal.multiTimeframe?.confluenceCount 
      ? (signal.multiTimeframe.confluenceCount / 7) * 100 
      : 0,
  };
  }
