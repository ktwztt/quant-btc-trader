import { useMemo } from 'react';

// Sandbox: block access to dangerous globals
const BLOCKED_PROPS = ['window', 'document', 'fetch', 'eval', 'Function', 'XMLHttpRequest', 'WebSocket', 'import', 'require', 'globalThis', 'global', 'self'];

function createSandboxProxy(signals) {
  return new Proxy(signals, {
    get(target, prop) {
      if (BLOCKED_PROPS.includes(prop)) return undefined;
      return target[prop];
    },
  });
}

function executeCustomStrategy(code, signals) {
  try {
    const sandboxed = createSandboxProxy(signals);
    // Support both function style and object with evaluate method
    const fn = new Function('signals', `
      "use strict";
      ${code}
      if (typeof evaluate === 'function') return evaluate(signals);
      throw new Error('策略必须定义 evaluate(signals) 函数');
    `);
    const result = fn(sandboxed);
    if (result === 'BUY' || result === 'SELL' || result === 'HOLD') {
      return { signal: result, error: null };
    }
    return { signal: 'HOLD', error: `返回值无效: ${result}，必须是 BUY/SELL/HOLD` };
  } catch (e) {
    return { signal: 'HOLD', error: e.message };
  }
}

// Built-in composite strategy
function builtinStrategy(indicators, regime, polymarket, config) {
  if (!indicators || !regime || regime.regime === 'UNKNOWN') {
    return { signal: 'HOLD', confidence: 0, bullScore: 0, bearScore: 0, reasons: [], summary: '观望 — 数据不足' };
  }

  const sc = config || {};
  let bullScore = 0;
  let bearScore = 0;
  const reasons = [];

  // 1. Regime direction
  const regimeWeight = sc.regimeWeight ?? 2;
  if (regime.regime === 'UPTREND') {
    bullScore += regimeWeight;
    reasons.push({ text: 'Regime 上涨趋势', dir: 'UP', weight: regimeWeight });
  } else if (regime.regime === 'DOWNTREND') {
    bearScore += regimeWeight;
    reasons.push({ text: 'Regime 下跌趋势', dir: 'DOWN', weight: regimeWeight });
  }

  // 2. MA alignment
  const maWeight = sc.maWeight ?? 1;
  const ma7 = indicators.ma?.[7]?.[indicators.ma[7].length - 1]?.value;
  const ma25 = indicators.ma?.[25]?.[indicators.ma[25].length - 1]?.value;
  const ma99 = indicators.ma?.[99]?.[indicators.ma[99].length - 1]?.value;
  if (ma7 && ma25 && ma99) {
    if (ma7 > ma25 && ma25 > ma99) {
      bullScore += maWeight;
      reasons.push({ text: 'MA 多头排列', dir: 'UP', weight: maWeight });
    } else if (ma7 < ma25 && ma25 < ma99) {
      bearScore += maWeight;
      reasons.push({ text: 'MA 空头排列', dir: 'DOWN', weight: maWeight });
    }
  }

  // 3. RSI
  const rsiWeight = sc.rsiWeight ?? 2;
  const rsi = indicators.rsi?.[indicators.rsi.length - 1]?.value;
  if (rsi !== undefined) {
    const oversold = sc.rsiOversold ?? 30;
    const overbought = sc.rsiOverbought ?? 70;
    const weakOversold = sc.rsiWeakOversold ?? 40;
    const weakOverbought = sc.rsiWeakOverbought ?? 60;
    if (rsi < oversold) {
      bullScore += rsiWeight;
      reasons.push({ text: `RSI 超卖 ${rsi.toFixed(0)}`, dir: 'UP', weight: rsiWeight });
    } else if (rsi < weakOversold) {
      bullScore += 1;
      reasons.push({ text: `RSI 偏低 ${rsi.toFixed(0)}`, dir: 'UP', weight: 1 });
    } else if (rsi > overbought) {
      bearScore += rsiWeight;
      reasons.push({ text: `RSI 超买 ${rsi.toFixed(0)}`, dir: 'DOWN', weight: rsiWeight });
    } else if (rsi > weakOverbought) {
      bearScore += 1;
      reasons.push({ text: `RSI 偏高 ${rsi.toFixed(0)}`, dir: 'DOWN', weight: 1 });
    }
  }

  // 4. MACD
  const macdWeight = sc.macdWeight ?? 2;
  if (indicators.macd?.histogram?.length > 2) {
    const h = indicators.macd.histogram;
    const curr = h[h.length - 1]?.value;
    const prev = h[h.length - 2]?.value;
    if (curr > 0 && prev <= 0) {
      bullScore += macdWeight;
      reasons.push({ text: 'MACD 金叉', dir: 'UP', weight: macdWeight });
    } else if (curr < 0 && prev >= 0) {
      bearScore += macdWeight;
      reasons.push({ text: 'MACD 死叉', dir: 'DOWN', weight: macdWeight });
    } else if (curr > 0) {
      bullScore += 1;
      reasons.push({ text: 'MACD 多头', dir: 'UP', weight: 1 });
    } else if (curr < 0) {
      bearScore += 1;
      reasons.push({ text: 'MACD 空头', dir: 'DOWN', weight: 1 });
    }
  }

  // 5. BB position
  const bbWeight = sc.bbWeight ?? 1;
  if (indicators.bbPctB?.length) {
    const pctb = indicators.bbPctB[indicators.bbPctB.length - 1]?.value;
    if (pctb < 0) {
      bullScore += bbWeight;
      reasons.push({ text: 'BB 下轨突破', dir: 'UP', weight: bbWeight });
    } else if (pctb > 1) {
      bearScore += bbWeight;
      reasons.push({ text: 'BB 上轨突破', dir: 'DOWN', weight: bbWeight });
    }
  }

  // 6. ADX trend strength
  const adxWeight = sc.adxWeight ?? 1;
  const adxThresh = sc.adxStrongThreshold ?? 25;
  const adx = indicators.adx?.adx?.[indicators.adx.adx.length - 1]?.value;
  const plusDI = indicators.adx?.plusDI?.[indicators.adx.plusDI.length - 1]?.value;
  const minusDI = indicators.adx?.minusDI?.[indicators.adx.minusDI.length - 1]?.value;
  if (adx > adxThresh && plusDI !== undefined && minusDI !== undefined) {
    if (plusDI > minusDI) {
      bullScore += adxWeight;
      reasons.push({ text: `ADX 强趋势 +DI`, dir: 'UP', weight: adxWeight });
    } else {
      bearScore += adxWeight;
      reasons.push({ text: `ADX 强趋势 -DI`, dir: 'DOWN', weight: adxWeight });
    }
  }

  // 7. Polymarket pricing edge
  const polyWeight = sc.polymarketWeight ?? 1;
  const polyThresh = sc.polymarketEdgeThreshold ?? 0.45;
  if (polymarket?.outcomes?.length === 2) {
    const upPrice = polymarket.outcomes[0].price;
    const downPrice = polymarket.outcomes[1].price;
    if (bullScore > bearScore && upPrice < polyThresh) {
      bullScore += polyWeight;
      reasons.push({ text: `UP 合约低价 ${(upPrice * 100).toFixed(0)}¢`, dir: 'UP', weight: polyWeight });
    } else if (bearScore > bullScore && downPrice < polyThresh) {
      bearScore += polyWeight;
      reasons.push({ text: `DOWN 合约低价 ${(downPrice * 100).toFixed(0)}¢`, dir: 'DOWN', weight: polyWeight });
    }
  }

  // Decision
  const diff = Math.abs(bullScore - bearScore);
  const strongThresh = sc.strongThreshold ?? 3;
  const mediumThresh = sc.mediumThreshold ?? 2;
  const strongCap = sc.strongConfidenceCap ?? 1.0;
  const mediumCap = sc.mediumConfidenceCap ?? 0.7;

  let signal = 'HOLD';
  let confidence = 0;

  if (diff >= strongThresh && bullScore > bearScore) {
    signal = 'BUY';
    confidence = Math.min(bullScore / 10, strongCap);
  } else if (diff >= strongThresh && bearScore > bullScore) {
    signal = 'SELL';
    confidence = Math.min(bearScore / 10, strongCap);
  } else if (diff >= mediumThresh && bullScore > bearScore) {
    signal = 'BUY';
    confidence = Math.min(bullScore / 12, mediumCap);
  } else if (diff >= mediumThresh && bearScore > bullScore) {
    signal = 'SELL';
    confidence = Math.min(bearScore / 12, mediumCap);
  }

  return {
    signal,
    confidence,
    bullScore,
    bearScore,
    reasons,
    summary: signal === 'HOLD'
      ? '观望 — 信号不足或矛盾'
      : signal === 'BUY'
      ? `做多 — ${reasons.filter((r) => r.dir === 'UP').length} 个看涨信号`
      : `做空 — ${reasons.filter((r) => r.dir === 'DOWN').length} 个看跌信号`,
  };
}

