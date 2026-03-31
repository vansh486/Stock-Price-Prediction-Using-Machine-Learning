import React from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { ShieldAlert, ShieldCheck, Target } from 'lucide-react';

function SignalCard({ signal, confidence, riskScore, signalMix, projectedChangePct }) {
  const signalTone =
    signal === 'BUY'
      ? 'text-emerald-300 border-emerald-500 bg-emerald-500/10'
      : signal === 'SELL'
        ? 'text-red-300 border-red-500 bg-red-500/10'
        : 'text-amber-300 border-amber-500 bg-amber-500/10';

  const riskLabel = riskScore >= 70 ? 'High Risk' : riskScore >= 40 ? 'Moderate Risk' : 'Low Risk';
  const actionText =
    signal === 'BUY'
      ? 'Momentum and model trend favor upside continuation.'
      : signal === 'SELL'
        ? 'Model warns of downside pressure and mean reversion risk.'
        : 'Signal is balanced. Wait for stronger directional confirmation.';

  return (
    <article className="fade-slide-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_20px_40px_rgba(2,6,23,0.28)] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Signal Engine</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Decision Diagram</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${signalTone}`}>{signal}</span>
      </div>

      <div className="relative h-56 rounded-xl border border-slate-700 bg-slate-950 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={signalMix}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="transparent"
            >
              {signalMix.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-semibold text-white">{confidence}%</p>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Confidence</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {signalMix.map((slice) => (
          <div key={slice.name}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
              <span>{slice.name}</span>
              <span className="font-semibold">{slice.value}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-700">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${slice.value}%`,
                  background: slice.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
          <Target size={16} />
          Expected Move: {projectedChangePct >= 0 ? '+' : ''}
          {projectedChangePct.toFixed(2)}%
        </p>
        <p className="text-sm text-slate-300">{actionText}</p>
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
          {riskScore >= 60 ? <ShieldAlert size={14} className="text-red-300" /> : <ShieldCheck size={14} className="text-emerald-300" />}
          Risk Profile: {riskLabel}
        </p>
      </div>
    </article>
  );
}

export default SignalCard;

