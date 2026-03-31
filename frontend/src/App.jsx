import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  Clock3,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import MarketTickerStrip from './components/MarketTickerStrip';
import StockSearch from './components/StockSearch';

const PriceChart = lazy(() => import('./components/PriceChart'));
const SignalCard = lazy(() => import('./components/SignalCard'));
const MetricsPanel = lazy(() => import('./components/MetricsPanel'));
const WatchlistPanel = lazy(() => import('./components/WatchlistPanel'));
const HeatmapPanel = lazy(() => import('./components/HeatmapPanel'));
const NewsEventsPanel = lazy(() => import('./components/NewsEventsPanel'));
const AlertBuilder = lazy(() => import('./components/AlertBuilder'));
const PortfolioSimulator = lazy(() => import('./components/PortfolioSimulator'));

const QUICK_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'];
const WATCHLIST_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'NFLX'];
const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'];
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const CURRENCY = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TAPE_MARKETS = [
  { symbol: 'SPX', name: 'S&P 500', base: 5238.42 },
  { symbol: 'NDX', name: 'NASDAQ 100', base: 18492.36 },
  { symbol: 'DJI', name: 'Dow 30', base: 39722.84 },
  { symbol: 'RUT', name: 'Russell 2000', base: 2089.73 },
  { symbol: 'VIX', name: 'Volatility', base: 14.88 },
  { symbol: 'BTC', name: 'Bitcoin', base: 67240.52 },
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSignal(signal) {
  const upper = String(signal || '').toUpperCase();
  return ['BUY', 'SELL', 'HOLD'].includes(upper) ? upper : 'HOLD';
}

function formatCurrency(value) {
  return `$${CURRENCY.format(value)}`;
}

function formatSignedPercent(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function seedFromText(text) {
  return String(text)
    .split('')
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function createInitialTape() {
  return TAPE_MARKETS.map((item, index) => {
    const initialChange = ((index % 2 === 0 ? 1 : -1) * (0.28 + index * 0.18)).toFixed(2);
    const open = item.base / (1 + Number(initialChange) / 100);

    return {
      ...item,
      price: Number(item.base.toFixed(2)),
      open: Number(open.toFixed(2)),
      changePct: Number(initialChange),
      volume: Math.round(920000 + index * 165000),
    };
  });
}

function nextTapeState(previousTape) {
  return previousTape.map((item, index) => {
    const wave = Math.sin(Date.now() / 2800 + index) * 0.24;
    const drift = (Math.random() - 0.5) * 0.32;
    const step = wave + drift;
    const nextPrice = Math.max(0.01, item.price * (1 + step / 100));
    const nextChangePct = ((nextPrice - item.open) / item.open) * 100;

    return {
      ...item,
      price: Number(nextPrice.toFixed(2)),
      changePct: Number(nextChangePct.toFixed(2)),
      volume: item.volume + Math.round(Math.random() * 6000),
    };
  });
}

function createLabels(timeframe, points) {
  if (timeframe === '1D') {
    const labels = [];
    let hour = 9;
    let minute = 30;

    for (let index = 0; index < points; index += 1) {
      labels.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      minute += 30;
      if (minute >= 60) {
        minute -= 60;
        hour += 1;
      }
    }
    return labels;
  }

  if (timeframe === '1W') {
    const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return Array.from({ length: points }, (_, index) => `${week[index % 5]} ${Math.floor(index / 5) + 1}`);
  }

  if (timeframe === '1M') {
    return Array.from({ length: points }, (_, index) => `D${index + 1}`);
  }

  if (timeframe === '3M') {
    return Array.from({ length: points }, (_, index) => `W${index + 1}`);
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.slice(0, points);
}

function buildPriceSeries({ current, predicted, ema, timeframe, ticker }) {
  const pointsMap = {
    '1D': 14,
    '1W': 10,
    '1M': 22,
    '3M': 26,
    '1Y': 12,
  };

  const points = pointsMap[timeframe] || 14;
  const labels = createLabels(timeframe, points);
  const seed = seedFromText(ticker);
  const pivot = Math.max(3, Math.floor(points * 0.64));
  const volatilityScale = {
    '1D': 0.0048,
    '1W': 0.0065,
    '1M': 0.0095,
    '3M': 0.013,
    '1Y': 0.018,
  };

  const volatility = current * (volatilityScale[timeframe] || 0.0065);
  const volumeBase = 900000 + (seed % 7) * 155000;

  let prevClose = current * 0.973;
  let emaValue = ema || current;

  return labels.map((label, index) => {
    const progress = index / Math.max(1, points - 1);
    const cycle =
      Math.sin((index + seed * 0.1) * 0.82) * volatility +
      Math.cos((index + seed * 0.07) * 0.38) * volatility * 0.58;

    const trendBeforePivot = current * (0.97 + progress * 0.06);
    const forecastProgress = (index - pivot) / Math.max(1, points - pivot - 1);
    const trendAfterPivot = current + (predicted - current) * clamp(forecastProgress, 0, 1);

    const openRaw = prevClose;
    let closeRaw = (index <= pivot ? trendBeforePivot : trendAfterPivot) + cycle;

    if (index >= pivot) {
      closeRaw += (predicted - closeRaw) * 0.35;
    }

    const open = Math.max(0.01, openRaw);
    const close = Math.max(0.01, closeRaw);
    const high = Math.max(open, close) + Math.abs(cycle) * 0.62 + current * 0.0026;
    const low = Math.max(0.01, Math.min(open, close) - Math.abs(cycle) * 0.62 - current * 0.0026);

    emaValue = emaValue * 0.84 + close * 0.16;
    prevClose = close;

    const volume = Math.round(
      volumeBase *
        (1 + Math.abs(Math.sin(index * 0.59 + seed * 0.01)) * 0.65 + (index >= pivot ? 0.12 : 0)),
    );

    return {
      label,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      ema: Number(emaValue.toFixed(2)),
      volume,
      isForecast: index >= pivot,
    };
  });
}

function deriveSignalMix({ signal, rsi, mape, sharpe }) {
  let buy = signal === 'BUY' ? 56 : 23;
  let sell = signal === 'SELL' ? 56 : 23;
  let hold = signal === 'HOLD' ? 42 : 21;

  if (rsi <= 35) {
    buy += 8;
    sell -= 6;
  }
  if (rsi >= 65) {
    sell += 8;
    buy -= 6;
  }
  if (mape > 2.2) hold += 9;
  if (sharpe > 1.7) hold -= 4;

  buy = clamp(buy, 8, 84);
  sell = clamp(sell, 8, 84);
  hold = clamp(hold, 8, 72);

  const total = buy + hold + sell;
  const normalized = [buy, hold, sell].map((value) => Math.round((value / total) * 100));
  const adjustment = 100 - normalized.reduce((sum, value) => sum + value, 0);
  normalized[0] += adjustment;

  return [
    { name: 'Buy', value: normalized[0], color: '#22c55e' },
    { name: 'Hold', value: normalized[1], color: '#f59e0b' },
    { name: 'Sell', value: normalized[2], color: '#ef4444' },
  ];
}

function createSparkline(seed, base) {
  return Array.from({ length: 18 }, (_, index) => {
    const waveA = Math.sin((index + seed * 0.03) * 0.8) * base * 0.012;
    const waveB = Math.cos((index + seed * 0.06) * 0.45) * base * 0.006;
    return Number((base + waveA + waveB).toFixed(2));
  });
}

function buildWatchlist({ ticker, currentPrice, projectedChangePct, signal }) {
  const uniqueSymbols = [ticker, ...WATCHLIST_SYMBOLS.filter((symbol) => symbol !== ticker)].slice(0, 8);

  return uniqueSymbols.map((symbol, index) => {
    const seed = seedFromText(symbol);
    const directionalBias = signal === 'BUY' ? 0.9 : signal === 'SELL' ? -0.9 : 0;
    const swing = ((seed % 15) - 7) * 0.42 + directionalBias;
    const change = symbol === ticker ? projectedChangePct : swing;

    const priceBase = symbol === ticker ? currentPrice : currentPrice * (0.55 + (seed % 65) / 100);
    const price = Math.max(0.01, priceBase * (1 + change / 100));

    return {
      symbol,
      name: `${symbol} Corp`,
      price: Number(price.toFixed(2)),
      changePct: Number(change.toFixed(2)),
      sparkline: createSparkline(seed, price),
      volume: Math.round(420000 + index * 96000 + (seed % 11) * 26000),
    };
  });
}

function buildHeatmapData({ signal, projectedChangePct, ticker }) {
  const sectors = [
    { name: 'Technology', weight: 1.25 },
    { name: 'Financials', weight: 0.74 },
    { name: 'Healthcare', weight: 0.58 },
    { name: 'Energy', weight: 0.84 },
    { name: 'Industrials', weight: 0.62 },
    { name: 'Consumer', weight: 0.67 },
    { name: 'Utilities', weight: 0.45 },
    { name: 'Materials', weight: 0.52 },
  ];

  const bias = projectedChangePct * 0.46 + (signal === 'BUY' ? 0.42 : signal === 'SELL' ? -0.42 : 0);

  return sectors.map((sector) => {
    const seed = seedFromText(`${ticker}${sector.name}`);
    const noise = ((seed % 17) - 8) * 0.24;
    const changePct = clamp(Number((bias * sector.weight + noise).toFixed(2)), -4.2, 4.2);

    return {
      ...sector,
      changePct,
      flow: Math.round(92 + (seed % 210)),
    };
  });
}

function futureDateLabel(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildNewsItems({ ticker, signal }) {
  return [
    {
      id: 'news-1',
      title: `${ticker} model signal updated to ${signal}`,
      source: 'AI Engine',
      time: 'Just now',
      impact: 'High',
    },
    {
      id: 'news-2',
      title: `${ticker} options activity trending above 20-day average`,
      source: 'Flow Monitor',
      time: '12m ago',
      impact: 'Medium',
    },
    {
      id: 'news-3',
      title: 'Macro sentiment remains range-bound ahead of major data releases',
      source: 'Macro Desk',
      time: '39m ago',
      impact: 'Medium',
    },
    {
      id: 'news-4',
      title: `Sector rotation watch: institutions rotating toward ${signal === 'SELL' ? 'defensive' : 'growth'} names`,
      source: 'Desk Feed',
      time: '1h ago',
      impact: 'Low',
    },
  ];
}

function buildUpcomingEvents({ ticker }) {
  return [
    {
      id: 'event-1',
      title: `${ticker} earnings window`,
      schedule: futureDateLabel(11),
      severity: 'High',
    },
    {
      id: 'event-2',
      title: 'US CPI data release',
      schedule: futureDateLabel(2),
      severity: 'High',
    },
    {
      id: 'event-3',
      title: 'Federal Reserve speaker cycle',
      schedule: futureDateLabel(4),
      severity: 'Medium',
    },
    {
      id: 'event-4',
      title: 'Monthly options expiration',
      schedule: futureDateLabel(17),
      severity: 'Medium',
    },
  ];
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`metric-skeleton-${index}`}
            className="h-28 animate-pulse rounded-2xl border border-slate-700 bg-slate-900"
          />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
      <div className="h-[320px] animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-[460px] animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
      <div className="h-[340px] animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
      <div className="h-[390px] animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
    </div>
  );
}

function MetricCard({ title, value, caption, accent, delay = 0 }) {
  return (
    <article
      className="fade-slide-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_20px_40px_rgba(2,6,23,0.28)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-300">{caption}</p>
    </article>
  );
}

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeframe, setTimeframe] = useState('1D');
  const [theme, setTheme] = useState(() => localStorage.getItem('stock-dashboard-theme') || 'dark');
  const [apiStatus, setApiStatus] = useState('idle');
  const [latencyMs, setLatencyMs] = useState(null);
  const [tickerTape, setTickerTape] = useState(() => createInitialTape());
  const [alerts, setAlerts] = useState([]);
  const requestIdRef = useRef(0);

  const requestPrediction = useCallback(async (rawTicker) => {
    const symbol = String(rawTicker || '')
      .trim()
      .toUpperCase();

    if (!symbol) {
      setError('Please enter a valid ticker symbol.');
      return;
    }

    setTicker(symbol);
    setLoading(true);
    setError('');
    setApiStatus('syncing');
    const requestId = ++requestIdRef.current;
    const startTime = performance.now();

    try {
      const response = await fetch(`${API_BASE}/api/predict/${encodeURIComponent(symbol)}`);
      if (!response.ok) {
        throw new Error(`Unable to fetch data for ${symbol}.`);
      }

      const result = await response.json();
      if (requestId !== requestIdRef.current) return;

      setData(result);
      setLastUpdated(new Date());
      setApiStatus('online');
      setLatencyMs(Math.round(performance.now() - startTime));
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;
      setError(fetchError.message || 'Something went wrong while loading market data.');
      setApiStatus('offline');
      setLatencyMs(Math.round(performance.now() - startTime));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    requestPrediction('AAPL');
  }, [requestPrediction]);

  useEffect(() => {
    localStorage.setItem('stock-dashboard-theme', theme);
  }, [theme]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerTape((previous) => nextTapeState(previous));
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const dashboard = useMemo(() => {
    if (!data) return null;

    const currentPrice = toNumber(data.current_price, 0);
    const predictedPrice = toNumber(data.predicted_price, currentPrice);
    const signal = normalizeSignal(data.signal);

    const indicators = {
      rsi: clamp(toNumber(data?.indicators?.RSI_14, 50), 0, 100),
      macd: String(data?.indicators?.MACD || 'Neutral'),
      ema20: toNumber(data?.indicators?.EMA_20, currentPrice),
    };

    const performance = {
      rmse: toNumber(data?.performance_metrics?.rmse, 0.0039),
      mape: toNumber(data?.performance_metrics?.mape, 1.42),
      sharpe: toNumber(data?.performance_metrics?.sharpe_ratio, 1.65),
    };

    const projectedChange = predictedPrice - currentPrice;
    const projectedChangePct = currentPrice > 0 ? (projectedChange / currentPrice) * 100 : 0;

    const confidence = clamp(
      Math.round(78 + (performance.sharpe - 1) * 12 - performance.mape * 7 - performance.rmse * 520),
      24,
      97,
    );

    const riskScore = clamp(
      Math.round(Math.abs(projectedChangePct) * 2.8 + (indicators.rsi < 30 || indicators.rsi > 70 ? 24 : 10)),
      8,
      95,
    );

    const symbol = String(data.ticker || ticker).toUpperCase();

    return {
      ticker: symbol,
      currentPrice,
      predictedPrice,
      projectedChange,
      projectedChangePct,
      signal,
      indicators,
      performance,
      confidence,
      riskScore,
      signalMix: deriveSignalMix({
        signal,
        rsi: indicators.rsi,
        mape: performance.mape,
        sharpe: performance.sharpe,
      }),
      chartData: buildPriceSeries({
        current: currentPrice,
        predicted: predictedPrice,
        ema: indicators.ema20,
        timeframe,
        ticker: symbol,
      }),
      watchlist: buildWatchlist({
        ticker: symbol,
        currentPrice,
        projectedChangePct,
        signal,
      }),
      sectors: buildHeatmapData({
        signal,
        projectedChangePct,
        ticker: symbol,
      }),
      news: buildNewsItems({
        ticker: symbol,
        signal,
      }),
      events: buildUpcomingEvents({
        ticker: symbol,
      }),
    };
  }, [data, ticker, timeframe]);

  const marketStatus = useMemo(() => {
    const now = new Date();
    const minutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
    const minutesEt = (minutesUtc - 240 + 1440) % 1440;
    const isWeekday = now.getUTCDay() >= 1 && now.getUTCDay() <= 5;
    return isWeekday && minutesEt >= 570 && minutesEt < 960 ? 'US Market Open' : 'US Market Closed';
  }, []);

  const updatedAt = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--';

  const apiStatusLabel =
    apiStatus === 'online' ? 'API Connected' : apiStatus === 'syncing' ? 'Syncing' : apiStatus === 'offline' ? 'API Offline' : 'Waiting';

  const toggleTheme = () => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    requestPrediction(ticker);
  };

  const addAlert = (alert) => {
    setAlerts((previous) => [alert, ...previous].slice(0, 8));
  };

  const removeAlert = (id) => {
    setAlerts((previous) => previous.filter((alert) => alert.id !== id));
  };

  return (
    <div data-theme={theme} className="relative min-h-screen overflow-hidden text-slate-100 transition-colors duration-300">
      <div
        className={`pointer-events-none absolute inset-0 ${
          theme === 'dark'
            ? 'bg-[radial-gradient(circle_at_12%_8%,rgba(20,184,166,0.17),transparent_36%),radial-gradient(circle_at_86%_4%,rgba(14,165,233,0.18),transparent_30%),linear-gradient(150deg,#030712_0%,#0b1221_45%,#111827_100%)]'
            : 'bg-[radial-gradient(circle_at_12%_8%,rgba(14,116,144,0.12),transparent_38%),radial-gradient(circle_at_86%_4%,rgba(59,130,246,0.12),transparent_30%),linear-gradient(150deg,#eff6ff_0%,#dbeafe_42%,#f8fafc_100%)]'
        }`}
      />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-size:34px_34px] [background-image:linear-gradient(to_right,rgba(100,116,139,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.16)_1px,transparent_1px)]" />

      <main className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400 bg-cyan-500/15 px-3 py-1 text-xs tracking-[0.22em] text-cyan-200">
              <Sparkles size={14} />
              AI Trading Command Center
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Next-Level Stock Intelligence Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
              Premium trading interface with live market tape, candlestick and volume analytics, smart alerts, and risk simulation.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </header>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="fade-slide-in rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" style={{ animationDelay: '0ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">API Status</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-cyan-300">
              {apiStatus === 'offline' ? <WifiOff size={14} /> : <Wifi size={14} />}
              {apiStatusLabel}
            </p>
          </div>
          <div className="fade-slide-in rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" style={{ animationDelay: '60ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Data Latency</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Activity size={14} />
              {latencyMs ? `${latencyMs} ms` : '--'}
            </p>
          </div>
          <div className="fade-slide-in rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" style={{ animationDelay: '120ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Last Sync</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Clock3 size={14} />
              {updatedAt}
            </p>
          </div>
          <div className="fade-slide-in rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" style={{ animationDelay: '180ms' }}>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Market Session</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-amber-300">
              <ShieldCheck size={14} />
              {marketStatus}
            </p>
          </div>
        </div>

        <MarketTickerStrip items={tickerTape} />

        <div className="mt-5">
          <StockSearch
            ticker={ticker}
            setTicker={setTicker}
            loading={loading}
            onSubmit={handleSubmit}
            quickTickers={QUICK_TICKERS}
            onQuickSelect={requestPrediction}
          />
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500 bg-red-950/50 p-4 text-red-100">
            <AlertCircle className="mt-0.5 shrink-0 text-red-300" size={20} />
            <div>
              <p className="text-sm font-semibold">Data request failed</p>
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        ) : null}

        {loading && !dashboard ? (
          <div className="mt-6">
            <LoadingSkeleton />
          </div>
        ) : null}

        {dashboard ? (
          <section className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Live Price"
                value={formatCurrency(dashboard.currentPrice)}
                caption={`${dashboard.ticker} spot reference`}
                accent="text-slate-100"
                delay={0}
              />
              <MetricCard
                title="Predicted Close"
                value={formatCurrency(dashboard.predictedPrice)}
                caption="LSTM model target"
                accent="text-cyan-300"
                delay={80}
              />
              <MetricCard
                title="Projected Move"
                value={formatSignedPercent(dashboard.projectedChangePct)}
                caption={`${formatCurrency(dashboard.projectedChange)} expected swing`}
                accent={dashboard.projectedChangePct >= 0 ? 'text-emerald-300' : 'text-red-300'}
                delay={160}
              />
              <MetricCard
                title="Model Confidence"
                value={`${dashboard.confidence}%`}
                caption="Signal reliability score"
                accent="text-amber-300"
                delay={240}
              />
            </div>

            <Suspense fallback={<PanelSkeleton />}>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <PriceChart
                  ticker={dashboard.ticker}
                  chartData={dashboard.chartData}
                  currentPrice={dashboard.currentPrice}
                  predictedPrice={dashboard.predictedPrice}
                  projectedChangePct={dashboard.projectedChangePct}
                  signal={dashboard.signal}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  timeframes={TIMEFRAMES}
                  theme={theme}
                />
                <SignalCard
                  signal={dashboard.signal}
                  confidence={dashboard.confidence}
                  riskScore={dashboard.riskScore}
                  signalMix={dashboard.signalMix}
                  projectedChangePct={dashboard.projectedChangePct}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <WatchlistPanel
                  watchlist={dashboard.watchlist}
                  onSelectTicker={requestPrediction}
                />
                <HeatmapPanel sectors={dashboard.sectors} />
              </div>

              <MetricsPanel
                indicators={dashboard.indicators}
                performance={dashboard.performance}
                riskScore={dashboard.riskScore}
                confidence={dashboard.confidence}
                projectedChangePct={dashboard.projectedChangePct}
              />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <NewsEventsPanel
                    newsItems={dashboard.news}
                    upcomingEvents={dashboard.events}
                  />
                </div>
                <div className="space-y-6">
                  <AlertBuilder
                    key={`alerts-${dashboard.ticker}`}
                    ticker={dashboard.ticker}
                    currentPrice={dashboard.currentPrice}
                    alerts={alerts}
                    onAddAlert={addAlert}
                    onRemoveAlert={removeAlert}
                  />
                  <PortfolioSimulator
                    key={`portfolio-${dashboard.ticker}`}
                    ticker={dashboard.ticker}
                    currentPrice={dashboard.currentPrice}
                    signal={dashboard.signal}
                  />
                </div>
              </div>
            </Suspense>
          </section>
        ) : null}

        {!loading && !dashboard ? (
          <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center">
            <Bot size={28} className="mx-auto text-cyan-300" />
            <h2 className="mt-3 text-2xl font-semibold text-white">Search any stock to load the dashboard</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
              Enter a ticker symbol to generate a full market view with charting, signal analytics, alerts, risk simulation, and trust indicators.
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;

