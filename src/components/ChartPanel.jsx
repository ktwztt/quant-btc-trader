import { useEffect, useRef, useCallback } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';

const COLORS = {
  bg: '#0a0a0a',
  grid: '#1a1a1a',
  text: '#888888',
  border: '#2a2a2a',
  up: '#00c853',
  down: '#ff1744',
  ma7: '#0070f3',
  ma25: '#f5a623',
  ma99: '#7928ca',
  ema9: '#00dfd8',
  ema21: '#ff0080',
  ema55: '#f9cb28',
  bbUpper: 'rgba(80,227,194,0.3)',
  bbMid: 'rgba(80,227,194,0.6)',
  bbLower: 'rgba(80,227,194,0.3)',
  vwap: '#f9cb28',
  rsi: '#50e3c2',
  macdLine: '#0070f3',
  macdSignal: '#f5a623',
  stochK: '#50e3c2',
  stochD: '#f5a623',
};

function makeChartOptions() {
  return {
    layout: {
      background: { color: COLORS.bg },
      textColor: COLORS.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 11,
    },
    grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: COLORS.text, width: 1, style: LineStyle.Dashed },
      horzLine: { color: COLORS.text, width: 1, style: LineStyle.Dashed },
    },
    rightPriceScale: { borderColor: COLORS.border },
    timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
    handleScroll: { vertTouchDrag: false },
  };
}

// ── Sync multiple charts' time axes ──
function syncTimeScales(charts) {
  let isSyncing = false;
  for (const chart of charts) {
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncing || !range) return;
      isSyncing = true;
      for (const other of charts) {
        if (other !== chart) {
          other.timeScale().setVisibleLogicalRange(range);
        }
      }
      isSyncing = false;
    });
  }
}

