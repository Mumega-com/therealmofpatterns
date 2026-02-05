'use client';

import { useState, useEffect } from 'react';
import { getHistory, getTrend, type HistoryRecord } from '../../lib/history';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface HistoryDashboardProps {
  className?: string;
  limit?: number;
}

export function HistoryDashboard({ className = '', limit = 14 }: HistoryDashboardProps) {
  const mode = useStore($mode);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [trend, setTrend] = useState<'rising' | 'falling' | 'stable'>('stable');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getHistory();
    setHistory(data);
    setTrend(getTrend(7));
    setLoading(false);
  }, []);

  if (loading) return <div className="p-4 text-center opacity-50">Loading history...</div>;

  if (history.length === 0) {
    return (
      <div className={`history-empty p-8 text-center border rounded-lg ${className} ${mode === 'river' ? 'border-river-border' : 'border-gray-800'}`}>
        <p className="opacity-70 mb-2">No history yet.</p>
        <p className="text-sm opacity-50">Complete your daily check-in to build your pattern.</p>
      </div>
    );
  }

  const displayHistory = history.slice(0, limit).reverse(); // Oldest to newest for chart

  // Calculate chart dimensions
  const height = 150;
  
  return (
    <div className={`history-dashboard ${className}`}>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className={`text-lg font-semibold mb-1 ${
            mode === 'river' ? 'text-river-accent font-river' : 
            mode === 'kasra' ? 'text-kasra-accent font-mono' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {mode === 'river' ? 'Pattern Flow' : mode === 'kasra' ? 'KAPPA_HISTORY' : 'Energy Trend'}
          </h3>
          <p className="text-sm opacity-60">
            Last {displayHistory.length} entries &bull; <span className={
              trend === 'rising' ? 'text-green-500' : 
              trend === 'falling' ? 'text-red-500' : 'text-gray-500'
            }>{trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Stable'}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
             {history.length}
          </div>
          <div className="text-xs opacity-50 uppercase tracking-wide">Days Tracked</div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="chart-container relative h-[150px] flex items-end justify-between gap-1 w-full">
        {/* Y-Axis Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          <div className="border-t border-current w-full"></div>
          <div className="border-t border-current w-full"></div>
          <div className="border-t border-current w-full"></div>
        </div>

        {displayHistory.map((day, i) => (
          <div key={day.date} className="flex-1 flex flex-col items-center group relative min-w-[4px]">
            {/* Bar */}
            <div 
              className={`w-full max-w-[20px] rounded-t transition-all duration-500 hover:opacity-80 ${
                mode === 'river' ? 'bg-river-accent' : 
                mode === 'kasra' ? 'bg-kasra-accent' : 'bg-sol-accent'
              }`}
              style={{ 
                height: `${day.kappa * 100}%`,
                opacity: 0.5 + (day.kappa * 0.5) 
              }}
            ></div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 p-2 rounded bg-black/90 text-white text-xs whitespace-nowrap border border-white/10 pointer-events-none">
              <div className="font-bold">{day.date}</div>
              <div>κ: {(day.kappa * 100).toFixed(0)}%</div>
              <div className="capitalize">{day.stage}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* X-Axis Labels */}
      <div className="flex justify-between mt-2 text-xs opacity-40">
        <span>{displayHistory[0]?.date.slice(5)}</span>
        <span>{displayHistory[displayHistory.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default HistoryDashboard;
