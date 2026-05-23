import { useMemo } from 'react';
import {
  MA_PERIODS, EMA_PERIODS, MACD_PARAMS, RSI_PERIOD, BOLLINGER_PARAMS,
  ATR_PERIOD, STOCH_PARAMS, ADX_PERIOD, MFI_PERIOD, CCI_PERIOD, WILLIAMS_R_PERIOD,
} from '../config/constants';

// ── Simple Moving Average ──
function calcSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

// ── Exponential Moving Average (fixed) ──
function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  let ema = 0;
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema = data[i].value;
    } else {
      ema = data[i].value * k + ema * (1 - k);
    }
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

// ── SMA on arbitrary {time, value} array ──
function calcSMAFromValues(arr, period) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) sum += arr[i - j].value;
    result.push({ time: arr[i].time, value: sum / period });
  }
  return result;
}

// ── MACD ──
function calcMACD(data, fast, slow, signal) {
  const closes = data.map((d) => ({ time: d.time, value: d.close }));
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);

  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    const val = (emaFast[i]?.value || 0) - (emaSlow[i]?.value || 0);
    macdLine.push({ time: data[i].time, value: val });
  }

  const signalLine = calcEMA(macdLine, signal);
  const histogram = [];
  for (let i = 0; i < data.length; i++) {
    const val = (macdLine[i]?.value || 0) - (signalLine[i]?.value || 0);
    histogram.push({
      time: data[i].time,
      value: val,
      color: val >= 0 ? 'rgba(0, 200, 83, 0.6)' : 'rgba(255, 23, 68, 0.6)',
    });
  }

  return { macdLine, signalLine, histogram };
}

// ── RSI ──
function calcRSI(data, period) {
  const result = [{ time: data[0].time, value: 50 }];
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
      } else {
        result.push({ time: data[i].time, value: 50 });
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
    }
  }
  return result;
}

// ── Bollinger Bands ──
function calcBollinger(data, period, stdDevMultiplier) {
  const upper = [], middle = [], lower = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, d) => s + d.close, 0) / period;
    const variance = slice.reduce((s, d) => s + (d.close - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper.push({ time: data[i].time, value: mean + stdDevMultiplier * stdDev });
    middle.push({ time: data[i].time, value: mean });
    lower.push({ time: data[i].time, value: mean - stdDevMultiplier * stdDev });
  }
  return { upper, middle, lower };
}

// ── ATR (Average True Range) ──
function calcATR(data, period) {
  const tr = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const hl = data[i].high - data[i].low;
      const hc = Math.abs(data[i].high - data[i - 1].close);
      const lc = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  // Wilder's smoothing
  const result = [];
  let atr = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      atr += tr[i];
      if (i === period - 1) {
        atr /= period;
        result.push({ time: data[i].time, value: atr });
      }
    } else {
      atr = (atr * (period - 1) + tr[i]) / period;
      result.push({ time: data[i].time, value: atr });
    }
  }
  return result;
}

// ── Stochastic Oscillator ──
function calcStoch(data, kPeriod, dPeriod) {
  const kValues = [];
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) continue;
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map((d) => d.high));
    const low = Math.min(...slice.map((d) => d.low));
    const k = high === low ? 50 : ((data[i].close - low) / (high - low)) * 100;
    kValues.push({ time: data[i].time, value: k });
  }
  const dValues = calcSMAFromValues(kValues, dPeriod);
  return { k: kValues, d: dValues };
}

// ── ADX (Average Directional Index) ──
function calcADX(data, period) {
  const plusDM = [], minusDM = [], tr = [];
  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const hl = data[i].high - data[i].low;
    const hc = Math.abs(data[i].high - data[i - 1].close);
    const lc = Math.abs(data[i].low - data[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }

  // Wilder's smoothing
  const smoothTR = [], smoothPlusDM = [], smoothMinusDM = [];
  let sTR = 0, sPDM = 0, sMDM = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period) {
      sTR += tr[i]; sPDM += plusDM[i]; sMDM += minusDM[i];
      if (i === period - 1) {
        smoothTR.push(sTR); smoothPlusDM.push(sPDM); smoothMinusDM.push(sMDM);
      }
    } else {
      sTR = sTR - sTR / period + tr[i];
      sPDM = sPDM - sPDM / period + plusDM[i];
      sMDM = sMDM - sMDM / period + minusDM[i];
      smoothTR.push(sTR); smoothPlusDM.push(sPDM); smoothMinusDM.push(sMDM);
    }
  }

  const plusDI = [], minusDI = [], dx = [];
  for (let i = 0; i < smoothTR.length; i++) {
    const pdi = (smoothPlusDM[i] / smoothTR[i]) * 100;
    const mdi = (smoothMinusDM[i] / smoothTR[i]) * 100;
    plusDI.push({ time: data[i + period].time, value: pdi });
    minusDI.push({ time: data[i + period].time, value: mdi });
    dx.push({ time: data[i + period].time, value: pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100 });
  }

  // ADX = EMA of DX
  const adx = [];
  let adxVal = 0;
  for (let i = 0; i < dx.length; i++) {
    if (i < period) {
      adxVal += dx[i].value;
      if (i === period - 1) {
        adxVal /= period;
        adx.push({ time: dx[i].time, value: adxVal });
      }
    } else {
      adxVal = (adxVal * (period - 1) + dx[i].value) / period;
      adx.push({ time: dx[i].time, value: adxVal });
    }
  }

  return { adx, plusDI, minusDI };
}

