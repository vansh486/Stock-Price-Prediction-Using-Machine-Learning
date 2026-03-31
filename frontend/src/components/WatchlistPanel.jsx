import React from 'react';
import { ArrowDownRight, ArrowUpRight, Eye } from 'lucide-react';

function sparklinePath(values, width = 96, height = 28) {
  if (!values.length) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.001, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function WatchlistPanel({ watchlist, onSelectTicker }) {
  return (
    <article className="fade-slide-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_18px_34px_rgba(2,6,23,0.24)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Watchlist</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Top Symbols</h3>
        </div>
        <p className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-xs text-slate-300">
          <Eye size={13} />
          {watchlist.length} assets
        </p>
      </div>

      <div className="space-y-2">
        {watchlist.map((item) => {
          const positive = item.changePct >= 0;
          const sparkColor = positive ? '#22c55e' : '#ef4444';

          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelectTicker(item.symbol)}
              className="group flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-cyan-400"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">{item.symbol}</p>
                <p className="text-xs text-slate-400">Vol {item.volume.toLocaleString('en-US')}</p>
              </div>

              <svg viewBox="0 0 96 28" className="h-7 w-24">
                <path d={sparklinePath(item.sparkline)} fill="none" stroke={sparkColor} strokeWidth="2" strokeLinecap="round" />
              </svg>

              <div className="text-right">
                <p className="text-sm font-semibold text-slate-100">${item.price.toFixed(2)}</p>
                <p className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-300' : 'text-red-300'}`}>
                  {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {positive ? '+' : ''}
                  {item.changePct.toFixed(2)}%
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </article>
  );
}

export default WatchlistPanel;

