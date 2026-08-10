import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { COLORS } from '../constants/colors';

export default function TradingView({ data, symbol, timeframe, showMTF, height = 500 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data?.candles) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.5)',
        timeVisible: true,
        secondsVisible: timeframe === '1m' || timeframe === '5m',
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Format candle data
    const candleData = data.candles.map(candle => ({
      time: candle.time / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(candleData);

    // Add EMAs
    if (data.indicators?.ema20) {
      const ema20Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      ema20Series.setData(
        data.indicators.ema20.map((value, i) => ({
          time: candleData[i].time,
          value,
        }))
      );
    }

    if (data.indicators?.ema50) {
      const ema50Series = chart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      ema50Series.setData(
        data.indicators.ema50.map((value, i) => ({
          time: candleData[i].time,
          value,
        }))
      );
    }

    if (data.indicators?.ema200) {
      const ema200Series = chart.addLineSeries({
        color: '#ec4899',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      ema200Series.setData(
        data.indicators.ema200.map((value, i) => ({
          time: candleData[i].time,
          value,
        }))
      );
    }

    // Add Bollinger Bands if available
    if (data.indicators?.bollingerBands) {
      const bbUpper = chart.addLineSeries({
        color: '#06b6d4',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
      });
      bbUpper.setData(
        data.indicators.bollingerBands.upper.map((value, i) => ({
          time: candleData[i].time,
          value,
        }))
      );

      const bbLower = chart.addLineSeries({
        color: '#06b6d4',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
      });
      bbLower.setData(
        data.indicators.bollingerBands.lower.map((value, i) => ({
          time: candleData[i].time,
          value,
        }))
      );
    }

    // Add volume series at bottom
    const volumeSeries = chart.addHistogramSeries({
      color: '#64748b',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.setData(
      data.candles.map((candle, i) => ({
        time: candle.time / 1000,
        value: candle.volume || 0,
        color: candle.close > candle.open 
          ? 'rgba(16, 185, 129, 0.3)' 
          : 'rgba(239, 68, 68, 0.3)',
      }))
    );

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add MTF support/resistance lines if showing
    if (showMTF && data.levels) {
      data.levels.forEach(level => {
        const lineSeries = chart.addLineSeries({
          color: level.type === 'support' ? '#10b981' : '#ef4444',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
        });
        
        const lineData = [
          { time: candleData[0].time, value: level.price },
          { time: candleData[candleData.length - 1].time, value: level.price },
        ];
        lineSeries.setData(lineData);
      });
    }

    // Add markers for signals
    if (data.signals) {
      const markers = data.signals.map(signal => ({
        time: signal.time / 1000,
        position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
        color: signal.type === 'BUY' ? '#10b981' : '#ef4444',
        shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: signal.type,
        size: 2,
      }));
      
      candleSeries.setMarkers(markers);
    }

    // Fit content
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, timeframe, showMTF, height]);

  return (
    <div className="relative">
      {!data?.candles && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Loading chart data...</p>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" style={{ minHeight: height }} />
    </div>
  );
      }