// Build signals object for custom strategies
function buildSignals(indicators, regime, polymarket, currentPrice, klines, fundingRate) {
  if (!indicators) return null;

  const last = (arr) => arr?.[arr.length - 1]?.value;

  return {
    price: currentPrice,
    rsi: last(indicators.rsi),
    macd: indicators.macd ? {
      histogram: last(indicators.macd.histogram),
      line: last(indicators.macd.line),
      signal: last(indicators.macd.signal),
    } : null,
    ma: indicators.ma ? {
      7: last(indicators.ma[7]),
      25: last(indicators.ma[25]),
      99: last(indicators.ma[99]),
    } : null,
    ema: indicators.ema ? {
      9: last(indicators.ema[9]),
      21: last(indicators.ema[21]),
      55: last(indicators.ema[55]),
    } : null,
    bb: indicators.bollinger ? {
      upper: last(indicators.bollinger.upper),
      middle: last(indicators.bollinger.middle),
      lower: last(indicators.bollinger.lower),
      pctB: last(indicators.bbPctB),
    } : null,
    adx: indicators.adx ? {
      adx: last(indicators.adx.adx),
      plusDI: last(indicators.adx.plusDI),
      minusDI: last(indicators.adx.minusDI),
    } : null,
    atr: last(indicators.atr),
    stoch: indicators.stoch ? { k: last(indicators.stoch.k), d: last(indicators.stoch.d) } : null,
    mfi: last(indicators.mfi),
    cci: last(indicators.cci),
    williamsR: last(indicators.williamsR),
    obv: last(indicators.obv),
    vwap: last(indicators.vwap),
    regime: regime || null,
    fundingRate,
    polymarket: polymarket || null,
    klines: klines?.slice(-500) || [],
  };
}

