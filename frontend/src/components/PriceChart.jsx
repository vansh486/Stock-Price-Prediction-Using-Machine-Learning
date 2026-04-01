import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import { formatCurrencyValue } from '../utils/market';

function buildPath(points, xForIndex, yForValue, key) {
  if (!points.length) return '';

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(point[key])}`)
    .join(' ');
}

function PriceChart({
  ticker,
  chartData,
  currentPrice,
  predictedPrice,
  projectedChangePct,
  signal,
  market,
  timeframe,
  onTimeframeChange,
  timeframes,
  theme,
}) {
  const isPositive = projectedChangePct >= 0;
  const directionTone = isPositive ? 'text-emerald-300' : 'text-red-300';

  const chart = useMemo(() => {
    if (!chartData?.length) return null;

    const width = 980;
    const height = 420;
    const left = 58;
    const right = 22;
    const top = 20;
    const priceBottom = 270;
    const volumeTop = 300;
    const volumeBottom = 390;

    const maxHigh = Math.max(...chartData.map((point) => point.high));
    const minLow = Math.min(...chartData.map((point) => point.low));
    const priceRange = Math.max(0.01, maxHigh - minLow);
    const maxVolume = Math.max(...chartData.map((point) => point.volume));

    const step = chartData.length > 1 ? (width - left - right) / (chartData.length - 1) : width - left - right;
    const candleWidth = Math.max(6, Math.min(18, step * 0.56));

    const xForIndex = (index) => left + step * index;
    const yForPrice = (price) => top + ((maxHigh - price) / priceRange) * (priceBottom - top);
    const yForVolume = (volume) =>
      volumeBottom - (volume / Math.max(1, maxVolume)) * (volumeBottom - volumeTop);

    const closePath = buildPath(chartData, xForIndex, yForPrice, 'close');
    const emaPath = buildPath(chartData, xForIndex, yForPrice, 'ema');

    const forecastStart = chartData.findIndex((point) => point.isForecast);
    const yTicks = Array.from({ length: 5 }, (_, tickIndex) => maxHigh - (priceRange / 4) * tickIndex);
    const xTickEvery = Math.max(1, Math.floor(chartData.length / 8));

    return {
      width,
      height,
      left,
      right,
      top,
      priceBottom,
      volumeTop,
      volumeBottom,
      xForIndex,
      yForPrice,
      yForVolume,
      candleWidth,
      closePath,
      emaPath,
      forecastStart,
      yTicks,
      xTickEvery,
      maxVolume,
    };
  }, [chartData]);

  const gridStroke = theme === 'light' ? '#cbd5e1' : '#334155';
  const textTone = theme === 'light' ? '#334155' : '#94a3b8';
  const paneBg = theme === 'light' ? '#f8fafc' : '#020617';

  if (!chart) {
    return null;
  }

  return (
    <article className="fade-slide-in panel-hover rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_20px_40px_rgba(2,6,23,0.28)] sm:p-6 xl:col-span-2">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Candlestick + Volume</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{ticker} Trading Structure</h2>
          <p className="mt-1 text-sm text-slate-300">
            Current {formatCurrencyValue(currentPrice, market)} to predicted {formatCurrencyValue(predictedPrice, market)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200">
            <BarChart3 size={14} />
            Signal {signal}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs ${directionTone}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {isPositive ? '+' : ''}
            {projectedChangePct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {timeframes.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => onTimeframeChange(range)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              timeframe === range
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-600 bg-slate-950 text-slate-300 hover:border-cyan-400'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      <div key={timeframe} className="chart-refresh h-[390px] w-full rounded-xl border border-slate-700 bg-slate-950 p-2">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full">
          <rect x="0" y="0" width={chart.width} height={chart.height} fill={paneBg} />

          {chart.yTicks.map((tick) => (
            <g key={`y-grid-${tick}`}>
              <line
                x1={chart.left}
                y1={chart.yForPrice(tick)}
                x2={chart.width - chart.right}
                y2={chart.yForPrice(tick)}
                stroke={gridStroke}
                strokeDasharray="4 4"
              />
              <text x={8} y={chart.yForPrice(tick) + 4} fill={textTone} fontSize="11">
                {formatCurrencyValue(tick, market, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}

          {chart.forecastStart >= 0 && (
            <rect
              x={chart.xForIndex(chart.forecastStart)}
              y={chart.top}
              width={chart.width - chart.right - chart.xForIndex(chart.forecastStart)}
              height={chart.priceBottom - chart.top}
              fill="rgba(56, 189, 248, 0.08)"
            />
          )}

          {chartData.map((point, index) => {
            const x = chart.xForIndex(index);
            const yOpen = chart.yForPrice(point.open);
            const yClose = chart.yForPrice(point.close);
            const yHigh = chart.yForPrice(point.high);
            const yLow = chart.yForPrice(point.low);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
            const isBull = point.close >= point.open;
            const candleColor = isBull ? '#22c55e' : '#ef4444';

            const volumeTop = chart.yForVolume(point.volume);

            return (
              <g key={`${point.label}-${index}`}>
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={point.isForecast ? '#94a3b8' : candleColor}
                  strokeWidth="1.4"
                  opacity={point.isForecast ? 0.55 : 0.92}
                />
                <rect
                  x={x - chart.candleWidth / 2}
                  y={bodyTop}
                  width={chart.candleWidth}
                  height={bodyHeight}
                  rx="1"
                  fill={candleColor}
                  opacity={point.isForecast ? 0.52 : 0.9}
                />
                <rect
                  x={x - chart.candleWidth / 2}
                  y={volumeTop}
                  width={chart.candleWidth}
                  height={chart.volumeBottom - volumeTop}
                  fill={isBull ? 'rgba(34,197,94,0.58)' : 'rgba(239,68,68,0.58)'}
                />

                {(index % chart.xTickEvery === 0 || index === chartData.length - 1) && (
                  <text x={x} y={410} fill={textTone} fontSize="11" textAnchor="middle">
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}

          <path d={chart.closePath} fill="none" stroke="#38bdf8" strokeWidth="2.2" opacity="0.82" />
          <path d={chart.emaPath} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.9" />

          <line
            x1={chart.left}
            y1={chart.yForPrice(currentPrice)}
            x2={chart.width - chart.right}
            y2={chart.yForPrice(currentPrice)}
            stroke="#22d3ee"
            strokeDasharray="3 4"
            opacity="0.5"
          />

          <text x={chart.left + 2} y={chart.volumeTop - 8} fill={textTone} fontSize="11">
            Volume
          </text>
          <text x={chart.left + 2} y={chart.priceBottom + 16} fill={textTone} fontSize="11">
            Max Vol {Math.round(chart.maxVolume / 1000)}K
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Close Trend
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          EMA-20
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Forecast Region
        </span>
      </div>
    </article>
  );
}

export default PriceChart;

