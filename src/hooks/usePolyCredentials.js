import { useState, useCallback } from 'react';

const STORAGE_KEY = 'quant_poly_creds';
const TRADE_API = '/api/trade';

function loadCreds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefault();
    return { ...getDefault(), ...JSON.parse(raw) };
  } catch {
    return getDefault();
  }
}

function getDefault() {
  return {
    privateKey: '',
    apiKey: '',
    apiSecret: '',
    apiPassphrase: '',
    funderAddress: '',
    signatureType: 0,
    proxyUrl: '',
  };
}

export function usePolyCredentials() {
  const [creds, setCreds] = useState(loadCreds);

  const updateCred = useCallback((key, value) => {
    setCreds((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetCreds = useCallback(() => {
    const fresh = getDefault();
    setCreds(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const isConfigured = Boolean(creds.privateKey && creds.apiKey && creds.apiSecret && creds.apiPassphrase);

  const testConnection = useCallback(async () => {
    try {
      const res = await fetch(`${TRADE_API}?action=market`, {
        headers: { 'X-Poly-Creds': JSON.stringify(creds) },
      });
      const data = await res.json();
      if (res.ok && data.market) {
        return { ok: true, market: data.market.slug };
      }
      return { ok: false, error: data.error || '连接失败' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [creds]);

  return { creds, updateCred, resetCreds, isConfigured, testConnection };
}
