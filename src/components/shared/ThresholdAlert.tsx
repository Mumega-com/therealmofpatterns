'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertType =
  | 'low-kappa'         // Field coherence dropped below threshold
  | 'high-kappa'        // Field coherence above optimal
  | 'dimension-spike'   // Sudden dimensional change
  | 'dimension-drop'    // Sudden dimensional drop
  | 'optimal-window'    // Optimal action window opening
  | 'failure-warning'   // Approaching failure mode
  | 'streak-break'      // About to break check-in streak
  | 'transit-peak';     // Major transit peak approaching

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  dimension?: string;
  value?: number;
  threshold?: number;
  timestamp: string;
  read: boolean;
}

const ALERT_CONFIG: Record<AlertType, {
  icon: string;
  title: { kasra: string; river: string; sol: string };
  description: (alert: Alert) => { kasra: string; river: string; sol: string };
}> = {
  'low-kappa': {
    icon: '⚠',
    title: {
      kasra: 'LOW_COHERENCE_ALERT',
      river: 'Field Disturbance',
      sol: 'Low Energy Warning',
    },
    description: (alert) => ({
      kasra: `κ = ${alert.value?.toFixed(2)} below threshold ${alert.threshold}. Recommend reduced operations.`,
      river: `Your field coherence has dropped. This is a time for rest and reflection, not action.`,
      sol: `Your energy is pretty low right now. Maybe take it easy and avoid big decisions.`,
    }),
  },
  'high-kappa': {
    icon: '✧',
    title: {
      kasra: 'HIGH_COHERENCE_DETECTED',
      river: 'Field Alignment',
      sol: 'Great Energy!',
    },
    description: (alert) => ({
      kasra: `κ = ${alert.value?.toFixed(2)} exceeds optimal threshold. Favorable conditions for operations.`,
      river: `Your field is beautifully aligned. This is a moment of grace — use it wisely.`,
      sol: `You're in great flow right now! Good time for important stuff.`,
    }),
  },
  'dimension-spike': {
    icon: '↑',
    title: {
      kasra: 'DIMENSION_SPIKE',
      river: 'Energy Rising',
      sol: 'Dimension Boost',
    },
    description: (alert) => ({
      kasra: `${alert.dimension} dimension spiked ${alert.value}% above baseline.`,
      river: `Your ${alert.dimension} dimension is awakening strongly. Pay attention to what this calls forth.`,
      sol: `Your ${alert.dimension} energy just shot up! Channel it toward something meaningful.`,
    }),
  },
  'dimension-drop': {
    icon: '↓',
    title: {
      kasra: 'DIMENSION_DROP',
      river: 'Energy Falling',
      sol: 'Dimension Dip',
    },
    description: (alert) => ({
      kasra: `${alert.dimension} dimension dropped ${alert.value}% below baseline.`,
      river: `Your ${alert.dimension} dimension is withdrawing. Honor this quieting.`,
      sol: `Your ${alert.dimension} energy dropped. You might feel less driven in that area.`,
    }),
  },
  'optimal-window': {
    icon: '◉',
    title: {
      kasra: 'OPTIMAL_WINDOW_OPEN',
      river: 'Sacred Window',
      sol: 'Best Time Alert',
    },
    description: (alert) => ({
      kasra: `High-coherence window opening in ${alert.dimension}. Duration: estimated 2-4 hours.`,
      river: `A window of possibility opens for ${alert.dimension}. The cosmos favors action now.`,
      sol: `Good time for ${alert.dimension} coming up! Next few hours look great for it.`,
    }),
  },
  'failure-warning': {
    icon: '⚡',
    title: {
      kasra: 'FAILURE_MODE_APPROACHING',
      river: 'Storm Warning',
      sol: 'Heads Up',
    },
    description: (alert) => ({
      kasra: `Predictive analysis indicates potential ${alert.dimension} failure mode in 24-48 hours.`,
      river: `Challenging conditions approach for your ${alert.dimension} dimension. Prepare yourself.`,
      sol: `Your ${alert.dimension} might get challenging in the next day or two. Plan accordingly.`,
    }),
  },
  'streak-break': {
    icon: '🔥',
    title: {
      kasra: 'STREAK_WARNING',
      river: 'Practice Reminder',
      sol: 'Don\'t Break Your Streak!',
    },
    description: (alert) => ({
      kasra: `Check-in streak at risk. ${alert.value} days remaining to maintain continuity.`,
      river: `Your daily practice calls. The ritual awaits completion.`,
      sol: `You're on a ${alert.threshold}-day streak! Check in to keep it going.`,
    }),
  },
  'transit-peak': {
    icon: '☆',
    title: {
      kasra: 'TRANSIT_PEAK_IMMINENT',
      river: 'Cosmic Alignment',
      sol: 'Special Day Coming',
    },
    description: (alert) => ({
      kasra: `Major ${alert.dimension} transit peak in ${alert.value} hours. Elevated field sensitivity expected.`,
      river: `A powerful ${alert.dimension} transit approaches. The heavens stir.`,
      sol: `Something big in your ${alert.dimension} is happening soon. Pay attention!`,
    }),
  },
};

// Local storage helpers
function getAlerts(): Alert[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem('rop_alerts');
  return stored ? JSON.parse(stored) : [];
}

function saveAlerts(alerts: Alert[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('rop_alerts', JSON.stringify(alerts));
}

// Create a new alert
export function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  options?: { dimension?: string; value?: number; threshold?: number }
): string {
  const alerts = getAlerts();
  const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newAlert: Alert = {
    id,
    type,
    severity,
    dimension: options?.dimension,
    value: options?.value,
    threshold: options?.threshold,
    timestamp: new Date().toISOString(),
    read: false,
  };

  alerts.unshift(newAlert);

  // Keep only last 50 alerts
  if (alerts.length > 50) {
    alerts.length = 50;
  }

  saveAlerts(alerts);
  return id;
}