export function useStrategy(indicators, regime, polymarket, { customCode, strategyConfig, currentPrice, klines, fundingRate } = {}) {
  return useMemo(() => {
    // If custom strategy code is provided, execute it
    if (customCode) {
      const signals = buildSignals(indicators, regime, polymarket, currentPrice, klines, fundingRate);
      if (!signals) {
        return { signal: 'HOLD', confidence: 0, bullScore: 0, bearScore: 0, reasons: [], summary: '观望 — 数据不足', error: null, isCustom: true };
      }

      const { signal, error } = executeCustomStrategy(customCode, signals);

      // Still compute builtin scores for display
      const builtin = builtinStrategy(indicators, regime, polymarket, strategyConfig);

      if (error) {
        return { ...builtin, error, isCustom: true, customSignal: signal };
      }

      return {
        ...builtin,
        signal,
        summary: signal === 'HOLD'
          ? '观望 — 自定义策略'
          : signal === 'BUY'
          ? '做多 — 自定义策略'
          : '做空 — 自定义策略',
        error: null,
        isCustom: true,
      };
    }

    // Default: builtin strategy
    return { ...builtinStrategy(indicators, regime, polymarket, strategyConfig), error: null, isCustom: false };
  }, [indicators, regime, polymarket, customCode, strategyConfig, currentPrice, klines, fundingRate]);
}
