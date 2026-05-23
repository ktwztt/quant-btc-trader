import { useState, useEffect } from 'react';

export default function Navbar({ connected, currentPrice, fundingRate, onSettingsClick }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="h-16 border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full max-w-[1800px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-develop flex items-center justify-center">
            <span className="text-white text-sm font-bold">₿</span>
          </div>
          <span className="text-lg font-semibold tracking-tight-display">QuantBTC</span>
          <span className="text-xs font-mono text-dark-text-secondary ml-2">
            量化分析终端
          </span>
        </div>

        {/* Center: Price */}
        {currentPrice && (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-semibold tracking-tight-section font-mono">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-dark-text-secondary">BTC/USDT</span>
            {fundingRate !== null && fundingRate !== undefined && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                fundingRate > 0 ? 'bg-down-red/10 text-down-red' : 'bg-up-green/10 text-up-green'
              }`}>
                资金费率 {(fundingRate * 100).toFixed(4)}%
              </span>
            )}
          </div>
        )}

        {/* Right: Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-up-green pulse-dot' : 'bg-down-red'}`}
            />
            <span className="text-xs font-mono text-dark-text-secondary">
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-xs font-mono text-dark-text-secondary">
            {time.toLocaleTimeString('zh-CN')}
          </span>
          <button
            onClick={onSettingsClick}
            className="text-xs font-mono px-3 py-1.5 rounded-vercel-sm border border-dark-border
                       text-dark-text-secondary hover:text-dark-text hover:border-hairline-strong transition-colors"
          >
            ⚙ 设置
          </button>
        </div>
      </div>
    </nav>
  );
}
