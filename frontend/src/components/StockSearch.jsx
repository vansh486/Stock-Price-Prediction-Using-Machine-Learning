import React from 'react';
import { Search, Sparkles } from 'lucide-react';

function StockSearch({ ticker, setTicker, loading, onSubmit, quickTickers, onQuickSelect }) {
  return (
    <section className="fade-slide-in relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_20px_40px_rgba(2,6,23,0.25)] sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-2xl" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            Enter any stock ticker and get instant predictive analytics.
          </p>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1 text-xs tracking-wide text-emerald-200">
            <Sparkles size={12} />
            Real-time AI Snapshot
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Ticker</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="Try AAPL, NVDA, TSLA..."
              className="w-full rounded-xl border border-slate-600 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-cyan-400"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {loading ? 'Loading...' : 'Generate Dashboard'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-xs uppercase tracking-[0.16em] text-slate-400">Quick Load</p>
          {quickTickers.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => onQuickSelect(symbol)}
              className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StockSearch;

