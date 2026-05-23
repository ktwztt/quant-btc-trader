export default function StrategyPanel({ strategy, currentPrice, strategies, activeStrategyId, onSelectStrategy, onOpenEditor }) {
  if (!strategy || strategy.signal === undefined) return null;

  const signalColors = {
    BUY: { bg: 'bg-up-green', text: 'text-up-green', border: 'border-up-green/30', label: '做多' },
    SELL: { bg: 'bg-down-red', text: 'text-down-red', border: 'border-down-red/30', label: '做空' },
    HOLD: { bg: 'bg-dark-card', text: 'text-dark-text-secondary', border: 'border-dark-border', label: '观望' },
  };

  const sc = signalColors[strategy.signal] || signalColors.HOLD;
  const activeName = strategies?.find((s) => s.id === activeStrategyId)?.name || '内置策略';

  return (
    <div className={`h-10 border-t ${sc.border} bg-dark-surface/80 px-6 flex items-center justify-between`}>
      {/* Left: Signal + Strategy selector */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full ${sc.bg} ${strategy.signal === 'HOLD' ? 'text-dark-text-secondary' : 'text-white'}`}>
          {sc.label}
        </span>
        <span className="text-xs font-mono text-dark-text-secondary">{strategy.summary}</span>
      </div>

      {/* Center: Score bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-up-green">{strategy.bullScore}</span>
        <div className="w-24 h-1.5 bg-dark-border rounded-full overflow-hidden flex">
          <div className="bg-up-green h-full" style={{ width: `${(strategy.bullScore / (strategy.bullScore + strategy.bearScore || 1)) * 100}%` }} />
          <div className="bg-down-red h-full" style={{ width: `${(strategy.bearScore / (strategy.bullScore + strategy.bearScore || 1)) * 100}%` }} />
        </div>
        <span className="text-[10px] font-mono text-down-red">{strategy.bearScore}</span>
      </div>

      {/* Right: Strategy selector + Confidence + Editor */}
      <div className="flex items-center gap-2">
        {/* Strategy dropdown */}
        {strategies && strategies.length > 0 && (
          <select
            value={activeStrategyId}
            onChange={(e) => onSelectStrategy(e.target.value)}
            className="h-7 px-2 bg-dark-bg border border-dark-border rounded-vercel-sm
                       text-[10px] font-mono text-dark-text-secondary focus:outline-none focus:border-link
                       cursor-pointer appearance-none pr-5"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' fill=\'%23888\'%3E%3Cpath d=\'M0 0l5 6 5-6z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Editor button */}
        <button
          onClick={onOpenEditor}
          className="h-7 px-2 text-[10px] font-mono rounded-vercel-sm border border-dark-border
                     text-dark-text-secondary hover:text-dark-text hover:border-hairline-strong transition-colors"
          title="打开策略编辑器"
        >
          编辑
        </button>

        <span className="text-[10px] font-mono text-dark-text-secondary ml-1">置信度</span>
        <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${sc.bg}`}
            style={{ width: `${strategy.confidence * 100}%`, opacity: 0.8 }}
          />
        </div>
        <span className="text-xs font-mono text-dark-text">{(strategy.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
