import React, { useMemo, useState } from 'react';
import { Calculator, Shield } from 'lucide-react';

function PortfolioSimulator({ currentPrice, signal }) {
  const [capital, setCapital] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1.5);
  const [entry, setEntry] = useState(currentPrice);
  const [stopLossPercent, setStopLossPercent] = useState(2.0);
  const [targetPercent, setTargetPercent] = useState(5.0);
  const [direction, setDirection] = useState(signal === 'SELL' ? 'SHORT' : 'LONG');

  const simulation = useMemo(() => {
    const safeEntry = Math.max(0.01, Number(entry) || 0.01);
    const safeCapital = Math.max(1, Number(capital) || 1);
    const safeRiskPercent = Math.max(0.1, Number(riskPercent) || 0.1);
    const safeStopPercent = Math.max(0.1, Number(stopLossPercent) || 0.1);
    const safeTargetPercent = Math.max(0.1, Number(targetPercent) || 0.1);

    const stopPrice =
      direction === 'LONG'
        ? safeEntry * (1 - safeStopPercent / 100)
        : safeEntry * (1 + safeStopPercent / 100);

    const targetPrice =
      direction === 'LONG'
        ? safeEntry * (1 + safeTargetPercent / 100)
        : safeEntry * (1 - safeTargetPercent / 100);

    const riskBudget = (safeCapital * safeRiskPercent) / 100;
    const riskPerShare = Math.max(0.01, Math.abs(safeEntry - stopPrice));
    const rewardPerShare = Math.max(0.01, Math.abs(targetPrice - safeEntry));
    const quantity = Math.max(0, Math.floor(riskBudget / riskPerShare));

    const potentialLoss = quantity * riskPerShare;
    const potentialGain = quantity * rewardPerShare;
    const rrRatio = potentialLoss > 0 ? potentialGain / potentialLoss : 0;
    const positionValue = quantity * safeEntry;
    const exposure = (positionValue / safeCapital) * 100;

    return {
      stopPrice,
      targetPrice,
      riskBudget,
      quantity,
      potentialLoss,
      potentialGain,
      rrRatio,
      exposure,
      positionValue,
    };
  }, [capital, riskPercent, entry, stopLossPercent, targetPercent, direction]);

  return (
    <article className="fade-slide-in rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_18px_34px_rgba(2,6,23,0.24)] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calculator size={16} className="text-amber-300" />
        <h3 className="text-lg font-semibold text-white">Portfolio Simulator</h3>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Capital
            <input
              type="number"
              value={capital}
              onChange={(event) => setCapital(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400">
            Risk %
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(event) => setRiskPercent(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Entry Price
            <input
              type="number"
              step="0.01"
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400">
            Direction
            <select
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">
            Stop Loss %
            <input
              type="number"
              step="0.1"
              value={stopLossPercent}
              onChange={(event) => setStopLossPercent(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-400">
            Target %
            <input
              type="number"
              step="0.1"
              value={targetPercent}
              onChange={(event) => setTargetPercent(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm">
        <p className="flex items-center justify-between text-slate-300">
          <span>Risk Budget</span>
          <span className="font-semibold text-amber-300">${simulation.riskBudget.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span>Position Size</span>
          <span className="font-semibold text-slate-100">{simulation.quantity} shares</span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span>Position Value</span>
          <span className="font-semibold text-slate-100">${simulation.positionValue.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span>Stop / Target</span>
          <span className="font-semibold text-slate-100">
            ${simulation.stopPrice.toFixed(2)} / ${simulation.targetPrice.toFixed(2)}
          </span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span>Potential P/L</span>
          <span className="font-semibold text-emerald-300">
            +${simulation.potentialGain.toFixed(2)} / -${simulation.potentialLoss.toFixed(2)}
          </span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span>Risk Reward</span>
          <span className="font-semibold text-cyan-300">{simulation.rrRatio.toFixed(2)}R</span>
        </p>
        <p className="flex items-center justify-between text-slate-300">
          <span className="inline-flex items-center gap-1">
            <Shield size={14} />
            Exposure
          </span>
          <span className="font-semibold text-slate-100">{simulation.exposure.toFixed(1)}%</span>
        </p>
      </div>
    </article>
  );
}

export default PortfolioSimulator;

