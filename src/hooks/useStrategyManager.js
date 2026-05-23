import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../config/constants';

const BUILTIN_STRATEGY = {
  id: '__builtin__',
  name: '内置策略',
  code: `// 内置复合策略 — 基于 Regime + 技术指标 + Polymarket 评分
// 此策略为系统默认，不可编辑
function evaluate(signals) {
  // 由 useStrategy.js 内部处理
  return 'HOLD';
}`,
  builtin: true,
};

function loadStrategies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_STRATEGIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadActiveId() {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_STRATEGY) || '__builtin__';
}

export function useStrategyManager() {
  const [strategies, setStrategies] = useState(loadStrategies);
  const [activeStrategyId, setActiveStrategyId] = useState(loadActiveId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_STRATEGIES, JSON.stringify(strategies));
  }, [strategies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STRATEGY, activeStrategyId);
  }, [activeStrategyId]);

  const allStrategies = [BUILTIN_STRATEGY, ...strategies];

  const activeStrategy = allStrategies.find((s) => s.id === activeStrategyId) || BUILTIN_STRATEGY;

  const saveStrategy = useCallback((strategy) => {
    setStrategies((prev) => {
      const exists = prev.find((s) => s.id === strategy.id);
      if (exists) {
        return prev.map((s) => (s.id === strategy.id ? { ...s, ...strategy, updatedAt: Date.now() } : s));
      }
      return [...prev, { ...strategy, createdAt: Date.now(), updatedAt: Date.now() }];
    });
  }, []);

  const deleteStrategy = useCallback((id) => {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    setActiveStrategyId((curr) => (curr === id ? '__builtin__' : curr));
  }, []);

  const renameStrategy = useCallback((id, name) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s))
    );
  }, []);

  const createNew = useCallback(() => {
    const id = `strat_${Date.now()}`;
    const newStrategy = {
      id,
      name: `策略 ${strategies.length + 1}`,
      code: `// 自定义策略\n// signals 包含: rsi, macd, ma, bb, adx, regime, fundingRate, polymarket, price, klines\n// 返回: 'BUY' | 'SELL' | 'HOLD'\n\nfunction evaluate(signals) {\n  // 示例: RSI 超卖做多\n  if (signals.rsi < 30) return 'BUY';\n  if (signals.rsi > 70) return 'SELL';\n  return 'HOLD';\n}`,
    };
    saveStrategy(newStrategy);
    setActiveStrategyId(id);
    return id;
  }, [strategies.length, saveStrategy]);

  return {
    strategies: allStrategies,
    activeStrategy,
    activeStrategyId,
    setActiveStrategyId,
    saveStrategy,
    deleteStrategy,
    renameStrategy,
    createNew,
  };
}
