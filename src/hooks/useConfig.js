import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_CONFIG, STORAGE_KEYS } from '../config/constants';

const CONFIG_KEY = 'quant_app_config';

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const saved = JSON.parse(raw);
    return deepMerge(structuredClone(DEFAULT_CONFIG), saved);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export function useConfig() {
  const [config, setConfig] = useState(loadConfig);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CONFIG_KEY) setConfig(loadConfig());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const updateConfig = useCallback((path, value) => {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const fresh = structuredClone(DEFAULT_CONFIG);
    setConfig(fresh);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(fresh));
  }, []);

  const resetSection = useCallback((section) => {
    setConfig((prev) => {
      const next = structuredClone(prev);
      if (section === 'strategy') {
        next.strategy = structuredClone(DEFAULT_CONFIG.strategy);
      } else {
        next[section] = structuredClone(DEFAULT_CONFIG[section]);
      }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { config, updateConfig, resetConfig, resetSection };
}
