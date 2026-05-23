import { useRef, useEffect } from 'react';

function MiniSparkline({ data, width = 120, height = 32 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = width * dpr;
    canvasRef.current.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const values = data.map((d) => d.up);
    const min = Math.min(...values) - 0.01;
    const max = Math.max(...values) + 0.01;
    const range = max - min || 1;

    ctx.beginPath();
    ctx.strokeStyle = '#0070f3';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < values.length; i++) {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((values[i] - min) / range) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 112, 243, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 112, 243, 0)');
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [data, width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} className="inline-block" />;
}

export default function PolymarketPanel({ market, history, priceHistory, connected }) {
  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-5 h-5 border-2 border-dark-border border-t-link rounded-full animate-spin" />
        <span className="text-dark-text-secondary text-xs font-mono">
          {connected === false ? '连接 Polymarket...' : '加载市场数据...'}
        </span>
      </div>
    );
  }

  const timeLeft = Math.max(0, Math.floor((market.endTime - Date.now()) / 1000));
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full ${
              connected
                ? 'bg-up-green/10 text-up-green'
                : 'bg-warning-soft/10 text-warning'
            }`}
          >
            {connected ? 'LIVE' : 'RECONNECTING'}
          </span>
          <span className="text-xs font-mono text-dark-text-secondary">Polymarket</span>
        </div>
        <h3 className="text-sm font-semibold text-dark-text leading-snug">{market.question}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs font-mono text-dark-text-secondary">
            剩余 {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          {market.volume24h > 0 && (
            <span className="text-xs font-mono text-dark-text-secondary">
              · 24h ${market.volume24h.toLocaleString()}
            </span>
          )}
          {market.slot && (
            <span className="text-xs font-mono text-dark-text-secondary/50">
              · slot {market.slot}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      {priceHistory.length > 1 && (
        <div className="px-4 py-3 border-b border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-dark-text-secondary">UP 价格走势</span>
            <span className="text-xs font-mono text-link">
              {(market.outcomes[0].price * 100).toFixed(1)}¢
            </span>
          </div>
          <MiniSparkline data={priceHistory} width={260} height={40} />
        </div>
      )}

      {/* Outcomes with bid/ask */}
      <div className="p-4 space-y-3 border-b border-dark-border">
        {market.outcomes.map((outcome, i) => (
          <div
            key={i}
            className="p-3 rounded-vercel-md border border-dark-border hover:border-hairline-strong transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-dark-text">{outcome.name}</span>
              <span className="text-lg font-semibold font-mono" style={{ color: outcome.color }}>
                {(outcome.price * 100).toFixed(1)}¢
              </span>
            </div>

            {/* Bid/Ask spread */}
            {outcome.bid > 0 && outcome.ask > 0 && (
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-dark-text-secondary">
                  Bid <span className="text-up-green">{(outcome.bid * 100).toFixed(1)}¢</span>
                </span>
                <span className="text-xs font-mono text-dark-text-secondary">
                  Ask <span className="text-down-red">{(outcome.ask * 100).toFixed(1)}¢</span>
                </span>
                <span className="text-xs font-mono text-dark-text-secondary/50">
                  价差 {((outcome.ask - outcome.bid) * 100).toFixed(1)}¢
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${outcome.price * 100}%`,
                    backgroundColor: outcome.color,
                  }}
                />
              </div>
              <span
                className={`text-xs font-mono ${outcome.change >= 0 ? 'text-up-green' : 'text-down-red'}`}
              >
                {outcome.change >= 0 ? '+' : ''}
                {(outcome.change * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Settlement History */}
      <div className="p-4">
        <h4 className="text-xs font-mono text-dark-text-secondary mb-3 uppercase tracking-wider">
          近期结算结果
        </h4>
        {history.length === 0 ? (
          <div className="text-center py-4 text-dark-text-secondary text-xs font-mono">
            加载结算记录中...
          </div>
        ) : (
          <div className="space-y-1.5">
            {history.map((settlement) => {
              const timeStr = settlement.time.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isUp = settlement.result === 'UP';
              return (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-vercel-sm
                             hover:bg-dark-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-dark-text-secondary">{timeStr}</span>
                    <span
                      className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                        isUp
                          ? 'bg-up-green/10 text-up-green'
                          : 'bg-down-red/10 text-down-red'
                      }`}
                    >
                      {isUp ? '↑ UP' : '↓ DOWN'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-dark-text-secondary/50">
                    {settlement.slug}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-4 border-t border-dark-border mt-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-mono text-dark-text-secondary block">流动性</span>
            <span className="text-sm font-mono text-dark-text">
              {market.liquidity > 0 ? `$${market.liquidity.toLocaleString()}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-xs font-mono text-dark-text-secondary block">成交量</span>
            <span className="text-sm font-mono text-dark-text">
              {market.volume24h > 0 ? `$${market.volume24h.toLocaleString()}` : '—'}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-dark-border">
          <span className="text-xs font-mono text-dark-text-secondary">
            Token IDs
          </span>
          <div className="mt-1 space-y-1">
            <div className="text-[10px] font-mono text-dark-text-secondary/60 truncate" title={market.upTokenId}>
              UP: {market.upTokenId?.slice(0, 20)}...
            </div>
            <div className="text-[10px] font-mono text-dark-text-secondary/60 truncate" title={market.downTokenId}>
              DN: {market.downTokenId?.slice(0, 20)}...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
