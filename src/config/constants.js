// Binance WebSocket endpoints
export const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
export const BINANCE_REST_BASE = 'https://api.binance.com/api/v3';

// Trading pair
export const SYMBOL = 'btcusdt';
export const SYMBOL_DISPLAY = 'BTC/USDT';
export const KLINE_INTERVAL = '5m';

// Polymarket (simulated endpoint - replace with real CLOB API)
export const POLYMARKET_API = 'https://clob.polymarket.com';

// Technical indicator defaults
export const MA_PERIODS = [7, 25, 99];
export const EMA_PERIODS = [9, 21, 55];
export const MACD_PARAMS = { fast: 12, slow: 26, signal: 9 };
export const RSI_PERIOD = 14;
export const BOLLINGER_PARAMS = { period: 20, stdDev: 2 };

// Extended indicators (Phase 2)
export const ATR_PERIOD = 14;
export const STOCH_PARAMS = { kPeriod: 14, dPeriod: 3 };
export const ADX_PERIOD = 14;
export const MFI_PERIOD = 14;
export const CCI_PERIOD = 20;
export const WILLIAMS_R_PERIOD = 14;

// UI refresh intervals (ms)
export const KLINE_REFRESH = 3000;
export const POLYMARKET_REFRESH = 5000;

// Local storage keys
export const STORAGE_KEYS = {
  API_KEY: 'quant_binance_api_key',
  API_SECRET: 'quant_binance_api_secret',
  SIMULATED_TRADES: 'quant_simulated_trades',
  INDICATOR_CONFIG: 'quant_indicator_config',
  STRATEGY_CONFIG: 'quant_strategy_config',
  CUSTOM_STRATEGIES: 'quant_custom_strategies',
  ACTIVE_STRATEGY: 'quant_active_strategy',
};

// Default config — used by useConfig hook, overridable via Settings UI
export const DEFAULT_CONFIG = {
  // API
  apiEndpoint: BINANCE_REST_BASE,
  wsEndpoint: BINANCE_WS_BASE,
  symbol: SYMBOL,

  // Indicators
  maPeriods: MA_PERIODS,
  emaPeriods: EMA_PERIODS,
  macdParams: { ...MACD_PARAMS },
  rsiPeriod: RSI_PERIOD,
  bollingerParams: { ...BOLLINGER_PARAMS },
  atrPeriod: ATR_PERIOD,
  stochParams: { ...STOCH_PARAMS },
  adxPeriod: ADX_PERIOD,
  mfiPeriod: MFI_PERIOD,
  cciPeriod: CCI_PERIOD,
  williamsRPeriod: WILLIAMS_R_PERIOD,

  // Strategy thresholds
  strategy: {
    regimeWeight: 2,
    maWeight: 1,
    rsiWeight: 2,
    macdWeight: 2,
    bbWeight: 1,
    adxWeight: 1,
    polymarketWeight: 1,
    strongThreshold: 3,
    mediumThreshold: 2,
    strongConfidenceCap: 1.0,
    mediumConfidenceCap: 0.7,
    rsiOversold: 30,
    rsiOverbought: 70,
    rsiWeakOversold: 40,
    rsiWeakOverbought: 60,
    adxStrongThreshold: 25,
    polymarketEdgeThreshold: 0.45,
  },

  // Advanced
  klineRefresh: KLINE_REFRESH,
  polymarketRefresh: POLYMARKET_REFRESH,
};
