'use client';

import { useState, useEffect } from 'react';
import { getStreak } from '../../lib/history';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface StreakBadgeProps {
  className?: string;
}

export function StreakBadge({ className = '' }: StreakBadgeProps) {
  const mode = useStore($mode);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Check streak on mount
    setStreak(getStreak());
    
    // Listen for storage changes (in case checkin happens in another tab/component)
    const handleStorage = () => setStreak(getStreak());
    window.addEventListener('storage', handleStorage);
    // Custom event for same-tab updates
    window.addEventListener('history-updated', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('history-updated', handleStorage);
    };
  }, []);

  if (streak === 0) return null;

  // Visual variants based on streak length
  const intensity = Math.min(streak, 21) / 21; // 0 to 1
  
  const riverMessages = [
    '',
    'Day of Flow',
    'Days of Flow',
    'Days of Deepening',
    'Days of Mastery'
  ];
  
  const riverMsg = streak === 1 ? 'Day of Flow' : 
                   streak < 7 ? 'Days of Flow' :
                   streak < 21 ? 'Days of Deepening' : 'Days of Mastery';

  return (
    <div 
      className={`streak-container group ${className}`}
      title={`${streak} day streak`}
    >
      <div className={`streak-badge ${mode}`}>
        <div className="streak-flame-wrapper">
          <span className="streak-flame" style={{ opacity: 0.5 + intensity * 0.5 }}>
            {mode === 'kasra' ? '◈' : mode === 'river' ? '✧' : '🔥'}
          </span>
          {streak >= 3 && (
            <div className="streak-glow" style={{ opacity: intensity }}></div>
          )}
        </div>
        <span className="streak-count">{streak}</span>
      </div>
      
      {/* Tooltip */}
      <div className="streak-tooltip">
        <div className="tooltip-content">
          <div className="font-bold">
             {mode === 'kasra' ? `${streak}_DAY_SEQUENCE` : 
              mode === 'river' ? `${streak} ${riverMsg}` : 
              `${streak} Day Streak`}
          </div>
          {streak >= 3 && (
            <div className="text-xs opacity-70 mt-1">
              {mode === 'kasra' ? 'CONSISTENCY_OPTIMAL' : 
               mode === 'river' ? 'The current grows stronger.' : 
               'Keep it up!'}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .streak-container {
          position: relative;
          display: inline-block;
          cursor: help;
        }

        .streak-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.6rem;
          border-radius: 99px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .streak-badge.kasra {
          background: rgba(34, 211, 238, 0.1);
          color: #22d3ee;
          border: 1px solid rgba(34, 211, 238, 0.2);
          font-family: 'Geist Mono', monospace;
        }

        .streak-badge.river {
          background: rgba(212, 168, 84, 0.1);
          color: #d4a854;
          border: 1px solid rgba(212, 168, 84, 0.2);
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
        }

        .streak-badge.sol {
          background: rgba(251, 191, 36, 0.15);
          color: #b45309;
          border: 1px solid rgba(251, 191, 36, 0.3);
          font-family: 'Inter', sans-serif;
        }

        /* Flame animation */
        .streak-flame-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .streak-flame {
          position: relative;
          z-index: 2;
        }

        .streak-glow {
          position: absolute;
          width: 150%;
          height: 150%;
          background: radial-gradient(circle, currentColor 0%, transparent 70%);
          filter: blur(4px);
          animation: pulse-glow 2s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(0.8); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }

        /* Tooltip */
        .streak-tooltip {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(10px);
          background: #1a1812;
          border: 1px solid rgba(212, 168, 84, 0.3);
          padding: 0.75rem;
          border-radius: 8px;
          width: max-content;
          max-width: 200px;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          z-index: 50;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .group:hover .streak-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(5px);
        }
        
        .streak-badge.river .streak-tooltip {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}

export default StreakBadge;
