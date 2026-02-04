'use client';

import { useState, useEffect } from 'react';

/**
 * SyncPrompt - Encourages users to enable sync after first check-in
 *
 * Only shows once per user, after first check-in
 */
export function SyncPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check conditions
    const hasSeen = localStorage.getItem('rop_seen_sync_prompt');
    const hasSyncEnabled = localStorage.getItem('rop_user_data');

    if (hasSeen || hasSyncEnabled) return;

    // Check if just did first check-in
    const history = localStorage.getItem('rop_checkin_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (parsed.entries?.length >= 1) {
          // Show after mode discovery (delay more)
          setTimeout(() => setIsVisible(true), 2000);
        }
      } catch {}
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('rop_seen_sync_prompt', 'true');
    setIsDismissed(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleGoToSettings = () => {
    localStorage.setItem('rop_seen_sync_prompt', 'true');
    window.location.href = '/settings';
  };

  if (!isVisible) return null;

  return (
    <div className={`sync-prompt ${isDismissed ? 'dismissed' : ''}`}>
      <div className="prompt-card">
        <div className="prompt-icon">💾</div>
        <div className="prompt-content">
          <h4>Keep your progress safe</h4>
          <p>Enable sync to access your patterns on any device</p>
        </div>
        <div className="prompt-actions">
          <button className="btn-secondary" onClick={handleDismiss}>
            Later
          </button>
          <button className="btn-primary" onClick={handleGoToSettings}>
            Enable
          </button>
        </div>
      </div>

      <style>{`
        .sync-prompt {
          margin: 1rem 0;
          animation: slide-up 0.5s ease-out;
        }

        .sync-prompt.dismissed {
          animation: slide-down 0.3s ease-out forwards;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          to {
            opacity: 0;
            transform: translateY(10px);
          }
        }

        .prompt-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(34, 197, 94, 0.05);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 12px;
        }

        .prompt-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .prompt-content {
          flex: 1;
          min-width: 0;
        }

        .prompt-content h4 {
          font-size: 0.95rem;
          font-weight: 500;
          color: #f0e8d8;
          margin: 0 0 0.25rem;
        }

        .prompt-content p {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.6);
          margin: 0;
        }

        .prompt-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .btn-secondary,
        .btn-primary {
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(240, 232, 216, 0.2);
          color: rgba(240, 232, 216, 0.6);
        }

        .btn-secondary:hover {
          border-color: rgba(240, 232, 216, 0.4);
          color: rgba(240, 232, 216, 0.8);
        }

        .btn-primary {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .btn-primary:hover {
          background: rgba(34, 197, 94, 0.3);
        }

        @media (max-width: 480px) {
          .prompt-card {
            flex-wrap: wrap;
          }

          .prompt-content {
            width: calc(100% - 3rem);
          }

          .prompt-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
