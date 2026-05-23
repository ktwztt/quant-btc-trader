import { useMemo } from 'react';

// Regime scoring system ported from btc_regime.py
// Each sub-function contributes to a cumulative score (-12 to +12)

function scoreADX(indicators) {
  if (!indicators?.adx?.adx?.length) return 0;
  const adx = indicators.adx.adx[indicators.adx.adx.length - 1]?.value || 0;
  const plusDI = indicators.adx.plusDI[indicators.adx.plusDI.length - 1]?.value || 0;
  const minusDI = indicators.adx.minusDI[indicators.adx.minusDI.length - 1]?.value || 0;

  const direction = plusDI > minusDI ? 1 : -1;
  if (adx > 30) return 3 * direction;
  if (adx > 20) return 2 * direction;
  return 0;
}

function scoreMAAlignment(indicators) {
  if (!indicators?.ma) return 0;
  const ma7 = indicators.ma[7]?.[indicators.ma[7].length - 1]?.value;
  const ma25 = indicators.ma[25]?.[indicators.ma[25].length - 1]?.value;
  const ma99 = indicators.ma[99]?.[indicators.ma[99].length - 1]?.value;
  if (!ma7 || !ma25 || !ma99) return 0;

  if (ma7 > ma25 && ma25 > ma99) return 2;
  if (ma7 < ma25 && ma25 < ma99) return -2;
  return 0;
}

function scoreMASlope(indicators) {
  if (!indicators?.ma?.[25] || indicators.ma[25].length < 13) return 0;
  const ma = indicators.ma[25];
  const current = ma[ma.length - 1].value;
  const prev = ma[ma.length - 13]?.value; // 12 bars ago (60 min for 5m)
  if (!prev) return 0;

  const pctChange = ((current - prev) / prev) * 100;
  if (pctChange > 0.15) return 2;
  if (pctChange > 0.05) return 1;
  if (pctChange < -0.15) return -2;
  if (pctChange < -0.05) return -1;
  return 0;
}

function scoreRSI(indicators) {
  const rsi = indicators?.rsi?.[indicators.rsi.length - 1]?.value;
  if (rsi === undefined) return 0;
  if (rsi > 70) return 2;
  if (rsi > 55) return 1;
  if (rsi < 30) return -2;
  if (rsi < 45) return -1;
  return 0;
}

function scoreBollinger(indicators, klines) {
  if (!indicators?.bollinger || !klines?.length) return 0;
  const bb = indicators.bollinger;
  const upper = bb.upper[bb.upper.length - 1]?.value;
  const lower = bb.lower[bb.lower.length - 1]?.value;
  const mid = bb.middle[bb.middle.length - 1]?.value;
  if (!upper || !lower || !mid) return 0;

  const bbWidth = ((upper - lower) / mid) * 100;
  if (bbWidth < 0.3) return 0; // Bands too tight

  const close = klines[klines.length - 1].close;
  if (close > mid) return 1;
  if (close < mid) return -1;
  return 0;
}

function scorePriceStructure(klines, lookback = 36) {
  if (!klines || klines.length < lookback) return 0;
  const slice = klines.slice(-lookback);
  const highs = slice.map((k) => k.high);
  const lows = slice.map((k) => k.low);

  const mid = Math.floor(slice.length / 2);
  const recentHigh = Math.max(...highs.slice(mid));
  const prevHigh = Math.max(...highs.slice(0, mid));
  const recentLow = Math.min(...lows.slice(mid));
  const prevLow = Math.min(...lows.slice(0, mid));

  if (recentHigh > prevHigh && recentLow > prevLow) return 2; // HH + HL
  if (recentHigh < prevHigh && recentLow < prevLow) return -2; // LH + LL
  return 0;
}

export function useRegime(indicators, klines) {
  return useMemo(() => {
    if (!indicators || !klines?.length || klines.length < 50) {
      return { regime: 'UNKNOWN', score: 0, components: {} };
    }

    const components = {
      adx: scoreADX(indicators),
      maAlignment: scoreMAAlignment(indicators),
      maSlope: scoreMASlope(indicators),
      rsi: scoreRSI(indicators),
      bollinger: scoreBollinger(indicators, klines),
      priceStructure: scorePriceStructure(klines),
    };

    const score = Object.values(components).reduce((s, v) => s + v, 0);
    const threshold = 4;

    let regime;
    if (score > threshold) regime = 'UPTREND';
    else if (score < -threshold) regime = 'DOWNTREND';
    else regime = 'RANGING';

    return { regime, score, components };
  }, [indicators, klines]);
}
