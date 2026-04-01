import React from 'react';
import { CalendarDays, Newspaper } from 'lucide-react';

function badgeTone(impact) {
  if (impact === 'High') return 'border-red-500 bg-red-500/15 text-red-200';
  if (impact === 'Medium') return 'border-amber-500 bg-amber-500/15 text-amber-200';
  return 'border-emerald-500 bg-emerald-500/15 text-emerald-200';
}

function NewsEventsPanel({ newsItems, upcomingEvents }) {
  return (
    <article className="fade-slide-in panel-hover rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-[0_18px_34px_rgba(2,6,23,0.24)] sm:p-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Newspaper size={16} className="text-cyan-300" />
            <h3 className="text-lg font-semibold text-white">News Feed</h3>
          </div>
          <div className="space-y-3">
            {newsItems.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-sm font-medium text-slate-100">{item.title}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    {item.source} • {item.time}
                  </p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeTone(item.impact)}`}>
                    {item.impact}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-300" />
            <h3 className="text-lg font-semibold text-white">Upcoming Events</h3>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <article key={event.id} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
                <p className="text-sm font-medium text-slate-100">{event.title}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">{event.schedule}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeTone(event.severity)}`}>
                    {event.severity}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}

export default NewsEventsPanel;