export default function ChartPanel({ klines, indicators, activeIndicators }) {
  const mainRef = useRef(null);
  const rsiRef = useRef(null);
  const macdRef = useRef(null);

  // Chart instances
  const mainChartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);

  // Series refs
  const seriesRef = useRef({});
  const syncedRef = useRef(false);

  const showRSI = activeIndicators.includes('RSI');
  const showMACD = activeIndicators.includes('MACD');
  const showStoch = activeIndicators.includes('STOCH');

  // ── Initialize main chart ──
  useEffect(() => {
    if (!mainRef.current || mainChartRef.current) return;

    const chart = createChart(mainRef.current, {
      ...makeChartOptions(),
      rightPriceScale: { ...makeChartOptions().rightPriceScale, scaleMargins: { top: 0.05, bottom: 0.25 } },
    });
    mainChartRef.current = chart;

    const s = seriesRef.current;

    // Candlestick
    s.candle = chart.addCandlestickSeries({
      upColor: COLORS.up, downColor: COLORS.down,
      borderUpColor: COLORS.up, borderDownColor: COLORS.down,
      wickUpColor: COLORS.up, wickDownColor: COLORS.down,
    });

    // Volume
    s.volume = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
    s.volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    // MA lines
    const maColors = { 7: COLORS.ma7, 25: COLORS.ma25, 99: COLORS.ma99 };
    for (const p of [7, 25, 99]) {
      s[`ma${p}`] = chart.addLineSeries({ color: maColors[p], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    }

    // EMA lines
    const emaColors = { 9: COLORS.ema9, 21: COLORS.ema21, 55: COLORS.ema55 };
    for (const p of [9, 21, 55]) {
      s[`ema${p}`] = chart.addLineSeries({ color: emaColors[p], lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false });
    }

    // BB
    s.bbUpper = chart.addLineSeries({ color: COLORS.bbUpper, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    s.bbMid = chart.addLineSeries({ color: COLORS.bbMid, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    s.bbLower = chart.addLineSeries({ color: COLORS.bbLower, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    // VWAP
    s.vwap = chart.addLineSeries({ color: COLORS.vwap, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false });

    // Resize
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(mainRef.current);
    s._mainRO = ro;

    return () => { ro.disconnect(); chart.remove(); mainChartRef.current = null; };
  }, []);

  // ── Initialize RSI sub-chart ──
  useEffect(() => {
    if (!rsiRef.current) return;
    if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null; }

    const chart = createChart(rsiRef.current, {
      ...makeChartOptions(),
      height: 120,
      rightPriceScale: { ...makeChartOptions().rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { visible: false },
    });
    rsiChartRef.current = chart;
    const s = seriesRef.current;

    // RSI line
    s.rsi = chart.addLineSeries({ color: COLORS.rsi, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });

    // Overbought/Oversold lines
    s.rsiOB = chart.addLineSeries({ color: 'rgba(255,23,68,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    s.rsiOS = chart.addLineSeries({ color: 'rgba(0,200,83,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    s.rsiMid = chart.addLineSeries({ color: 'rgba(136,136,136,0.2)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false });

    // Stochastic lines (shared sub-chart)
    s.stochK = chart.addLineSeries({ color: COLORS.stochK, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
    s.stochD = chart.addLineSeries({ color: COLORS.stochD, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(rsiRef.current);
    s._rsiRO = ro;

    if (mainChartRef.current && !syncedRef.current) {
      syncTimeScales([mainChartRef.current, chart]);
    }

    return () => { ro.disconnect(); chart.remove(); rsiChartRef.current = null; };
  }, []);

  // ── Initialize MACD sub-chart ──
  useEffect(() => {
    if (!macdRef.current) return;
    if (macdChartRef.current) { macdChartRef.current.remove(); macdChartRef.current = null; }

    const chart = createChart(macdRef.current, {
      ...makeChartOptions(),
      height: 120,
      rightPriceScale: { ...makeChartOptions().rightPriceScale, scaleMargins: { top: 0.15, bottom: 0.1 } },
      timeScale: { visible: true },
    });
    macdChartRef.current = chart;
    const s = seriesRef.current;

    s.macdLine = chart.addLineSeries({ color: COLORS.macdLine, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
    s.macdSignal = chart.addLineSeries({ color: COLORS.macdSignal, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    s.macdHist = chart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
    // Zero line
    s.macdZero = chart.addLineSeries({ color: 'rgba(136,136,136,0.2)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false });

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(macdRef.current);
    s._macdRO = ro;

    const charts = [mainChartRef.current, chart].filter(Boolean);
    if (charts.length > 1) syncTimeScales(charts);

    return () => { ro.disconnect(); chart.remove(); macdChartRef.current = null; };
  }, []);

  // ── Sync all charts once all are ready ──
  useEffect(() => {
    if (syncedRef.current) return;
    const charts = [mainChartRef.current, rsiChartRef.current, macdChartRef.current].filter(Boolean);
    if (charts.length >= 2) {
      syncTimeScales(charts);
      syncedRef.current = true;
    }
  });

  // ── Update data ──
  useEffect(() => {
    if (!klines.length) return;
    const s = seriesRef.current;

    // Candlestick + volume
    s.candle?.setData(klines);
    s.volume?.setData(klines.map((k) => ({
      time: k.time, value: k.volume,
      color: k.close >= k.open ? 'rgba(0,200,83,0.2)' : 'rgba(255,23,68,0.2)',
    })));

    mainChartRef.current?.timeScale().scrollToRealTime();
  }, [klines]);

  // ── Update indicators ──
  useEffect(() => {
    if (!indicators) return;
    const s = seriesRef.current;
    const showMA = activeIndicators.includes('MA');
    const showEMA = activeIndicators.includes('EMA');
    const showBB = activeIndicators.includes('BB');
    const showVWAP = activeIndicators.includes('VWAP');

    // MA
    for (const p of [7, 25, 99]) {
      const data = indicators.ma?.[p];
      if (data && showMA) { s[`ma${p}`]?.setData(data); s[`ma${p}`]?.applyOptions({ visible: true }); }
      else { s[`ma${p}`]?.applyOptions({ visible: false }); }
    }

    // EMA
    for (const p of [9, 21, 55]) {
      const data = indicators.ema?.[p];
      if (data && showEMA) { s[`ema${p}`]?.setData(data); s[`ema${p}`]?.applyOptions({ visible: true }); }
      else { s[`ema${p}`]?.applyOptions({ visible: false }); }
    }

    // BB
    if (indicators.bollinger && showBB) {
      s.bbUpper?.setData(indicators.bollinger.upper);
      s.bbMid?.setData(indicators.bollinger.middle);
      s.bbLower?.setData(indicators.bollinger.lower);
      [s.bbUpper, s.bbMid, s.bbLower].forEach((x) => x?.applyOptions({ visible: true }));
    } else {
      [s.bbUpper, s.bbMid, s.bbLower].forEach((x) => x?.applyOptions({ visible: false }));
    }

    // VWAP
    if (indicators.vwap?.length && showVWAP) {
      s.vwap?.setData(indicators.vwap);
      s.vwap?.applyOptions({ visible: true });
    } else {
      s.vwap?.applyOptions({ visible: false });
    }

    // RSI + Stochastic sub-chart
    if (indicators.rsi?.length && showRSI) {
      const rsiData = indicators.rsi;
      const firstTime = rsiData[0]?.time;
      const lastTime = rsiData[rsiData.length - 1]?.time;
      s.rsi?.setData(rsiData);
      s.rsiOB?.setData(firstTime ? [{ time: firstTime, value: 70 }, { time: lastTime, value: 70 }] : []);
      s.rsiOS?.setData(firstTime ? [{ time: firstTime, value: 30 }, { time: lastTime, value: 30 }] : []);
      s.rsiMid?.setData(firstTime ? [{ time: firstTime, value: 50 }, { time: lastTime, value: 50 }] : []);
      [s.rsi, s.rsiOB, s.rsiOS, s.rsiMid].forEach((x) => x?.applyOptions({ visible: true }));
    } else {
      [s.rsi, s.rsiOB, s.rsiOS, s.rsiMid].forEach((x) => x?.applyOptions({ visible: false }));
    }

    // Stochastic (shares RSI sub-chart)
    if (indicators.stoch?.k?.length && showStoch) {
      s.stochK?.setData(indicators.stoch.k);
      s.stochD?.setData(indicators.stoch.d);
      [s.stochK, s.stochD].forEach((x) => x?.applyOptions({ visible: true }));
    } else {
      [s.stochK, s.stochD].forEach((x) => x?.applyOptions({ visible: false }));
    }

    // MACD sub-chart
    if (indicators.macd?.macdLine?.length && showMACD) {
      s.macdLine?.setData(indicators.macd.macdLine);
      s.macdSignal?.setData(indicators.macd.signalLine);
      s.macdHist?.setData(indicators.macd.histogram);
      const firstTime = indicators.macd.macdLine[0]?.time;
      const lastTime = indicators.macd.macdLine[indicators.macd.macdLine.length - 1]?.time;
      s.macdZero?.setData(firstTime ? [{ time: firstTime, value: 0 }, { time: lastTime, value: 0 }] : []);
      [s.macdLine, s.macdSignal, s.macdHist, s.macdZero].forEach((x) => x?.applyOptions({ visible: true }));
    } else {
      [s.macdLine, s.macdSignal, s.macdHist, s.macdZero].forEach((x) => x?.applyOptions({ visible: false }));
    }
  }, [indicators, activeIndicators]);

  // ── Toggle sub-chart visibility ──
  const rsiVisible = showRSI || showStoch;

  return (
    <div className="flex flex-col h-full">
      {/* Main chart */}
      <div ref={mainRef} className="flex-1 min-h-0" />

      {/* RSI / Stochastic sub-chart */}
      <div
        ref={rsiRef}
        style={{ height: rsiVisible ? 120 : 0, overflow: 'hidden', borderTop: rsiVisible ? '1px solid #2a2a2a' : 'none' }}
      />

      {/* MACD sub-chart */}
      <div
        ref={macdRef}
        style={{ height: showMACD ? 120 : 0, overflow: 'hidden', borderTop: showMACD ? '1px solid #2a2a2a' : 'none' }}
      />
    </div>
  );
}
