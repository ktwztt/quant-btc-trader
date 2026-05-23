import { useState, useEffect } from 'react';

const TABS = [
  { id: 'polymarket', label: 'Polymarket' },
  { id: 'api', label: '币安 API' },
  { id: 'indicators', label: '指标参数' },
  { id: 'strategy', label: '策略参数' },
  { id: 'advanced', label: '高级' },
];

function NumberInput({ label, value, onChange, min, max, step = 1, hint }) {
  return (
    <div>
      <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step}
        className="w-full h-9 px-3 bg-dark-bg border border-dark-border rounded-vercel-sm
                   text-sm font-mono text-dark-text focus:outline-none focus:border-link transition-colors"
      />
      {hint && <p className="text-[10px] font-mono text-dark-text-secondary/60 mt-1">{hint}</p>}
    </div>
  );
}

function ArrayInput({ label, value, onChange, hint }) {
  const str = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div>
      <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">{label}</label>
      <input
        type="text"
        value={str}
        onChange={(e) => {
          const arr = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
          onChange(arr);
        }}
        className="w-full h-9 px-3 bg-dark-bg border border-dark-border rounded-vercel-sm
                   text-sm font-mono text-dark-text focus:outline-none focus:border-link transition-colors"
      />
      {hint && <p className="text-[10px] font-mono text-dark-text-secondary/60 mt-1">{hint}</p>}
    </div>
  );
}

