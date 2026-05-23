import { useState } from 'react';

export default function TradeModal({ isOpen, onClose, market, onExecute, openTrades, onCancel, submitting, lastError }) {
  const [outcome, setOutcome] = useState('up');
  const [size, setSize] = useState('10');
  const [tab, setTab] = useState('trade');
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const outcomePrice = market?.outcomes?.[outcome === 'up' ? 0 : 1]?.price || 0.5;
  const total = parseInt(size || 0) * outcomePrice;

  const handleExecute = async () => {
    const result = await onExecute(outcome, size, outcomePrice);
    if (result?.success) {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 bg-dark-surface border border-dark-border rounded-vercel-lg shadow-vercel-5 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h2 className="text-lg font-semibold tracking-tight-display">Polymarket 交易</h2>
            <p className="text-xs font-mono text-dark-text-secondary mt-0.5">
              BTC 5分钟涨跌 · {market?.slug || '等待市场...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-dark-text-secondary hover:text-dark-text hover:bg-dark-card transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-border">
          {[
            { key: 'trade', label: '下单' },
            { key: 'orders', label: `挂单 (${openTrades?.length || 0})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setConfirming(false); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-dark-text border-b-2 border-white'
                  : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'trade' ? (
            <div className="space-y-4">
              {/* Market info */}
              {market && (
                <div className="p-3 rounded-vercel-md bg-dark-bg border border-dark-border">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-dark-text-secondary">到期时间</span>
                    <span className="text-dark-text">
                      {new Date(market.endTime).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-dark-text-secondary">当前价格</span>
                    <span className="text-dark-text">
                      ${market.currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Outcome selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setOutcome('up'); setConfirming(false); }}
                  className={`py-3 rounded-vercel-sm font-medium text-sm transition-all ${
                    outcome === 'up'
                      ? 'bg-up-green text-white'
                      : 'bg-dark-card text-dark-text-secondary hover:text-dark-text border border-dark-border'
                  }`}
                >
                  买 UP (收涨)
                </button>
                <button
                  onClick={() => { setOutcome('down'); setConfirming(false); }}
                  className={`py-3 rounded-vercel-sm font-medium text-sm transition-all ${
                    outcome === 'down'
                      ? 'bg-down-red text-white'
                      : 'bg-dark-card text-dark-text-secondary hover:text-dark-text border border-dark-border'
                  }`}
                >
                  买 DOWN (收跌)
                </button>
              </div>

              {/* Price display */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-vercel-md bg-dark-bg border border-dark-border">
                  <span className="text-[10px] font-mono text-dark-text-secondary block">UP 价格</span>
                  <span className="text-sm font-mono text-up-green">
                    {(market?.outcomes?.[0]?.price * 100 || 50).toFixed(1)}¢
                  </span>
                </div>
                <div className="p-2.5 rounded-vercel-md bg-dark-bg border border-dark-border">
                  <span className="text-[10px] font-mono text-dark-text-secondary block">DOWN 价格</span>
                  <span className="text-sm font-mono text-down-red">
                    {(market?.outcomes?.[1]?.price * 100 || 50).toFixed(1)}¢
                  </span>
                </div>
              </div>

              {/* Size input */}
              <div>
                <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">
                  合约数量
                </label>
                <input
                  type="number"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  step="1"
                  min="1"
                  className="w-full h-10 px-3 bg-dark-bg border border-dark-border rounded-vercel-sm
                             text-sm font-mono text-dark-text
                             focus:outline-none focus:border-link transition-colors"
                />
                <div className="flex gap-2 mt-2">
                  {['5', '10', '25', '50', '100'].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSize(v)}
                      className="flex-1 py-1 text-xs font-mono rounded-vercel-sm border border-dark-border
                                 text-dark-text-secondary hover:text-dark-text hover:border-hairline-strong transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 rounded-vercel-md bg-dark-bg border border-dark-border">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-dark-text-secondary">方向</span>
                  <span className={outcome === 'up' ? 'text-up-green' : 'text-down-red'}>
                    {outcome === 'up' ? '收涨 (UP)' : '收跌 (DOWN)'}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-dark-text-secondary">价格</span>
                  <span className="text-dark-text">{(outcomePrice * 100).toFixed(1)}¢</span>
                </div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-dark-text-secondary">数量</span>
                  <span className="text-dark-text">{size} 份</span>
                </div>
                <div className="flex justify-between text-xs font-mono border-t border-dark-border pt-1 mt-1">
                  <span className="text-dark-text-secondary">预估花费</span>
                  <span className="text-dark-text font-medium">${total.toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Error */}
              {lastError && (
                <div className="p-2 rounded-vercel-md bg-error/10 border border-error/20">
                  <p className="text-xs font-mono text-error">{lastError}</p>
                </div>
              )}

              {/* Execute — two-step authorization */}
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={!market || submitting}
                  className={`w-full py-3 rounded-vercel-pill font-medium text-sm transition-all ${
                    !market || submitting
                      ? 'bg-dark-card text-dark-text-secondary cursor-not-allowed'
                      : outcome === 'up'
                      ? 'bg-up-green hover:bg-up-green/90 text-white'
                      : 'bg-down-red hover:bg-down-red/90 text-white'
                  }`}
                >
                  {!market ? '等待市场...' : submitting ? '提交中...' : '确认下单'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-vercel-md bg-warning-soft/10 border border-warning/30">
                    <p className="text-xs text-warning font-medium mb-1">请授权执行此交易</p>
                    <p className="text-xs text-dark-text-secondary">
                      买入 {outcome === 'up' ? 'UP' : 'DOWN'} {size} 份 @ {(outcomePrice * 100).toFixed(1)}¢
                      ，花费 ${total.toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      className="flex-1 py-2.5 rounded-vercel-pill text-sm font-medium
                                 border border-dark-border text-dark-text-secondary hover:text-dark-text transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleExecute}
                      disabled={submitting}
                      className={`flex-1 py-2.5 rounded-vercel-pill text-sm font-medium transition-all ${
                        submitting
                          ? 'bg-dark-card text-dark-text-secondary cursor-not-allowed'
                          : outcome === 'up'
                          ? 'bg-up-green hover:bg-up-green/90 text-white'
                          : 'bg-down-red hover:bg-down-red/90 text-white'
                      }`}
                    >
                      {submitting ? '执行中...' : '授权执行'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Orders tab */
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(!openTrades || openTrades.length === 0) ? (
                <div className="text-center py-8 text-dark-text-secondary text-sm">
                  暂无挂单
                </div>
              ) : (
                openTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3 rounded-vercel-md border border-dark-border flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                            trade.outcome === 'up'
                              ? 'bg-up-green/10 text-up-green'
                              : 'bg-down-red/10 text-down-red'
                          }`}
                        >
                          {trade.outcome === 'up' ? 'UP' : 'DOWN'}
                        </span>
                        <span className="text-sm font-mono text-dark-text">{trade.size} 份</span>
                      </div>
                      <span className="text-xs font-mono text-dark-text-secondary">
                        {(trade.price * 100).toFixed(1)}¢ · ${trade.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-warning">{trade.status}</span>
                      <button
                        onClick={() => onCancel(trade.orderId)}
                        className="block text-xs font-mono text-dark-text-secondary hover:text-down-red transition-colors mt-0.5"
                      >
                        撤单
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
