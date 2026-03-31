import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

function MarketTickerStrip({ items }) {
  const tape = [...items, ...items];

  return (
    <section className="fade-slide-in overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 px-2 py-2 shadow-[0_18px_36px_rgba(2,6,23,0.25)]">
      <div className="ticker-marquee">
        <div className="ticker-marquee-track">
          {tape.map((item, index) => {
            const positive = item.changePct >= 0;

            return (
              <div
                key={`${item.symbol}-${index}`}
                className="min-w-[176px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{item.name}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{item.symbol}</p>
                  <p className="text-xs text-slate-300">{item.price.toLocaleString('en-US')}</p>
                </div>
                <p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-300' : 'text-red-300'}`}>
                  {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {positive ? '+' : ''}
                  {item.changePct.toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default MarketTickerStrip;

