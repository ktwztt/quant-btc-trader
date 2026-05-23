import { useState } from 'react';

const OVERLAY_GROUPS = [
  { key: 'MA', label: 'MA', desc: '均线' },
  { key: 'EMA', label: 'EMA', desc: '指数均线' },
  { key: 'BB', label: 'BB', desc: '布林带' },
  { key: 'VWAP', label: 'VWAP', desc: '成交量加权' },
];

const OSCILLATOR_GROUPS = [
  { key: 'RSI', label: 'RSI', desc: '相对强弱' },
  { key: 'MACD', label: 'MACD', desc: '指数平滑' },
  { key: 'STOCH', label: 'Stoch', desc: '随机指标' },
];

const TREND_GROUPS = [
  { key: 'ADX', label: 'ADX', desc: '趋势强度' },
];

export default function IndicatorPanel({ indicators, activeIndicators, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  const latest = {};
  if (indicators) {
    if (indicators.rsi?.length) latest.rsi = indicators.rsi[indicators.rsi.length - 1]?.value;
    if (indicators.macd?.histogram?.length) {
      const h = indicators.macd.histogram;
      latest.macdHist = h[h.length - 1]?.value;
      latest.macdDIF = indicators.macd.macdLine[indicators.macd.macdLine.length - 1]?.value;
      latest.macdDEA = indicators.macd.signalLine[indicators.macd.signalLine.length - 1]?.value;
    }
    if (indicators.stoch?.k?.length) {
      latest.stochK = indicators.stoch.k[indicators.stoch.k.length - 1]?.value;
      latest.stochD = indicators.stoch.d[indicators.stoch.d.length - 1]?.value;
    }
    if (indicators.adx?.adx?.length) {
      latest.adx = indicators.adx.adx[indicators.adx.adx.length - 1]?.value;
      latest.plusDI = indicators.adx.plusDI[indicators.adx.plusDI.length - 1]?.value;
      latest.minusDI = indicators.adx.minusDI[indicators.adx.minusDI.length - 1]?.value;
    }
    if (indicators.atr?.length) latest.atr = indicators.atr[indicators.atr.length - 1]?.value;
    if (indicators.cci?.length) latest.cci = indicators.cci[indicators.cci.length - 1]?.value;
    if (indicators.williamsR?.length) latest.wr = indicators.williamsR[indicators.williamsR.length - 1]?.value;
    if (indicators.mfi?.length) latest.mfi = indicators.mfi[indicators.mfi.length - 1]?.value;
  }

  const rsiStatus = latest.rsi > 70 ? '超买' : latest.rsi < 30 ? '超卖' : '中性';
  const rsiColor = latest.rsi > 70 ? 'text-down-red' : latest.rsi < 30 ? 'text-up-green' : 'text-dark-text-secondary';

  return (
    <div className="border-b border-dark-border bg-dark-surface/50">
      {/* Main toolbar */}
      <div className="px-6 py-2 flex items-center gap-4 flex-wrap">
        {/* Overlay toggles */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-dark-text-secondary/50 mr-1">叠加</span>
          {OVERLAY_GROUPS.map((g) => (
            <button key={g.key} onClick={() => onToggle(g.key)}
              className={`indicator-btn ${activeIndicators.includes(g.key) ? 'active' : ''}`}>
              {g.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-dark-border" />

        {/* Oscillator toggles */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-dark-text-secondary/50 mr-1">振荡</span>
          {OSCILLATOR_GROUPS.map((g) => (
            <button key={g.key} onClick={() => onToggle(g.key)}
              className={`indicator-btn ${activeIndicators.includes(g.key) ? 'active' : ''}`}>
              {g.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-dark-border" />

        {/* Trend toggles */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-dark-text-secondary/50 mr-1">趋势</span>
          {TREND_GROUPS.map((g) => (
            <button key={g.key} onClick={() => onToggle(g.key)}
              className={`indicator-btn ${activeIndicators.includes(g.key) ? 'active' : ''}`}>
              {g.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-dark-border" />

        {/* Quick readouts */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* MA readouts */}
          {activeIndicators.includes('MA') && indicators?.ma && Object.entries(indicators.ma).map(([p, data]) => {
            const v = data?.[data.length - 1]?.value;
            if (!v) return null;
            const c = { 7: 'text-link', 25: 'text-warning', 99: 'text-violet' };
            return <span key={p} className="text-xs font-mono"><span className={c[p] || 'text-dark-text-secondary'}>MA{p}</span> <span className="text-dark-text">{v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>;
          })}

          {/* EMA readouts */}
          {activeIndicators.includes('EMA') && indicators?.ema && Object.entries(indicators.ema).map(([p, data]) => {
            const v = data?.[data.length - 1]?.value;
            if (!v) return null;
            return <span key={p} className="text-xs font-mono"><span className="text-cyan">EMA{p}</span> <span className="text-dark-text">{v.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></span>;
          })}

          {/* RSI */}
          {activeIndicators.includes('RSI') && latest.rsi !== undefined && (
            <span className="text-xs font-mono">
              <span className="text-cyan">RSI</span> <span className="text-dark-text">{latest.rsi.toFixed(1)}</span>{' '}
              <span className={`text-xs font-mono ${rsiColor}`}>{rsiStatus}</span>
            </span>
          )}

          {/* MACD */}
          {activeIndicators.includes('MACD') && latest.macdHist !== undefined && (
            <span className="text-xs font-mono">
              <span className="text-highlight-pink">MACD</span>{' '}
              <span className={latest.macdHist >= 0 ? 'text-up-green' : 'text-down-red'}>{latest.macdHist.toFixed(2)}</span>
            </span>
          )}

          {/* Stochastic */}
          {activeIndicators.includes('STOCH') && latest.stochK !== undefined && (
            <span className="text-xs font-mono">
              <span className="text-cyan">Stoch</span>{' '}
              <span className="text-dark-text">K {latest.stochK.toFixed(1)}</span>{' '}
              <span className="text-warning">D {latest.stochD?.toFixed(1)}</span>
            </span>
          )}

          {/* ADX */}
          {activeIndicators.includes('ADX') && latest.adx !== undefined && (
            <span className="text-xs font-mono">
              <span className="text-violet">ADX</span> <span className="text-dark-text">{latest.adx.toFixed(1)}</span>{' '}
              <span className="text-up-green">+DI {latest.plusDI?.toFixed(1)}</span>{' '}
              <span className="text-down-red">-DI {latest.minusDI?.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Expand button for additional readouts */}
        <button onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs font-mono text-dark-text-secondary hover:text-dark-text transition-colors">
          {expanded ? '收起 ▲' : '更多 ▼'}
        </button>
      </div>

      {/* Expanded readouts */}
      {expanded && (
        <div className="px-6 py-2 border-t border-dark-border/50 flex items-center gap-4 flex-wrap fade-in">
          {latest.atr !== undefined && (
            <span className="text-xs font-mono"><span className="text-dark-text-secondary">ATR</span> <span className="text-dark-text">{latest.atr.toFixed(1)}</span></span>
          )}
          {latest.cci !== undefined && (
            <span className="text-xs font-mono"><span className="text-dark-text-secondary">CCI</span> <span className="text-dark-text">{latest.cci.toFixed(1)}</span></span>
          )}
          {latest.wr !== undefined && (
            <span className="text-xs font-mono"><span className="text-dark-text-secondary">WR</span> <span className="text-dark-text">{latest.wr.toFixed(1)}</span></span>
          )}
          {latest.mfi !== undefined && (
            <span className="text-xs font-mono"><span className="text-dark-text-secondary">MFI</span> <span className="text-dark-text">{latest.mfi.toFixed(1)}</span></span>
          )}
          {indicators?.bbPctB?.length > 0 && (
            <span className="text-xs font-mono"><span className="text-dark-text-secondary">BB%B</span> <span className="text-dark-text">{indicators.bbPctB[indicators.bbPctB.length - 1]?.value?.toFixed(3)}</span></span>
          )}
        </div>
      )}
    </div>
  );
}