// Mark alert as read
export function markAlertRead(id: string) {
  const alerts = getAlerts();
  const index = alerts.findIndex(a => a.id === id);
  if (index !== -1) {
    alerts[index].read = true;
    saveAlerts(alerts);
  }
}

// Clear all alerts
export function clearAlerts() {
  saveAlerts([]);
}

// Alert bell indicator
interface AlertBellProps {
  onClick?: () => void;
  className?: string;
}

export function AlertBell({ onClick, className = '' }: AlertBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const alerts = getAlerts();
    setUnreadCount(alerts.filter(a => !a.read).length);
  }, []);

  return (
    <button className={`alert-bell ${className}`} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="alert-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}

      <style>{`
        .alert-bell {
          position: relative;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: rgba(240, 232, 216, 0.6);
          transition: color 0.2s;
        }
        .alert-bell:hover {
          color: #d4a854;
        }
        .alert-bell svg {
          width: 100%;
          height: 100%;
        }
        .alert-count {
          position: absolute;
          top: 4px;
          right: 4px;
          min-width: 18px;
          height: 18px;
          background: #ef4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
      `}</style>
    </button>
  );
}

// Alert list panel
interface AlertPanelProps {
  onClose?: () => void;
  className?: string;
}

export function AlertPanel({ onClose, className = '' }: AlertPanelProps) {
  const mode = useStore($mode);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    setAlerts(getAlerts());
  }, []);

  const handleMarkRead = (id: string) => {
    markAlertRead(id);
    setAlerts(getAlerts());
  };

  const handleClearAll = () => {
    clearAlerts();
    setAlerts([]);
  };

  const severityColors = {
    info: '#3b82f6',
    warning: '#d4a854',
    critical: '#ef4444',
  };

  return (
    <div className={`alert-panel ${className}`}>
      <div className="panel-header">
        <h3>
          {mode === 'kasra' ? 'ALERTS' : mode === 'river' ? 'Whispers' : 'Alerts'}
        </h3>
        <div className="header-actions">
          {alerts.length > 0 && (
            <button onClick={handleClearAll} className="clear-btn">
              {mode === 'kasra' ? 'CLEAR_ALL' : 'Clear All'}
            </button>
          )}
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
      </div>

      <div className="panel-content">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">◎</span>
            <p>
              {mode === 'kasra'
                ? 'NO_ACTIVE_ALERTS'
                : mode === 'river'
                ? 'All is quiet in the field'
                : 'No alerts right now'}
            </p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => {
              const config = ALERT_CONFIG[alert.type];
              const desc = config.description(alert);
              return (
                <div
                  key={alert.id}
                  className={`alert-item ${alert.read ? 'read' : ''}`}
                  onClick={() => handleMarkRead(alert.id)}
                  style={{ borderLeftColor: severityColors[alert.severity] }}
                >
                  <div className="alert-icon">{config.icon}</div>
                  <div className="alert-content">
                    <h4>{config.title[mode]}</h4>
                    <p>{desc[mode]}</p>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {!alert.read && <span className="unread-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .alert-panel {
          position: fixed;
          top: 60px;
          right: 16px;
          width: 360px;
          max-height: calc(100vh - 80px);
          background: #141210;
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          z-index: 100;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 480px) {
          .alert-panel {
            left: 16px;
            right: 16px;
            width: auto;
          }
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid rgba(212, 168, 84, 0.1);
        }
        .panel-header h3 {
          font-size: 1rem;
          color: #d4a854;
          font-weight: 500;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .clear-btn {
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid rgba(212, 168, 84, 0.3);
          color: rgba(240, 232, 216, 0.6);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-btn:hover {
          border-color: #d4a854;
          color: #d4a854;
        }
        .close-btn {
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          color: rgba(240, 232, 216, 0.5);
          font-size: 1.25rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .close-btn:hover {
          color: #f0e8d8;
        }
        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          text-align: center;
        }
        .empty-icon {
          font-size: 2rem;
          color: rgba(212, 168, 84, 0.3);
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.4);
        }
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .alert-item {
          position: relative;
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem;
          background: rgba(212, 168, 84, 0.05);
          border-left: 3px solid;
          cursor: pointer;
          transition: background 0.2s;
        }
        .alert-item:hover {
          background: rgba(212, 168, 84, 0.08);
        }
        .alert-item.read {
          opacity: 0.6;
        }
        .alert-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .alert-content {
          flex: 1;
          min-width: 0;
        }
        .alert-content h4 {
          font-size: 0.9rem;
          color: #f0e8d8;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .alert-content p {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }
        .alert-time {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.4);
        }
        .unread-dot {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 8px;
          height: 8px;
          background: #d4a854;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

// Hook for managing alerts
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = () => setAlerts(getAlerts());

  useEffect(() => {
    refresh();
  }, []);

  const create = (
    type: AlertType,
    severity: AlertSeverity,
    options?: { dimension?: string; value?: number; threshold?: number }
  ) => {
    const id = createAlert(type, severity, options);
    refresh();
    return id;
  };

  const unreadCount = alerts.filter(a => !a.read).length;

  return {
    alerts,
    unreadCount,
    isOpen,
    setIsOpen,
    create,
    refresh,
    markRead: (id: string) => {
      markAlertRead(id);
      refresh();
    },
    clear: () => {
      clearAlerts();
      refresh();
    },
  };
}
