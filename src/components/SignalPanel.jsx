export default function SignalPanel({ regime, indicators, currentPrice }) {
  if (!regime || regime.regime === 'UNKNOWN') {
    return (
      <div className="p-4 text-center text-dark-text-secondary text-xs font-mono">
        计算市场状态中...
      </div>
    );
  }

  const regimeColors = {
    UPTREND: { bg: 'bg-up-green/10', text: 'text-up-green', border: 'border-up-green/20', label: '上涨趋势' },
    DOWNTREND: { bg: 'bg-down-red/10', text: 'text-down-red', border: 'border-down-red/20', label: '下跌趋势' },
    RANGING: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', label: '震荡' },
  };

  const rc = regimeColors[regime.regime] || regimeColors.RANGING;

  // Generate signals
  const signals = [];

  // Signal A: Score Delta
  const adxVal = indicators?.adx?.adx?.[indicators.adx.adx.length - 1]?.value || 0;
  if (Math.abs(regime.score) >= 4 && adxVal >= 20) {
    signals.push({
      name: '趋势信号',
      type: 'A',
      direction: regime.score > 0 ? 'UP' : 'DOWN',
      strength: Math.min(Math.abs(regime.score) / 12, 1),
      detail: `score=${regime.score} ADX=${adxVal.toFixed(0)}`,
    });
  }

  // Signal B: Momentum
  if (indicators?.rsi?.length > 1) {
    const rsi = indicators.rsi[indicators.rsi.length - 1]?.value;
    if (rsi < 30) {
      signals.push({ name: 'RSI 超卖', type: 'B', direction: 'UP', strength: (30 - rsi) / 30, detail: `RSI=${rsi.toFixed(1)}` });
    } else if (rsi > 70) {
      signals.push({ name: 'RSI 超买', type: 'B', direction: 'DOWN', strength: (rsi - 70) / 30, detail: `RSI=${rsi.toFixed(1)}` });
    }
  }

  // Signal C: MACD Cross
  if (indicators?.macd?.histogram?.length > 2) {
    const h = indicators.macd.histogram;
    const curr = h[h.length - 1]?.value;
    const prev = h[h.length - 2]?.value;
    if (curr > 0 && prev <= 0) {
      signals.push({ name: 'MACD 金叉', type: 'C', direction: 'UP', strength: 0.6, detail: `hist=${curr.toFixed(2)}` });
    } else if (curr < 0 && prev >= 0) {
      signals.push({ name: 'MACD 死叉', type: 'C', direction: 'DOWN', strength: 0.6, detail: `hist=${curr.toFixed(2)}` });
    }
  }

  // Signal D: BB Position
  if (indicators?.bbPctB?.length) {
    const pctb = indicators.bbPctB[indicators.bbPctB.length - 1]?.value;
    if (pctb > 1.0) {
      signals.push({ name: 'BB 突破上轨', type: 'D', direction: 'DOWN', strength: Math.min((pctb - 1) * 2, 1), detail: `%B=${pctb.toFixed(3)}` });
    } else if (pctb < 0) {
      signals.push({ name: 'BB 跌破下轨', type: 'D', direction: 'UP', strength: Math.min(Math.abs(pctb) * 2, 1), detail: `%B=${pctb.toFixed(3)}` });
    }
  }

  // Signal E: ADX trend strength
  if (adxVal > 25) {
    const plusDI = indicators?.adx?.plusDI?.[indicators.adx.plusDI.length - 1]?.value || 0;
    const minusDI = indicators?.adx?.minusDI?.[indicators.adx.minusDI.length - 1]?.value || 0;
    signals.push({
      name: '强趋势',
      type: 'E',
      direction: plusDI > minusDI ? 'UP' : 'DOWN',
      strength: Math.min(adxVal / 50, 1),
      detail: `ADX=${adxVal.toFixed(0)} +DI=${plusDI.toFixed(0)} -DI=${minusDI.toFixed(0)}`,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Regime header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-dark-text-secondary">市场状态</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
            {rc.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold font-mono text-dark-text">
            {regime.score > 0 ? '+' : ''}{regime.score}
          </span>
          <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                regime.score > 0 ? 'bg-up-green' : regime.score < 0 ? 'bg-down-red' : 'bg-warning'
              }`}
              style={{ width: `${Math.min(Math.abs(regime.score) / 12 * 100, 100)}%`, marginLeft: regime.score < 0 ? 'auto' : 0 }}
            />
          </div>
        </div>

        {/* Score components */}
        <div className="mt-3 grid grid-cols-3 gap-1">
          {Object.entries(regime.components).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between px-2 py-1 rounded-vercel-sm bg-dark-bg">
              <span className="text-[10px] font-mono text-dark-text-secondary uppercase">{key === 'maAlignment' ? 'MA' : key === 'maSlope' ? 'Slope' : key === 'priceStructure' ? 'Struct' : key.toUpperCase()}</span>
              <span className={`text-[10px] font-mono ${val > 0 ? 'text-up-green' : val < 0 ? 'text-down-red' : 'text-dark-text-secondary'}`}>
                {val > 0 ? '+' : ''}{val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Signals */}
      <div className="p-4">
        <h4 className="text-xs font-mono text-dark-text-secondary mb-3 uppercase tracking-wider">
          信号 ({signals.length})
        </h4>
        {signals.length === 0 ? (
          <div className="text-center py-4 text-dark-text-secondary text-xs font-mono">
            暂无活跃信号
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((sig, i) => (
              <div key={i} className={`p-2.5 rounded-vercel-md border ${
                sig.direction === 'UP' ? 'border-up-green/20 bg-up-green/5' : 'border-down-red/20 bg-down-red/5'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-medium ${sig.direction === 'UP' ? 'text-up-green' : 'text-down-red'}`}>
                      {sig.direction === 'UP' ? '↑ 做多' : '↓ 做空'}
                    </span>
                    <span className="text-xs font-mono text-dark-text-secondary">{sig.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-dark-text-secondary/50">Type {sig.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-dark-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sig.direction === 'UP' ? 'bg-up-green' : 'bg-down-red'}`}
                      style={{ width: `${sig.strength * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-dark-text-secondary">{(sig.strength * 100).toFixed(0)}%</span>
                </div>
                <span className="text-[10px] font-mono text-dark-text-secondary/50 mt-1 block">{sig.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Funding Rate (if available) */}
      {regime.fundingRate !== undefined && (
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-dark-text-secondary">资金费率</span>
            <span className={`text-sm font-mono ${regime.fundingRate > 0 ? 'text-down-red' : 'text-up-green'}`}>
              {(regime.fundingRate * 100).toFixed(4)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