// ── VWAP (Volume-Weighted Average Price, daily reset) ──
function calcVWAP(data) {
  const result = [];
  let cumTPV = 0, cumVol = 0;
  let currentDay = '';

  for (let i = 0; i < data.length; i++) {
    const day = new Date(data[i].time * 1000).toISOString().slice(0, 10);
    if (day !== currentDay) {
      cumTPV = 0; cumVol = 0; currentDay = day;
    }
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    cumTPV += tp * data[i].volume;
    cumVol += data[i].volume;
    result.push({ time: data[i].time, value: cumVol === 0 ? tp : cumTPV / cumVol });
  }
  return result;
}

// ── OBV (On-Balance Volume) ──
function calcOBV(data) {
  const result = [{ time: data[0].time, value: data[0].volume }];
  for (let i = 1; i < data.length; i++) {
    const prev = result[i - 1].value;
    if (data[i].close > data[i - 1].close) {
      result.push({ time: data[i].time, value: prev + data[i].volume });
    } else if (data[i].close < data[i - 1].close) {
      result.push({ time: data[i].time, value: prev - data[i].volume });
    } else {
      result.push({ time: data[i].time, value: prev });
    }
  }
  return result;
}

// ── MFI (Money Flow Index) ──
function calcMFI(data, period) {
  const result = [];
  const rawMF = data.map((d) => ({
    time: d.time,
    value: ((d.high + d.low + d.close) / 3) * d.volume,
    positive: d.close >= (data[Math.max(0, data.indexOf(d) - 1)]?.close || d.close),
  }));

  for (let i = period; i < data.length; i++) {
    let posSum = 0, negSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (j > 0 && data[j].close > data[j - 1].close) {
        posSum += ((data[j].high + data[j].low + data[j].close) / 3) * data[j].volume;
      } else if (j > 0) {
        negSum += ((data[j].high + data[j].low + data[j].close) / 3) * data[j].volume;
      }
    }
    const mfr = negSum === 0 ? 100 : posSum / negSum;
    result.push({ time: data[i].time, value: 100 - 100 / (1 + mfr) });
  }
  return result;
}

// ── CCI (Commodity Channel Index) ──
function calcCCI(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const tp = slice.map((d) => (d.high + d.low + d.close) / 3);
    const mean = tp.reduce((s, v) => s + v, 0) / period;
    const meanDev = tp.reduce((s, v) => s + Math.abs(v - mean), 0) / period;
    const currentTP = (data[i].high + data[i].low + data[i].close) / 3;
    const cci = meanDev === 0 ? 0 : (currentTP - mean) / (0.015 * meanDev);
    result.push({ time: data[i].time, value: cci });
  }
  return result;
}

// ── Williams %R ──
function calcWilliamsR(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map((d) => d.high));
    const low = Math.min(...slice.map((d) => d.low));
    const wr = high === low ? -50 : ((high - data[i].close) / (high - low)) * -100;
    result.push({ time: data[i].time, value: wr });
  }
  return result;
}

// ── BB%B (Bollinger Band Percent B) ──
function calcBBPercentB(data, bollinger) {
  if (!bollinger || !bollinger.upper.length) return [];
  const result = [];
  for (let i = 0; i < bollinger.upper.length; i++) {
    const time = bollinger.upper[i].time;
    const kline = data.find((d) => d.time === time);
    if (!kline) continue;
    const upper = bollinger.upper[i].value;
    const lower = bollinger.lower[i].value;
    const range = upper - lower;
    result.push({ time, value: range === 0 ? 0.5 : (kline.close - lower) / range });
  }
  return result;
}

// ── Main Hook ──
export function useIndicators(klines) {
  return useMemo(() => {
    if (klines.length < 30) {
      return { ma: {}, ema: {}, macd: null, rsi: [], bollinger: null, bbPctB: [], atr: [], stoch: null, adx: null, vwap: [], obv: [], mfi: [], cci: [], williamsR: [] };
    }

    // Phase 1: Core indicators
    const ma = {};
    for (const period of MA_PERIODS) ma[period] = calcSMA(klines, period);

    const ema = {};
    for (const period of EMA_PERIODS) {
      const closes = klines.map((d) => ({ time: d.time, value: d.close }));
      ema[period] = calcEMA(closes, period);
    }

    const macd = calcMACD(klines, MACD_PARAMS.fast, MACD_PARAMS.slow, MACD_PARAMS.signal);
    const rsi = calcRSI(klines, RSI_PERIOD);
    const bollinger = calcBollinger(klines, BOLLINGER_PARAMS.period, BOLLINGER_PARAMS.stdDev);

    // Phase 2: Extended indicators
    const atr = calcATR(klines, ATR_PERIOD);
    const stoch = calcStoch(klines, STOCH_PARAMS.kPeriod, STOCH_PARAMS.dPeriod);
    const adx = calcADX(klines, ADX_PERIOD);
    const vwap = calcVWAP(klines);
    const obv = calcOBV(klines);
    const mfi = calcMFI(klines, MFI_PERIOD);
    const cci = calcCCI(klines, CCI_PERIOD);
    const williamsR = calcWilliamsR(klines, WILLIAMS_R_PERIOD);
    const bbPctB = calcBBPercentB(klines, bollinger);

    return { ma, ema, macd, rsi, bollinger, bbPctB, atr, stoch, adx, vwap, obv, mfi, cci, williamsR };
  }, [klines]);
}
