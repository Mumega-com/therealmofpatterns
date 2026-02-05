import type { ForecastState } from '../stores/forecast';

export interface HistoryRecord {
  date: string;
  kappa: number;
  stage: string;
  muLevel: number;
  failureMode: string;
}

const STORAGE_KEY = 'rop_history';

export function saveHistory(forecast: ForecastState) {
  if (typeof window === 'undefined') return;

  const history = getHistory();
  
  // Create record
  const record: HistoryRecord = {
    date: forecast.date,
    kappa: forecast.kappa,
    stage: forecast.stage,
    muLevel: forecast.muLevel,
    failureMode: forecast.failureMode
  };

  // Update or add
  const index = history.findIndex(h => h.date === forecast.date);
  if (index >= 0) {
    history[index] = record;
  } else {
    history.push(record);
  }

  // Sort by date descending
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit to 365 days
  if (history.length > 365) {
    history.length = 365;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  // Notify components that history has changed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('history-updated'));
  }
}

export function getHistory(): HistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getAverageKappa(days = 7): number {
  const history = getHistory();
  if (history.length === 0) return 0;
  
  const recent = history.slice(0, days);
  return recent.reduce((sum, h) => sum + h.kappa, 0) / recent.length;
}

export function getTrend(days = 7): 'rising' | 'falling' | 'stable' {
  const history = getHistory();
  if (history.length < 2) return 'stable';

  const recent = history.slice(0, days);
  // Simple linear regression slope or just start vs end
  // Let's use average of first half vs second half of the period
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid); // More recent
  const secondHalf = recent.slice(mid);   // Older

  const avg1 = firstHalf.reduce((s, h) => s + h.kappa, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((s, h) => s + h.kappa, 0) / secondHalf.length;

  if (avg1 > avg2 + 0.05) return 'rising';
  if (avg1 < avg2 - 0.05) return 'falling';
  return 'stable';
}

export function getStreak(): number {
  const history = getHistory();
  if (history.length === 0) return 0;

  // History is sorted descending by date
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const lastCheckin = history[0].date;
  
  // If streak is broken (last checkin older than yesterday)
  if (lastCheckin !== today && lastCheckin !== yesterday) {
    return 0;
  }

  let streak = 0;
  let expectedDate = new Date(lastCheckin);
  
  for (const record of history) {
    const recordDate = record.date;
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    if (recordDate === expectedDateStr) {
      streak++;
      // Move expected date back one day
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
