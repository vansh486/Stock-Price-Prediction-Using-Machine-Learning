import React from 'react';
import { Flame } from 'lucide-react';

function colorForChange(changePct) {
  const intensity = Math.min(0.88, Math.abs(changePct) / 4 + 0.18);

  if (changePct >= 0) {
    return {
      background: `rgba(34, 197, 94, ${intensity})`,
      text: '#ecfdf5',
    };
  }

  return {
    background: `rgba(239, 68, 68, ${intensity})`,
    text: '#fef2f2',
  };
}

function HeatmapPanel({ sectors }) {
  return (
    <article className="fade-slide-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_18px_34px_rgba(2,6,23,0.24)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Market Heatmap</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Sector Rotation</h3>
        </div>
        <p className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-xs text-slate-300">
          <Flame size={13} />
          live strength
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sectors.map((sector) => {
          const tone = colorForChange(sector.changePct);

          return (
            <article
              key={sector.name}
              className="rounded-xl border border-slate-700 p-3 transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: tone.background,
                color: tone.text,
              }}
            >
              <p className="text-xs uppercase tracking-[0.14em] opacity-85">{sector.name}</p>
              <p className="mt-2 text-lg font-semibold">
                {sector.changePct >= 0 ? '+' : ''}
                {sector.changePct.toFixed(2)}%
              </p>
              <p className="mt-1 text-xs opacity-90">Flow {sector.flow}</p>
            </article>
          );
        })}
      </div>
    </article>
  );
}

export default HeatmapPanel;

