'use client';

import { useState, useEffect } from 'react';
import { setMode, type Mode } from '../../stores';

const MODES: { id: Mode; icon: string; name: string; vibe: string; color: string }[] = [
  {
    id: 'kasra',
    icon: '⌘',
    name: 'Kasra',
    vibe: 'Technical precision',
    color: '#22d3ee',
  },
  {
    id: 'river',
    icon: '◈',
    name: 'River',
    vibe: 'Mystical depth',
    color: '#a78bfa',
  },
  {
    id: 'sol',
    icon: '☀',
    name: 'Sol',
    vibe: 'Warm & friendly',
    color: '#fbbf24',
  },
];

/**
 * ModeDiscovery - Shows after first check-in to introduce voice modes
 *
 * Only shows once per user (tracks in localStorage)
 */
export function ModeDiscovery() {
  // River and Kasra modes hidden — Sol only for now
  return null;

  const [isVisible, setIsVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  useEffect(() => {
    // Only show if:
    // 1. User just did their first check-in (streak = 1)
    // 2. Haven't seen mode discovery before
    const hasSeen = localStorage.getItem('rop_seen_mode_discovery');
    if (hasSeen) return;

    const history = localStorage.getItem('rop_checkin_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        // Show only after first check-in
        if (parsed.entries?.length === 1) {
          setTimeout(() => setIsVisible(true), 500);
        }
      } catch {}
    }
  }, []);

  const handleSelectMode = (mode: Mode) => {
    setSelectedMode(mode);
    setMode(mode);

    // Mark as seen and dismiss after a moment
    localStorage.setItem('rop_seen_mode_discovery', 'true');
    setTimeout(() => setIsVisible(false), 1500);
  };

  const handleDismiss = () => {
    localStorage.setItem('rop_seen_mode_discovery', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mode-discovery">
      <div className="discovery-card">
        <button className="dismiss-btn" onClick={handleDismiss}>×</button>

        <div className="discovery-header">
          <span className="header-icon">✨</span>
          <h3>Nice! Here's a secret...</h3>
        </div>

        <p className="discovery-text">
          You can experience your reading in different voices.
          Each one offers a unique perspective on your patterns.
        </p>

        <div className="mode-cards">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
              onClick={() => handleSelectMode(mode.id)}
              style={{ '--mode-color': mode.color } as React.CSSProperties}
            >
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-name">{mode.name}</span>
              <span className="mode-vibe">{mode.vibe}</span>
              {selectedMode === mode.id && (
                <span className="check">✓</span>
              )}
            </button>
          ))}
        </div>

        <p className="hint-text">
          Press K, R, or S anytime to switch
        </p>
      </div>

      <style>{`
        .mode-discovery {
          margin: 1.5rem 0;
          animation: slide-up 0.5s ease-out;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .discovery-card {
          position: relative;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .dismiss-btn {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          width: 28px;
          height: 28px;
          background: rgba(240, 232, 216, 0.1);
          border: none;
          border-radius: 50%;
          color: rgba(240, 232, 216, 0.5);
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .dismiss-btn:hover {
          background: rgba(240, 232, 216, 0.2);
          color: rgba(240, 232, 216, 0.8);
        }

        .discovery-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .header-icon {
          font-size: 1.25rem;
        }

        .discovery-header h3 {
          font-size: 1.1rem;
          font-weight: 500;
          color: #f0e8d8;
          margin: 0;
        }

        .discovery-text {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }

        .mode-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .mode-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 1rem 0.5rem;
          background: rgba(10, 9, 8, 0.4);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-card:hover {
          border-color: var(--mode-color);
          background: rgba(212, 168, 84, 0.05);
        }

        .mode-card.selected {
          border-color: var(--mode-color);
          background: rgba(212, 168, 84, 0.1);
        }

        .mode-icon {
          font-size: 1.5rem;
          transition: color 0.2s;
        }

        .mode-card:hover .mode-icon,
        .mode-card.selected .mode-icon {
          color: var(--mode-color);
        }

        .mode-name {
          font-size: 0.9rem;
          font-weight: 500;
          color: #f0e8d8;
        }

        .mode-vibe {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.5);
        }

        .check {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          font-size: 0.8rem;
          color: var(--mode-color);
        }

        .hint-text {
          text-align: center;
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
          margin: 0;
        }

        @media (max-width: 400px) {
          .mode-cards {
            grid-template-columns: 1fr;
          }

          .mode-card {
            flex-direction: row;
            justify-content: flex-start;
            gap: 1rem;
            padding: 0.75rem 1rem;
          }

          .mode-vibe {
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
}
