import React from 'react';
import {
  Activity,
  ArrowDown,
  BarChart3,
  Bot,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
}

function actionSummary(signal) {
  if (signal === 'BUY') return 'Upside bias favors accumulation on confirmation.';
  if (signal === 'SELL') return 'Defensive posture is preferred until pressure cools.';
  return 'Bias is balanced. Wait for additional confirmation.';
}

function signalTone(signal) {
  if (signal === 'BUY') {
    return {
      badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
      icon: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      primary: 'text-emerald-300',
      dot: 'bg-emerald-400',
    };
  }

  if (signal === 'SELL') {
    return {
      badge: 'border-red-500/40 bg-red-500/10 text-red-200',
      icon: 'border-red-500/30 bg-red-500/10 text-red-300',
      primary: 'text-red-300',
      dot: 'bg-red-400',
    };
  }

  return {
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    icon: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    primary: 'text-amber-300',
    dot: 'bg-amber-400',
  };
}

function stageTone(kind) {
  if (kind === 'feed') {
    return {
      icon: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
      value: 'text-cyan-300',
      dot: 'bg-cyan-400',
    };
  }

  if (kind === 'indicators') {
    return {
      icon: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
      value: 'text-sky-300',
      dot: 'bg-sky-400',
    };
  }

  if (kind === 'forecast') {
    return {
      icon: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      value: 'text-amber-300',
      dot: 'bg-amber-400',
    };
  }

  return {
    icon: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    value: 'text-emerald-300',
    dot: 'bg-emerald-400',
  };
}

function PipelineStage({ stage, showMobileConnector = false }) {
  const Icon = stage.icon;

  return (
    <div className="relative">
      <article className="pipeline-stage fade-slide-in relative h-full rounded-2xl border border-slate-700 bg-slate-950/90 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${stage.tone.icon}`}>
              <Icon size={18} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{stage.eyebrow}</p>
              <h3 className="mt-1 text-base font-semibold text-white">{stage.title}</h3>
            </div>
          </div>
          <span className={`status-dot ${stage.tone.dot}`} />
        </div>

        <p className={`mt-4 text-xl font-semibold ${stage.tone.value}`}>{stage.primary}</p>
        <p className="mt-1 text-sm text-slate-300">{stage.secondary}</p>

        <div className="mt-4 space-y-2">
          {stage.metrics.map((metric) => (
            <div
              key={`${stage.title}-${metric.label}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm"
            >
              <span className="text-slate-400">{metric.label}</span>
              <span className="font-semibold text-slate-100">{metric.value}</span>
            </div>
          ))}
        </div>
      </article>

      {showMobileConnector ? (
        <div className="mt-3 flex justify-center xl:hidden">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-400">
            <ArrowDown size={15} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

function SignalPipelinePanel({
  ticker,
  currentPrice,
  predictedPrice,
  projectedChangePct,
  signal,
  indicators,
  performance,
  confidence,
  riskScore,
  apiStatus,
  latencyLabel,
  updatedAt,
  marketStatus,
}) {
  const actionTone = signalTone(signal);
  const stages = [
    {
      eyebrow: 'Stage 01',
      title: 'Market Input',
      icon: Activity,
      tone: stageTone('feed'),
      primary: apiStatus,
      secondary: `${latencyLabel} latency with ${updatedAt} sync time.`,
      metrics: [
        { label: 'Ticker', value: ticker },
        { label: 'Session', value: marketStatus },
        { label: 'Reference', value: formatCurrency(currentPrice) },
      ],
    },
    {
      eyebrow: 'Stage 02',
      title: 'Indicator Scan',
      icon: BarChart3,
      tone: stageTone('indicators'),
      primary: `RSI ${indicators.rsi.toFixed(1)}`,
      secondary: 'Momentum and baseline checks update before the model pass.',
      metrics: [
        { label: 'MACD', value: indicators.macd },
        { label: 'EMA-20', value: formatCurrency(indicators.ema20) },
        { label: 'Signal Drift', value: indicators.rsi >= 65 ? 'Hot' : indicators.rsi <= 35 ? 'Cooling' : 'Balanced' },
      ],
    },
    {
      eyebrow: 'Stage 03',
      title: 'Forecast Model',
      icon: Bot,
      tone: stageTone('forecast'),
      primary: formatCurrency(predictedPrice),
      secondary: `Projection is ${formatPercent(projectedChangePct)} from the current reference.`,
      metrics: [
        { label: 'Spot', value: formatCurrency(currentPrice) },
        { label: 'MAPE', value: `${performance.mape.toFixed(2)}%` },
        { label: 'Sharpe', value: performance.sharpe.toFixed(2) },
      ],
    },
    {
      eyebrow: 'Stage 04',
      title: 'Risk Screen',
      icon: ShieldCheck,
      tone: stageTone('risk'),
      primary: `${confidence}% confidence`,
      secondary: 'Model quality and volatility checks shape the execution envelope.',
      metrics: [
        { label: 'Risk Score', value: `${riskScore}/100` },
        { label: 'RMSE', value: performance.rmse.toFixed(4) },
        { label: 'Move', value: formatPercent(projectedChangePct) },
      ],
    },
    {
      eyebrow: 'Stage 05',
      title: 'Trade Bias',
      icon: Sparkles,
      tone: actionTone,
      primary: signal,
      secondary: actionSummary(signal),
      metrics: [
        { label: 'Plan', value: signal === 'BUY' ? 'Lean long' : signal === 'SELL' ? 'Lean short' : 'Stay selective' },
        { label: 'Target', value: formatCurrency(predictedPrice) },
        { label: 'Edge', value: formatPercent(projectedChangePct) },
      ],
    },
  ];

  return (
    <section className="fade-slide-in panel-hover relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-[0_24px_48px_rgba(2,6,23,0.26)] sm:p-6">
      <div className="pointer-events-none absolute -left-10 top-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-4 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Decision Flow</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Signal Pipeline Flowchart</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Follow the path from feed health and indicators to model output, risk filtering, and the final execution bias.
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${actionTone.badge}`}>
          <span className={`status-dot ${actionTone.dot}`} />
          {signal} bias for {ticker}
        </div>
      </div>

      <div className="relative mt-6">
        <div className="pointer-events-none absolute inset-x-[8%] top-1/2 hidden -translate-y-1/2 xl:block">
          <div className="pipeline-track h-px bg-gradient-to-r from-cyan-400/45 via-amber-300/35 to-emerald-400/45" />
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          {stages.map((stage, index) => (
            <PipelineStage
              key={stage.title}
              stage={stage}
              showMobileConnector={index < stages.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default SignalPipelinePanel;
