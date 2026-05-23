import { useEffect, useRef, useState, useCallback } from 'react';
import { BINANCE_WS_BASE, BINANCE_REST_BASE, SYMBOL } from '../config/constants';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h'];
const INTERVAL_LABELS = { '1m': '1分钟', '5m': '5分钟', '15m': '15分钟', '1h': '1小时', '4h': '4小时' };

export { INTERVALS, INTERVAL_LABELS };

export function useBinanceWS(initialInterval = '5m') {
  const [klines, setKlines] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [fundingRate, setFundingRate] = useState(null);
  const [interval, setInterval_] = useState(initialInterval);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const fundingIntervalRef = useRef(null);
  const intervalRef = useRef(initialInterval);
  intervalRef.current = interval;

  const changeInterval = useCallback((newInterval) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    setKlines([]);
    setInterval_(newInterval);
  }, []);

  // Fetch historical klines via REST
  const fetchHistory = useCallback(async () => {
    try {
      const url = `${BINANCE_REST_BASE}/klines?symbol=${SYMBOL.toUpperCase()}&interval=${intervalRef.current}&limit=500`;
      const res = await fetch(url);
      const data = await res.json();
      const parsed = data.map((k) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
      setKlines(parsed);
      if (parsed.length > 0) setCurrentPrice(parsed[parsed.length - 1].close);
    } catch (err) {
      console.error('Failed to fetch kline history:', err);
    }
  }, []);

  // Fetch funding rate
  const fetchFundingRate = useCallback(async () => {
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
      if (res.ok) {
        const data = await res.json();
        setFundingRate(parseFloat(data.lastFundingRate));
      }
    } catch { /* ignore */ }
  }, []);

  // Connect WebSocket
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const streamName = `${SYMBOL}@kline_${intervalRef.current}`;
    const ws = new WebSocket(`${BINANCE_WS_BASE}/${streamName}`);

    ws.onopen = () => { setConnected(true); };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.e !== 'kline') return;
      const k = msg.k;
      const candle = {
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o), high: parseFloat(k.h),
        low: parseFloat(k.l), close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };
      setCurrentPrice(candle.close);
      setKlines((prev) => {
        if (!prev.length) return [candle];
        const last = prev[prev.length - 1];
        if (candle.time === last.time) {
          const u = [...prev]; u[u.length - 1] = candle; return u;
        }
        return candle.time > last.time ? [...prev, candle] : prev;
      });
    };
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connectWS, 3000);
    };
    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    fetchHistory().then(() => connectWS());
    fetchFundingRate();
    fundingIntervalRef.current = window.setInterval(fetchFundingRate, 300000);
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      if (fundingIntervalRef.current) { clearInterval(fundingIntervalRef.current); fundingIntervalRef.current = null; }
    };
  }, [fetchHistory, connectWS, fetchFundingRate, interval]);

  return { klines, currentPrice, connected, fundingRate, interval, setInterval: changeInterval };
}
