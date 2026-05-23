import { useState, useCallback } from 'react';
import { useBinanceWS, INTERVALS, INTERVAL_LABELS } from './hooks/useBinanceWS';
import { useIndicators } from './hooks/useIndicators';
import { usePolymarket } from './hooks/usePolymarket';
import { useRegime } from './hooks/useRegime';
import { useStrategy } from './hooks/useStrategy';
import { useTrading } from './hooks/useTrading';
import { usePolyCredentials } from './hooks/usePolyCredentials';
import { useConfig } from './hooks/useConfig';
import { useStrategyManager } from './hooks/useStrategyManager';
import Navbar from './components/Navbar';
import IndicatorPanel from './components/IndicatorPanel';
import ChartPanel from './components/ChartPanel';
import PolymarketPanel from './components/PolymarketPanel';
import SignalPanel from './components/SignalPanel';
import StrategyPanel from './components/StrategyPanel';
import TradeModal from './components/TradeModal';
import SettingsModal from './components/SettingsModal';
import StrategyEditor from './components/StrategyEditor';

export default function App() {
  const { klines, currentPrice, connected, fundingRate, interval, setInterval } = useBinanceWS('5m');
  const indicators = useIndicators(klines);
  const { market, history, priceHistory, connected: polyConnected } = usePolymarket(currentPrice);
  const regime = useRegime(indicators, klines);
  const { creds: polyCreds, updateCred: updatePolyCred, resetCreds: resetPolyCreds, isConfigured: polyConfigured, testConnection: testPolyConnection } = usePolyCredentials();
  const trading = useTrading(currentPrice, { ...market, currentPrice }, polyCreds);
  const { config, updateConfig, resetConfig, resetSection } = useConfig();
  const strategyManager = useStrategyManager();

  const [activeIndicators, setActiveIndicators] = useState(['MA', 'RSI', 'MACD']);
  const [rightTab, setRightTab] = useState('polymarket');
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);

  // Get custom strategy code if active strategy is not builtin
  const customCode = strategyManager.activeStrategy?.builtin ? null : strategyManager.activeStrategy?.code;

  const strategy = useStrategy(indicators, regime, market, {
    customCode,
    strategyConfig: config.strategy,
    currentPrice,
    klines,
    fundingRate,
  });

  const toggleIndicator = useCallback((ind) => {
    setActiveIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  }, []);

  return (
    <div className="h-screen flex flex-col bg-dark-bg overflow-hidden">
      {/* Navbar */}
      <Navbar
        connected={connected}
        currentPrice={currentPrice}
        fundingRate={fundingRate}
        onSettingsClick={() => trading.setShowSettingsModal(true)}
      />

      {/* Indicator bar + Timeframe selector */}
      <div className="border-b border-dark-border bg-dark-surface/50 flex items-center">
        <div className="flex-1">
          <IndicatorPanel
            indicators={indicators}
            activeIndicators={activeIndicators}
            onToggle={toggleIndicator}
          />
        </div>
        {/* Timeframe buttons */}
        <div className="flex items-center gap-1 px-4 border-l border-dark-border h-full">
          {INTERVALS.map((tf) => (
            <button
              key={tf}
              onClick={() => setInterval(tf)}
              className={`px-2 py-1 text-xs font-mono rounded-vercel-sm transition-colors ${
                interval === tf
                  ? 'bg-white text-ink'
                  : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              {INTERVAL_LABELS[tf]}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chart + Strategy + Bottom bar */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <ChartPanel
              klines={klines}
              indicators={indicators}
              activeIndicators={activeIndicators}
            />
          </div>

          {/* Strategy bar */}
          <StrategyPanel
            strategy={strategy}
            currentPrice={currentPrice}
            strategies={strategyManager.strategies}
            activeStrategyId={strategyManager.activeStrategyId}
            onSelectStrategy={strategyManager.setActiveStrategyId}
            onOpenEditor={() => setShowStrategyEditor(true)}
          />

          {/* Bottom bar */}
          <div className="h-12 border-t border-dark-border bg-dark-surface/50 px-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              {klines.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-dark-text-secondary">24h高</span>
                    <span className="text-xs font-mono text-dark-text">
                      ${Math.max(...klines.slice(-288).map((k) => k.high)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-dark-text-secondary">24h低</span>
                    <span className="text-xs font-mono text-dark-text">
                      ${Math.min(...klines.slice(-288).map((k) => k.low)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-dark-text-secondary">量</span>
                    <span className="text-xs font-mono text-dark-text">
                      {klines.slice(-288).reduce((s, k) => s + k.volume, 0).toFixed(1)} BTC
                    </span>
                  </div>
                </>
              )}

              {trading.totalSpent > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-dark-text-secondary">已花费</span>
                  <span className="text-xs font-mono text-dark-text">
                    ${trading.totalSpent.toFixed(2)} USDC
                  </span>
                </div>
              )}

              {trading.openTrades.length > 0 && (
                <span className="text-xs font-mono text-link">{trading.openTrades.length} 笔挂单</span>
              )}

              {/* Custom strategy error indicator */}
              {strategy.isCustom && strategy.error && (
                <span className="text-xs font-mono text-error truncate max-w-[200px]" title={strategy.error}>
                  策略错误: {strategy.error}
                </span>
              )}
              {strategy.isCustom && !strategy.error && (
                <span className="text-[10px] font-mono text-link/60">自定义策略</span>
              )}
            </div>

            <button
              onClick={() => trading.setShowTradeModal(true)}
              className="px-5 py-1.5 bg-white text-ink rounded-vercel-pill text-sm font-medium
                         hover:bg-white/90 transition-colors"
            >
              交易
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-dark-border bg-dark-surface/30 flex-shrink-0 flex flex-col">
          <div className="flex border-b border-dark-border">
            <button
              onClick={() => setRightTab('polymarket')}
              className={`flex-1 py-2.5 text-xs font-mono transition-colors ${
                rightTab === 'polymarket' ? 'text-dark-text border-b-2 border-white' : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              Polymarket
            </button>
            <button
              onClick={() => setRightTab('signals')}
              className={`flex-1 py-2.5 text-xs font-mono transition-colors ${
                rightTab === 'signals' ? 'text-dark-text border-b-2 border-white' : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              信号 & Regime
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {rightTab === 'polymarket' ? (
              <PolymarketPanel market={market} history={history} priceHistory={priceHistory} connected={polyConnected} />
            ) : (
              <SignalPanel regime={{ ...regime, fundingRate }} indicators={indicators} currentPrice={currentPrice} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TradeModal
        isOpen={trading.showTradeModal}
        onClose={() => trading.setShowTradeModal(false)}
        market={market}
        onExecute={trading.executeTrade}
        openTrades={trading.openTrades}
        onCancel={trading.cancelOrder}
        submitting={trading.submitting}
        lastError={trading.lastError}
      />
      <SettingsModal
        isOpen={trading.showSettingsModal}
        onClose={() => trading.setShowSettingsModal(false)}
        apiConfig={trading.apiConfig}
        onSave={trading.saveApiConfig}
        config={config}
        onUpdate={updateConfig}
        onResetSection={resetSection}
        polyCreds={polyCreds}
        onUpdateCred={updatePolyCred}
        onResetCreds={resetPolyCreds}
        onTestConnection={testPolyConnection}
        polyConfigured={polyConfigured}
      />
      <StrategyEditor
        isOpen={showStrategyEditor}
        onClose={() => setShowStrategyEditor(false)}
        strategies={strategyManager.strategies}
        activeStrategyId={strategyManager.activeStrategyId}
        onSave={strategyManager.saveStrategy}
        onDelete={strategyManager.deleteStrategy}
        onRename={strategyManager.renameStrategy}
        onCreate={strategyManager.createNew}
        onSelect={strategyManager.setActiveStrategyId}
      />
    </div>
  );
}
