import { useEffect, useState, useRef, useCallback } from 'react';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_HOST = 'https://clob.polymarket.com';
const TIMEFRAME = '5m';
const TIMEFRAME_SECONDS = 300;
const ASSET_SLUG = 'btc';

// ── 市场发现 ──

function buildSlug(slot) {
  return `${ASSET_SLUG}-updown-${TIMEFRAME}-${slot}`;
}

async function fetchActiveMarket() {
  const now = Math.floor(Date.now() / 1000);
  const currentSlot = Math.floor(now / TIMEFRAME_SECONDS) * TIMEFRAME_SECONDS;
  const slotsToTry = [currentSlot, currentSlot - TIMEFRAME_SECONDS, currentSlot + TIMEFRAME_SECONDS];

  for (const slot of slotsToTry) {
    const slug = buildSlug(slot);
    try {
      const res = await fetch(`${GAMMA_API}/events?slug=${slug}`);
      if (!res.ok) continue;

      const events = await res.json();
      if (!events || events.length === 0) continue;

      const event = events[0];
      if (!event.active || event.closed) continue;

      const markets = event.markets || [];
      for (const market of markets) {
        if (!market.active || market.closed) continue;

        let clobTokenIds = market.clobTokenIds;
        let outcomes = market.outcomes;
        if (typeof clobTokenIds === 'string') clobTokenIds = JSON.parse(clobTokenIds);
        if (typeof outcomes === 'string') outcomes = JSON.parse(outcomes);
        if (!clobTokenIds || clobTokenIds.length < 2) continue;

        const upIdx = outcomes.indexOf('Up') !== -1 ? outcomes.indexOf('Up') : 0;
        const downIdx = outcomes.indexOf('Down') !== -1 ? outcomes.indexOf('Down') : 1;

        // Parse volume and liquidity
        let volume24h = 0;
        let liquidity = 0;
        try {
          volume24h = parseFloat(market.volumeNum24hr || event.volumeNum24hr || '0');
        } catch { /* ignore */ }
        try {
          liquidity = parseFloat(market.liquidityNum || '0');
        } catch { /* ignore */ }

        return {
          slug,
          question: market.question || event.title || slug,
          conditionId: market.conditionId,
          upTokenId: clobTokenIds[upIdx],
          downTokenId: clobTokenIds[downIdx],
          endTime: (slot + TIMEFRAME_SECONDS) * 1000,
          negRisk: market.negRisk || false,
          slot,
          volume24h,
          liquidity,
          outcomes,
        };
      }
    } catch (err) {
      console.debug('[Polymarket] 市场查找异常:', slug, err.message);
      continue;
    }
  }
  return null;
}

// ── 订单簿查询 ──

async function fetchOrderbook(tokenId) {
  try {
    const res = await fetch(`${CLOB_HOST}/book?token_id=${tokenId}`);
    if (!res.ok) return { ask: 0, bid: 0 };
    const data = await res.json();
    const asks = data.asks || [];
    const bids = data.bids || [];
    const bestAsk = asks.length > 0 ? Math.min(...asks.map((a) => parseFloat(a.price))) : 0;
    const bestBid = bids.length > 0 ? Math.max(...bids.map((b) => parseFloat(b.price))) : 0;
    return { ask: bestAsk, bid: bestBid };
  } catch {
    return { ask: 0, bid: 0 };
  }
}

// ── 结算结果查询 ──