function ObjectInputs({ label, obj, onChange, fields }) {
  return (
    <div>
      <label className="text-xs font-mono text-dark-text-secondary block mb-2">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <div key={f.key}>
            <span className="text-[10px] font-mono text-dark-text-secondary/60">{f.label}</span>
            <input
              type="number"
              value={obj[f.key] ?? 0}
              onChange={(e) => onChange({ ...obj, [f.key]: parseFloat(e.target.value) || 0 })}
              step={f.step || 1}
              className="w-full h-8 px-2 mt-0.5 bg-dark-bg border border-dark-border rounded-vercel-sm
                         text-xs font-mono text-dark-text focus:outline-none focus:border-link transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PolyInput({ label, value, onChange, type = 'text', placeholder }) {
  const [show, setShow] = useState(false);
  const isSecret = type === 'password';
  return (
    <div>
      <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 px-3 pr-10 bg-dark-bg border border-dark-border rounded-vercel-sm
                     text-sm font-mono text-dark-text placeholder:text-dark-text-secondary/50
                     focus:outline-none focus:border-link transition-colors"
        />
        {isSecret && (
          <button onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary hover:text-dark-text text-xs">
            {show ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose, apiConfig, onSave, config, onUpdate, onResetSection, polyCreds, onUpdateCred, onResetCreds, onTestConnection, polyConfigured }) {
  const [activeTab, setActiveTab] = useState('polymarket');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);
  const [polyTestResult, setPolyTestResult] = useState(null);
  const [polyTesting, setPolyTesting] = useState(false);

  useEffect(() => {
    if (apiConfig) {
      setApiKey(apiConfig.apiKey);
      setApiSecret(apiConfig.apiSecret);
    }
  }, [apiConfig]);

  if (!isOpen || !config) return null;

  const handleSaveApi = () => {
    onSave({ apiKey, apiSecret });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const sc = config.strategy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl mx-4 bg-dark-surface border border-dark-border rounded-vercel-lg shadow-vercel-5 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h2 className="text-lg font-semibold tracking-tight-display">设置</h2>
            <p className="text-xs font-mono text-dark-text-secondary mt-0.5">配置管理</p>
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
        <div className="flex border-b border-dark-border px-5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-mono transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-dark-text border-b-2 border-white'
                  : 'text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Tab: Polymarket */}
          {activeTab === 'polymarket' && (
            <>
              <div className="p-3 rounded-vercel-md bg-link/5 border border-link/20">
                <p className="text-xs text-link leading-relaxed">
                  配置 Polymarket CLOB API 凭证。所有信息仅存储在浏览器本地，通过请求头传送给交易 API。
                </p>
              </div>

              <PolyInput label="Private Key (以太坊私钥)" value={polyCreds?.privateKey}
                onChange={(v) => onUpdateCred('privateKey', v)} type="password"
                placeholder="hex 格式，不带 0x 前缀" />

              <div className="grid grid-cols-2 gap-3">
                <PolyInput label="API Key" value={polyCreds?.apiKey}
                  onChange={(v) => onUpdateCred('apiKey', v)} type="password"
                  placeholder="UUID 格式" />
                <PolyInput label="API Secret" value={polyCreds?.apiSecret}
                  onChange={(v) => onUpdateCred('apiSecret', v)} type="password"
                  placeholder="base64 格式" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PolyInput label="API Passphrase" value={polyCreds?.apiPassphrase}
                  onChange={(v) => onUpdateCred('apiPassphrase', v)} type="password"
                  placeholder="hex 格式" />
                <div>
                  <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">Signature Type</label>
                  <select
                    value={polyCreds?.signatureType || 0}
                    onChange={(e) => onUpdateCred('signatureType', parseInt(e.target.value))}
                    className="w-full h-9 px-3 bg-dark-bg border border-dark-border rounded-vercel-sm
                               text-sm font-mono text-dark-text focus:outline-none focus:border-link transition-colors
                               cursor-pointer"
                  >
                    <option value={0}>0 - EOA</option>
                    <option value={1}>1 - POLY_PROXY</option>
                    <option value={2}>2 - GNOSIS_SAFE</option>
                    <option value={3}>3 - POLY_GNOSIS_SAFE</option>
                  </select>
                </div>
              </div>

              <PolyInput label="Funder Address" value={polyCreds?.funderAddress}
                onChange={(v) => onUpdateCred('funderAddress', v)}
                placeholder="0x... (signature_type 1/2 时必填)" />

              <PolyInput label="代理地址 (Proxy)" value={polyCreds?.proxyUrl}
                onChange={(v) => onUpdateCred('proxyUrl', v)}
                placeholder="http://127.0.0.1:7890 或 socks5://..." />

              <div className="flex gap-2">
                <button onClick={async () => {
                  setPolyTesting(true);
                  setPolyTestResult(null);
                  const result = await onTestConnection();
                  setPolyTestResult(result);
                  setPolyTesting(false);
                }}
                  disabled={polyTesting}
                  className="flex-1 py-2 rounded-vercel-pill text-xs font-mono
                             border border-link text-link hover:bg-link/10 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed">
                  {polyTesting ? '测试中...' : '测试连接'}
                </button>
                <button onClick={onResetCreds}
                  className="py-2 px-4 rounded-vercel-pill text-xs font-mono
                             border border-dark-border text-dark-text-secondary hover:text-dark-text transition-colors">
                  清空
                </button>
              </div>

              {polyTestResult && (
                <div className={`p-2 rounded-vercel-md text-xs font-mono ${
                  polyTestResult.ok
                    ? 'bg-up-green/10 border border-up-green/20 text-up-green'
                    : 'bg-error/10 border border-error/20 text-error'
                }`}>
                  {polyTestResult.ok ? `连接成功: ${polyTestResult.market}` : `连接失败: ${polyTestResult.error}`}
                </div>
              )}

              <div className="p-3 rounded-vercel-md bg-error-soft/10 border border-error/20">
                <p className="text-xs text-error leading-relaxed">
                  <strong>安全提示：</strong>私钥和 API 凭证仅存储在浏览器本地，通过加密请求头传送。
                  请勿在公共设备上配置。交易涉及真实资金，请谨慎操作。
                </p>
              </div>
            </>
          )}

          {/* Tab: API (Binance) */}
          {activeTab === 'api' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-dark-text mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  币安 API
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">API Key</label>
                    <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入币安 API Key"
                      className="w-full h-10 px-3 bg-dark-bg border border-dark-border rounded-vercel-sm
                                 text-sm font-mono text-dark-text placeholder:text-dark-text-secondary/50
                                 focus:outline-none focus:border-link transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">API Secret</label>
                    <div className="relative">
                      <input type={showSecret ? 'text' : 'password'} value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="输入币安 API Secret"
                        className="w-full h-10 px-3 pr-10 bg-dark-bg border border-dark-border rounded-vercel-sm
                                   text-sm font-mono text-dark-text placeholder:text-dark-text-secondary/50
                                   focus:outline-none focus:border-link transition-colors" />
                      <button onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-secondary hover:text-dark-text">
                        {showSecret ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 rounded-vercel-md bg-error-soft/10 border border-error/20">
                  <p className="text-xs text-error leading-relaxed">
                    <strong>安全提示：</strong>API Key 仅存储在本地浏览器，不会发送到任何第三方服务器。
                    建议创建仅限交易权限的 API Key，不要开启提币权限。
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-vercel-md bg-dark-bg border border-dark-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-dark-text-secondary">API 状态</span>
                  <span className={`text-xs font-mono ${apiKey ? 'text-up-green' : 'text-dark-text-secondary'}`}>
                    {apiKey ? '已配置' : '未配置'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Tab: Indicators */}
          {activeTab === 'indicators' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ArrayInput label="MA 周期" value={config.maPeriods}
                  onChange={(v) => onUpdate('maPeriods', v)} hint="逗号分隔，如 7, 25, 99" />
                <ArrayInput label="EMA 周期" value={config.emaPeriods}
                  onChange={(v) => onUpdate('emaPeriods', v)} hint="逗号分隔，如 9, 21, 55" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="RSI 周期" value={config.rsiPeriod}
                  onChange={(v) => onUpdate('rsiPeriod', v)} min={2} max={100} />
                <NumberInput label="ATR 周期" value={config.atrPeriod}
                  onChange={(v) => onUpdate('atrPeriod', v)} min={2} max={100} />
              </div>
              <ObjectInputs label="MACD 参数" obj={config.macdParams}
                onChange={(v) => onUpdate('macdParams', v)}
                fields={[
                  { key: 'fast', label: '快线' },
                  { key: 'slow', label: '慢线' },
                  { key: 'signal', label: '信号线' },
                ]} />
              <ObjectInputs label="布林带参数" obj={config.bollingerParams}
                onChange={(v) => onUpdate('bollingerParams', v)}
                fields={[
                  { key: 'period', label: '周期' },
                  { key: 'stdDev', label: '标准差', step: 0.5 },
                ]} />
              <ObjectInputs label="随机指标参数" obj={config.stochParams}
                onChange={(v) => onUpdate('stochParams', v)}
                fields={[
                  { key: 'kPeriod', label: 'K 周期' },
                  { key: 'dPeriod', label: 'D 周期' },
                ]} />
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="ADX 周期" value={config.adxPeriod}
                  onChange={(v) => onUpdate('adxPeriod', v)} min={2} max={100} />
                <NumberInput label="MFI 周期" value={config.mfiPeriod}
                  onChange={(v) => onUpdate('mfiPeriod', v)} min={2} max={100} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="CCI 周期" value={config.cciPeriod}
                  onChange={(v) => onUpdate('cciPeriod', v)} min={2} max={100} />
                <NumberInput label="Williams %R 周期" value={config.williamsRPeriod}
                  onChange={(v) => onUpdate('williamsRPeriod', v)} min={2} max={100} />
              </div>
              <button onClick={() => onResetSection('indicators')}
                className="text-xs font-mono text-dark-text-secondary hover:text-dark-text underline">
                重置指标参数为默认值
              </button>
            </>
          )}

          {/* Tab: Strategy */}
          {activeTab === 'strategy' && (
            <>
              <p className="text-xs font-mono text-dark-text-secondary mb-2">
                调整内置策略引擎的评分权重和决策阈值
              </p>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="Regime 权重" value={sc.regimeWeight}
                  onChange={(v) => onUpdate('strategy.regimeWeight', v)} min={0} max={10} />
                <NumberInput label="MA 对齐权重" value={sc.maWeight}
                  onChange={(v) => onUpdate('strategy.maWeight', v)} min={0} max={10} />
                <NumberInput label="RSI 权重" value={sc.rsiWeight}
                  onChange={(v) => onUpdate('strategy.rsiWeight', v)} min={0} max={10} />
                <NumberInput label="MACD 权重" value={sc.macdWeight}
                  onChange={(v) => onUpdate('strategy.macdWeight', v)} min={0} max={10} />
                <NumberInput label="BB 权重" value={sc.bbWeight}
                  onChange={(v) => onUpdate('strategy.bbWeight', v)} min={0} max={10} />
                <NumberInput label="ADX 权重" value={sc.adxWeight}
                  onChange={(v) => onUpdate('strategy.adxWeight', v)} min={0} max={10} />
                <NumberInput label="Polymarket 权重" value={sc.polymarketWeight}
                  onChange={(v) => onUpdate('strategy.polymarketWeight', v)} min={0} max={10} />
              </div>
              <div className="border-t border-dark-border pt-3 mt-2">
                <p className="text-xs font-mono text-dark-text-secondary mb-2">决策阈值</p>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="强信号阈值 (diff≥)" value={sc.strongThreshold}
                    onChange={(v) => onUpdate('strategy.strongThreshold', v)} min={1} max={10} />
                  <NumberInput label="中等信号阈值 (diff≥)" value={sc.mediumThreshold}
                    onChange={(v) => onUpdate('strategy.mediumThreshold', v)} min={1} max={10} />
                  <NumberInput label="强信号置信度上限" value={sc.strongConfidenceCap}
                    onChange={(v) => onUpdate('strategy.strongConfidenceCap', v)} min={0} max={1} step={0.1} />
                  <NumberInput label="中等信号置信度上限" value={sc.mediumConfidenceCap}
                    onChange={(v) => onUpdate('strategy.mediumConfidenceCap', v)} min={0} max={1} step={0.1} />
                </div>
              </div>
              <div className="border-t border-dark-border pt-3 mt-2">
                <p className="text-xs font-mono text-dark-text-secondary mb-2">RSI 阈值</p>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="超卖 (强)" value={sc.rsiOversold}
                    onChange={(v) => onUpdate('strategy.rsiOversold', v)} min={0} max={100} />
                  <NumberInput label="超买 (强)" value={sc.rsiOverbought}
                    onChange={(v) => onUpdate('strategy.rsiOverbought', v)} min={0} max={100} />
                  <NumberInput label="超卖 (弱)" value={sc.rsiWeakOversold}
                    onChange={(v) => onUpdate('strategy.rsiWeakOversold', v)} min={0} max={100} />
                  <NumberInput label="超买 (弱)" value={sc.rsiWeakOverbought}
                    onChange={(v) => onUpdate('strategy.rsiWeakOverbought', v)} min={0} max={100} />
                </div>
              </div>
              <div className="border-t border-dark-border pt-3 mt-2">
                <p className="text-xs font-mono text-dark-text-secondary mb-2">其他阈值</p>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="ADX 强趋势阈值" value={sc.adxStrongThreshold}
                    onChange={(v) => onUpdate('strategy.adxStrongThreshold', v)} min={0} max={100} />
                  <NumberInput label="Polymarket 边际阈值" value={sc.polymarketEdgeThreshold}
                    onChange={(v) => onUpdate('strategy.polymarketEdgeThreshold', v)} min={0} max={1} step={0.05} />
                </div>
              </div>
              <button onClick={() => onResetSection('strategy')}
                className="text-xs font-mono text-dark-text-secondary hover:text-dark-text underline">
                重置策略参数为默认值
              </button>
            </>
          )}

          {/* Tab: Advanced */}
          {activeTab === 'advanced' && (
            <>
              <NumberInput label="K 线刷新间隔 (ms)" value={config.klineRefresh}
                onChange={(v) => onUpdate('klineRefresh', v)} min={1000} max={30000} step={1000}
                hint="WebSocket 数据轮询间隔" />
              <NumberInput label="Polymarket 刷新间隔 (ms)" value={config.polymarketRefresh}
                onChange={(v) => onUpdate('polymarketRefresh', v)} min={1000} max={60000} step={1000}
                hint="Polymarket 数据轮询间隔" />
              <div>
                <label className="text-xs font-mono text-dark-text-secondary block mb-1.5">交易对</label>
                <input type="text" value={config.symbol}
                  onChange={(e) => onUpdate('symbol', e.target.value.toLowerCase())}
                  className="w-full h-9 px-3 bg-dark-bg border border-dark-border rounded-vercel-sm
                             text-sm font-mono text-dark-text focus:outline-none focus:border-link transition-colors" />
                <p className="text-[10px] font-mono text-dark-text-secondary/60 mt-1">如 btcusdt, ethusdt</p>
              </div>
              <button onClick={() => onResetSection('advanced')}
                className="text-xs font-mono text-dark-text-secondary hover:text-dark-text underline">
                重置高级参数为默认值
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-dark-border">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-vercel-pill text-sm font-medium
                       border border-dark-border text-dark-text-secondary hover:text-dark-text transition-colors">
            关闭
          </button>
          {activeTab === 'api' && (
            <button onClick={handleSaveApi}
              className={`flex-1 py-2.5 rounded-vercel-pill text-sm font-medium transition-all ${
                saved ? 'bg-up-green text-white' : 'bg-white text-ink hover:bg-white/90'
              }`}>
              {saved ? '已保存 ✓' : '保存 API 配置'}
            </button>
          )}
          {activeTab !== 'api' && activeTab !== 'polymarket' && (
            <button onClick={() => onResetSection(activeTab === 'strategy' ? 'strategy' : activeTab === 'indicators' ? 'maPeriods' : 'klineRefresh')}
              className="flex-1 py-2.5 rounded-vercel-pill text-sm font-medium
                         border border-dark-border text-dark-text-secondary hover:text-dark-text transition-colors">
              重置当前页
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
