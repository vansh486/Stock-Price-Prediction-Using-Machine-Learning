import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Gauge, ShieldCheck, Workflow } from 'lucide-react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function MetricsPanel({ indicators, performance, riskScore, confidence, projectedChangePct }) {
  const rsi = indicators.rsi;
  const rsiLabel = rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Balanced';
  const rsiColor = rsi < 30 ? 'text-emerald-300' : rsi > 70 ? 'text-red-300' : 'text-cyan-300';

  const errorHealth = clamp(Math.round(100 - performance.mape * 13 - performance.rmse * 620), 8, 99);
  const sharpeHealth = clamp(Math.round((performance.sharpe / 3) * 100), 8, 99);
  const executionHint =
    projectedChangePct > 1.5
      ? 'Strong directional setup. Position sizing controls are important.'
      : projectedChangePct < -1.5
        ? 'Bearish pressure detected. Favor defensive risk posture.'
        : 'Range behavior possible. Consider waiting for confirmation.';

  return (
    <section className="fade-slide-in grid grid-cols-1 gap-6 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-[0_18px_34px_rgba(2,6,23,0.24)]">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Technical Pulse</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Indicator Snapshot</h3>

        <div className="mt-5 space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <Gauge size={15} />
                RSI (14)
              </span>
              <span className={`font-semibold ${rsiColor}`}>
                {rsi.toFixed(1)} - {rsiLabel}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{
                  width: `${clamp(rsi, 0, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity size={14} />
                MACD Trend
              </span>
              <span className="font-semibold text-white">{indicators.macd}</span>
            </p>
            <p className="mt-2 flex items-center justify-between">
              <span>EMA-20 Baseline</span>
              <span className="font-semibold text-amber-300">${indicators.ema20.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-[0_18px_34px_rgba(2,6,23,0.24)]">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Model Diagnostics</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Performance Health</h3>

        <div className="mt-5 space-y-4">
          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
            <p className="flex items-center justify-between text-sm text-slate-300">
              <span>Error Efficiency</span>
              <span className="font-semibold text-cyan-300">{errorHealth}%</span>
            </p>
            <div className="h-2.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: `${errorHealth}%` }} />
            </div>
            <p className="text-xs text-slate-400">RMSE {performance.rmse.toFixed(4)} | MAPE {performance.mape.toFixed(2)}%</p>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
            <p className="flex items-center justify-between text-sm text-slate-300">
              <span>Risk-Adjusted Return</span>
              <span className="font-semibold text-emerald-300">{performance.sharpe.toFixed(2)}</span>
            </p>
            <div className="h-2.5 rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${sharpeHealth}%` }} />
            </div>
            <p className="text-xs text-slate-400">Model confidence currently at {confidence}%</p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-[0_18px_34px_rgba(2,6,23,0.24)]">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Risk Console</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Execution Guidance</h3>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
            <p className="text-sm text-slate-300">{executionHint}</p>
          </div>

          <div className="space-y-2 text-sm text-slate-300">
            <p className="flex items-center gap-2">
              {riskScore >= 65 ? (
                <AlertTriangle size={16} className="text-red-300" />
              ) : (
                <ShieldCheck size={16} className="text-emerald-300" />
              )}
              Risk score: {riskScore}/100
            </p>
            <p className="flex items-center gap-2">
              <Workflow size={16} className="text-cyan-300" />
              Use stop-loss discipline when volatility spikes.
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-300" />
              Confirm signal with volume and macro events before entry.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}

export default MetricsPanel;

