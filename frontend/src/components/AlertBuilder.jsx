import React, { useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';

function AlertBuilder({ ticker, currentPrice, alerts, onAddAlert, onRemoveAlert }) {
  const [metric, setMetric] = useState('price');
  const [operator, setOperator] = useState('>');
  const [threshold, setThreshold] = useState(() => currentPrice.toFixed(2));
  const [channel, setChannel] = useState('In-App');

  const addAlert = (event) => {
    event.preventDefault();

    const value = Number(threshold);
    if (!Number.isFinite(value) || value <= 0) return;

    onAddAlert({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      ticker,
      metric,
      operator,
      value,
      channel,
      createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  return (
    <article className="fade-slide-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_18px_34px_rgba(2,6,23,0.24)] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell size={16} className="text-cyan-300" />
        <h3 className="text-lg font-semibold text-white">Alert Builder</h3>
      </div>

      <form onSubmit={addAlert} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            <option value="price">Price</option>
            <option value="rsi">RSI</option>
            <option value="volume">Volume</option>
          </select>
          <select
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            <option value=">">Above</option>
            <option value="<">Below</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          />
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100"
          >
            <option>In-App</option>
            <option>Email</option>
            <option>SMS</option>
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          <Plus size={14} />
          Create Alert
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400">
            No alerts yet. Create your first trigger.
          </p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {alert.ticker} {alert.metric} {alert.operator} {alert.value}
                </p>
                <p className="text-[11px] text-slate-400">
                  {alert.channel} • {alert.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAlert(alert.id)}
                className="rounded-md border border-slate-600 p-1 text-slate-400 transition hover:border-red-500 hover:text-red-300"
                aria-label="Remove alert"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default AlertBuilder;