async function fetchSettlementResults(count = 10) {
  const results = [];
  const now = Math.floor(Date.now() / 1000);
  const currentSlot = Math.floor(now / TIMEFRAME_SECONDS) * TIMEFRAME_SECONDS;

  for (let i = 1; i <= count + 5; i++) {
    const slot = currentSlot - i * TIMEFRAME_SECONDS;
    const slug = buildSlug(slot);
    try {
      const res = await fetch(`${GAMMA_API}/events?slug=${slug}`);
      if (!res.ok) continue;
      const events = await res.json();
      if (!events || events.length === 0) continue;

      const event = events[0];
      const markets = event.markets || [];
      for (const market of markets) {
        if (!market.resolved) continue;

        let outcome = market.outcome || '';
        if (!outcome) {
          // Fallback: check outcomePrices
          let outcomes = market.outcomes;
          let prices = market.outcomePrices;
          if (typeof outcomes === 'string') outcomes = JSON.parse(outcomes);
          if (typeof prices === 'string') prices = JSON.parse(prices);
          if (outcomes && prices && outcomes.length === prices.length) {
            const priceList = prices.map(Number);
            const maxIdx = priceList.indexOf(Math.max(...priceList));
            if (priceList[maxIdx] > 0.9) outcome = outcomes[maxIdx];
          }
        }

        if (outcome === 'Up' || outcome === 'Down') {
          results.push({
            id: `settlement-${slot}`,
            time: new Date(slot * 1000),
            result: outcome === 'Up' ? 'UP' : 'DOWN',
            priceAtClose: parseFloat(market.outcomePrices ? JSON.parse(market.outcomePrices)[0] : '0'),
            settlementPrice: outcome === 'Up' ? 1 : 0,
            slug,
          });
        }
        break;
      }
    } catch {
      continue;
    }

    if (results.length >= count) break;
  }

  return results;
}

// ── Hook ──

export function usePolymarket(currentPrice) {
  const [market, setMarket] = useState(null);
  const [history, setHistory] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const intervalRef = useRef(null);
  const priceRef = useRef(null);
  priceRef.current = currentPrice;

  const updateMarket = useCallback(async () => {
    try {
      // 1. 发现当前活跃市场
      const activeMarket = await fetchActiveMarket();
      if (!activeMarket) {
        console.warn('[Polymarket] 未找到活跃的 5m 市场');
        setConnected(false);
        return;
      }

      // 2. 查询订单簿价格
      const [upBook, downBook] = await Promise.all([
        fetchOrderbook(activeMarket.upTokenId),
        fetchOrderbook(activeMarket.downTokenId),
      ]);

      // 3. 构造展示数据
      const upPrice = upBook.ask > 0 ? upBook.ask : upBook.bid > 0 ? upBook.bid : 0.5;
      const downPrice = downBook.ask > 0 ? downBook.ask : downBook.bid > 0 ? downBook.bid : 1 - upPrice;

      setMarket({
        id: activeMarket.slug,
        question: activeMarket.question,
        conditionId: activeMarket.conditionId,
        upTokenId: activeMarket.upTokenId,
        downTokenId: activeMarket.downTokenId,
        outcomes: [
          {
            name: '收涨 (UP)',
            price: upPrice,
            bid: upBook.bid,
            ask: upBook.ask,
            change: 0,
            color: '#00c853',
          },
          {
            name: '收跌 (DOWN)',
            price: downPrice,
            bid: downBook.bid,
            ask: downBook.ask,
            change: 0,
            color: '#ff1744',
          },
        ],
        volume24h: activeMarket.volume24h,
        liquidity: activeMarket.liquidity,
        endTime: activeMarket.endTime,
        resolved: false,
        slot: activeMarket.slot,
      });

      // 4. 记录价格历史
      setPriceHistory((prev) => {
        const next = [...prev, { time: Date.now(), up: upPrice }];
        return next.slice(-60);
      });

      setConnected(true);
    } catch (err) {
      console.error('[Polymarket] 更新失败:', err);
      setConnected(false);
    }
  }, []);

  // 初始化：加载历史结算 + 首次市场数据
  useEffect(() => {
    (async () => {
      const results = await fetchSettlementResults(10);
      if (results.length > 0) setHistory(results);
      await updateMarket();
    })();

    // 每 5 秒轮询
    intervalRef.current = setInterval(updateMarket, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateMarket]);

  return { market, history, priceHistory, connected };
}
