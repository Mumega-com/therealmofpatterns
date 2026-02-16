'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { getJourneyState } from '../../lib/journey-engine';

interface UnlockGateProps {
  requiredStage: number;       // Stage number needed to see content (1-8)
  teaser?: string;             // Custom teaser text when locked
  children: ReactNode;
  showProgress?: boolean;      // Show "X more check-ins to unlock"
}

export function UnlockGate({ requiredStage, teaser, children, showProgress = true }: UnlockGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [milestone, setMilestone] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const state = getJourneyState();
    setUnlocked(state.stageNumber >= requiredStage);
    setMilestone(state.nextMilestone);
    setChecked(true);
  }, [requiredStage]);

  // Don't render anything until we've checked (prevents flash)
  if (!checked) return null;

  if (unlocked) {
    return <div className="unlock-gate-revealed">{children}</div>;
  }

  const defaultTeasers: Record<number, string> = {
    1: 'Enter your birthday to begin',
    2: 'View your first forecast to continue',
    3: 'Choose your guide',
    4: 'Complete your first check-in to unlock',
    5: 'Keep checking in to unlock',
    6: 'Your shadow will reveal itself soon',
    7: 'Recognition unlocks this stage',
    8: 'Integration awaits',
  };

  const displayTeaser = teaser || defaultTeasers[requiredStage] || 'Keep going to unlock';

  return (
    <div className="unlock-gate-locked">
      <div className="unlock-gate-blur">
        <div className="unlock-gate-placeholder" />
      </div>
      <div className="unlock-gate-overlay">
        <span className="unlock-gate-lock">◈</span>
        <p className="unlock-gate-teaser">{displayTeaser}</p>
        {showProgress && milestone && (
          <p className="unlock-gate-progress">{milestone}</p>
        )}
      </div>

      <style>{`
        .unlock-gate-revealed {
          animation: ug-reveal 0.6s ease-out;
        }

        @keyframes ug-reveal {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .unlock-gate-locked {
          position: relative;
          min-height: 120px;
          border-radius: 12px;
          overflow: hidden;
        }

        .unlock-gate-blur {
          filter: blur(8px);
          opacity: 0.15;
          pointer-events: none;
        }

        .unlock-gate-placeholder {
          height: 120px;
          background: linear-gradient(
            135deg,
            rgba(212, 168, 84, 0.05),
            rgba(167, 139, 250, 0.03)
          );
          border-radius: 12px;
        }

        .unlock-gate-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: rgba(10, 9, 8, 0.5);
          border: 1px solid rgba(212, 168, 84, 0.08);
          border-radius: 12px;
        }

        .unlock-gate-lock {
          font-size: 1.5rem;
          color: rgba(212, 168, 84, 0.3);
        }

        .unlock-gate-teaser {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
          text-align: center;
          margin: 0;
          padding: 0 1rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
        }

        .unlock-gate-progress {
          font-size: 0.75rem;
          color: rgba(212, 168, 84, 0.4);
          text-align: center;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
