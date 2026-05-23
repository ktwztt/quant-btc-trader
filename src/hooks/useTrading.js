import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'quant_poly_trades';
const MAX_TRADES = 100;

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useTrading(currentPrice, market, polyCreds) {
  const [trades, setTrades] = useState(loadTrades);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  const polyHeaders = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (polyCreds) h['X-Poly-Creds'] = JSON.stringify(polyCreds);
    return h;
  }, [polyCreds]);

  const executeTrade = useCallback(async (outcome, size, price) => {
    setSubmitting(true);
    setLastError(null);

    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: polyHeaders(),
        body: JSON.stringify({
          action: 'trade',
          side: 'buy',
          outcome,
          size: parseInt(size),
          price: parseFloat(price),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLastError(data.error || '下单失败');
        return { success: false, error: data.error };
      }

      const trade = {
        id: Date.now(),
        orderId: data.result?.orderID,
        outcome,
        side: 'buy',
        size: parseInt(size),
        price: parseFloat(price),
        total: parseInt(size) * parseFloat(price),
        time: new Date().toISOString(),
        status: 'open',
        market: data.market,
      };

      setTrades((prev) => [trade, ...prev].slice(0, MAX_TRADES));
      return { success: true, trade, result: data.result };
    } catch (e) {
      setLastError(e.message);
      return { success: false, error: e.message };
    } finally {
      setSubmitting(false);
    }
  }, [polyHeaders]);

  const checkOrderStatus = useCallback(async (orderId) => {
    try {
      const res = await fetch(`/api/trade?action=status&orderId=${orderId}`, {
        headers: polyHeaders(),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return { status: 'error', error: e.message };
    }
  }, [polyHeaders]);

  const cancelOrder = useCallback(async (orderId) => {
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: polyHeaders(),
        body: JSON.stringify({ action: 'cancel', orderId }),
      });
      const data = await res.json();
      if (res.ok) {
        setTrades((prev) =>
          prev.map((t) => (t.orderId === orderId ? { ...t, status: 'cancelled' } : t))
        );
      }
      return data;
    } catch (e) {
      return { error: e.message };
    }
  }, [polyHeaders]);

  const refreshStatuses = useCallback(async () => {
    const openTrades = trades.filter((t) => t.status === 'open' && t.orderId);
    if (openTrades.length === 0) return;

    for (const trade of openTrades) {
      const result = await checkOrderStatus(trade.orderId);
      if (result.status === 'filled' || result.status === 'cancelled') {
        setTrades((prev) =>
          prev.map((t) => (t.orderId === trade.orderId ? { ...t, status: result.status } : t))
        );
      }
    }
  }, [trades, checkOrderStatus]);

  useEffect(() => {
    const interval = window.setInterval(refreshStatuses, 10000);
    return () => clearInterval(interval);
  }, [refreshStatuses]);

  const openTrades = trades.filter((t) => t.status === 'open');
  const filledTrades = trades.filter((t) => t.status === 'filled');
  const totalSpent = filledTrades.reduce((sum, t) => sum + t.total, 0);

  return {
    trades,
    openTrades,
    filledTrades,
    totalSpent,
    submitting,
    lastError,
    setLastError,
    showTradeModal,
    setShowTradeModal,
    showSettingsModal,
    setShowSettingsModal,
    executeTrade,
    checkOrderStatus,
    cancelOrder,
    refreshStatuses,
  };
}
