'use client';

import { useState, useMemo } from 'react';
import { getCosmicEvents } from '../../lib/cosmic-events';
import type { CosmicEvent } from '../../lib/cosmic-events';

interface CosmicCalendarProps {
  currentDate: string; // YYYY-MM-DD
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CosmicCalendar({ currentDate }: CosmicCalendarProps) {
  const today = new Date();
  const todayStr = isoDate(today);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(currentDate + 'T12:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const monthData = useMemo(() => {
    const year = viewDate.year;
    const month = viewDate.month;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; events: CosmicEvent[]; isToday: boolean; isCurrent: boolean }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = isoDate(date);
      const events = getCosmicEvents(date);
      days.push({
        day: d,
        dateStr,
        events,
        isToday: dateStr === todayStr,
        isCurrent: dateStr === currentDate,
      });
    }

    return { firstDay, days, daysInMonth };
  }, [viewDate.year, viewDate.month, currentDate, todayStr]);

  const monthName = new Date(viewDate.year, viewDate.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev.year, prev.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const nextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev.year, prev.month + 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="cosmic-calendar">
      {/* Month header */}
      <div className="cal-header">
        <button onClick={prevMonth} aria-label="Previous month" className="cal-nav">&larr;</button>
        <span className="cal-month">{monthName}</span>
        <button onClick={nextMonth} aria-label="Next month" className="cal-nav">&rarr;</button>
      </div>

      {/* Day names */}
      <div className="cal-grid cal-days">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="cal-day-name">{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {/* Empty cells for offset */}
        {Array.from({ length: monthData.firstDay }).map((_, i) => (
          <span key={`empty-${i}`} className="cal-cell cal-empty" />
        ))}

        {monthData.days.map(({ day, dateStr, events, isToday, isCurrent }) => (
          <a
            key={day}
            href={`/reading/${dateStr}`}
            className={`cal-cell ${isToday ? 'cal-today' : ''} ${isCurrent ? 'cal-current' : ''} ${events.length > 0 ? 'cal-has-events' : ''}`}
          >
            <span className="cal-num">{day}</span>
            {events.length > 0 && (
              <span className="cal-dots">
                {events.slice(0, 3).map((e, i) => (
                  <span
                    key={i}
                    className="cal-dot"
                    style={{ backgroundColor: e.color }}
                    title={e.name}
                  />
                ))}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot" style={{ backgroundColor: '#fbbf24' }} /> Moon Phase</span>
        <span className="cal-legend-item"><span className="cal-dot" style={{ backgroundColor: '#ef4444' }} /> Retrograde</span>
        <span className="cal-legend-item"><span className="cal-dot" style={{ backgroundColor: '#d4a854' }} /> Aspect</span>
      </div>

      <style>{`
        .cosmic-calendar {
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 12px;
          padding: 1.25rem;
          font-family: 'Inter', sans-serif;
        }
        .cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .cal-month {
          font-size: 0.95rem;
          font-weight: 600;
          color: #f0e8d8;
          letter-spacing: 0.02em;
        }
        .cal-nav {
          background: none;
          border: none;
          color: rgba(212, 168, 84, 0.6);
          font-size: 1.1rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          transition: color 0.2s;
        }
        .cal-nav:hover { color: #d4a854; }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .cal-days { margin-bottom: 0.25rem; }
        .cal-day-name {
          text-align: center;
          font-size: 0.65rem;
          color: rgba(240, 232, 216, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0;
        }
        .cal-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.2s;
          position: relative;
          gap: 2px;
        }
        .cal-cell:hover { background: rgba(212, 168, 84, 0.08); }
        .cal-empty { pointer-events: none; }
        .cal-num {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.6);
          line-height: 1;
        }
        .cal-today { background: rgba(212, 168, 84, 0.12); }
        .cal-today .cal-num { color: #d4a854; font-weight: 700; }
        .cal-current {
          outline: 2px solid rgba(212, 168, 84, 0.5);
          outline-offset: -2px;
        }
        .cal-dots {
          display: flex;
          gap: 2px;
          height: 4px;
        }
        .cal-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .cal-legend {
          display: flex;
          gap: 1rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(212, 168, 84, 0.08);
          flex-wrap: wrap;
        }
        .cal-legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.65rem;
          color: rgba(240, 232, 216, 0.4);
        }
      `}</style>
    </div>
  );
}
