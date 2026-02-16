'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

type TriggerContext =
  | 'after-checkin'      // After completing a free check-in
  | 'shadow-locked'      // Trying to access shadow octave
  | 'history-limited'    // Viewing limited history
  | 'optimal-windows'    // Optimal windows feature
  | 'failure-warnings'   // Failure mode warnings
  | 'export-blocked'     // Trying to export data
  | 'streak-milestone'   // After 7, 14, 30 day streaks
  | 'high-resonance';    // When finding a high resonance match

interface UpgradeTriggerProps {
  context: TriggerContext;
  onDismiss?: () => void;
  variant?: 'inline' | 'modal' | 'banner';
  className?: string;
}

const TRIGGER_CONTENT: Record<TriggerContext, Record<string, {
  title: string;
  description: string;
  benefit: string;
  cta: string;
}>> = {
  'after-checkin': {
    kasra: {
      title: 'SHADOW_OCTAVE_AVAILABLE',
      description: 'Your 8D scan is complete. Pro members unlock the full 16D analysis including the shadow octave.',
      benefit: 'See the complete picture. Predict failure modes before they manifest.',
      cta: 'UPGRADE_TO_16D',
    },
    river: {
      title: 'The Deeper Pattern Awaits',
      description: 'You have glimpsed the surface. The shadow octave reveals what lies beneath.',
      benefit: 'Know your hidden strengths. Understand your sacred wounds.',
      cta: 'Reveal the Shadow',
    },
    sol: {
      title: 'Want to go deeper?',
      description: 'Your basic reading is done! Pro shows you twice the insight with the full 16 dimensions.',
      benefit: 'See patterns you might be missing. Get alerts before tough days.',
      cta: 'See Full Reading',
    },
  },
  'shadow-locked': {
    kasra: {
      title: 'SHADOW_OCTAVE_RESTRICTED',
      description: 'The shadow octave (dimensions 9-16) requires Pro access.',
      benefit: 'Shadow dimensions reveal failure modes and blind spots in your field.',
      cta: 'UNLOCK_ACCESS',
    },
    river: {
      title: 'The Shadow Awaits Your Readiness',
      description: 'The deeper half of your pattern is veiled. Only those who commit to the practice may see.',
      benefit: 'Integrate your shadow. Transform what is hidden into wisdom.',
      cta: 'Enter the Depths',
    },
    sol: {
      title: 'This is a Pro Feature',
      description: 'The shadow dimensions show the other half of your pattern.',
      benefit: 'Understanding your shadow = understanding yourself better.',
      cta: 'Unlock Now',
    },
  },
  'history-limited': {
    kasra: {
      title: 'HISTORY_BUFFER_EXCEEDED',
      description: 'Free tier retains 7 days. Pro members access unlimited historical data.',
      benefit: 'Long-term pattern recognition requires historical context for accurate trend analysis.',
      cta: 'EXPAND_BUFFER',
    },
    river: {
      title: 'Memory Has Its Limits',
      description: 'The free path shows you a week. Pro members remember everything.',
      benefit: 'Watch your evolution across seasons. See how far you have journeyed.',
      cta: 'Remember Everything',
    },
    sol: {
      title: 'Need more history?',
      description: 'Free users see 7 days. Pro gets unlimited history to track long-term patterns.',
      benefit: 'See what really works for you over months, not just days.',
      cta: 'Get Full History',
    },
  },
  'optimal-windows': {
    kasra: {
      title: 'OPTIMAL_WINDOWS_PREMIUM',
      description: 'Hourly coherence forecasting requires Pro credentials.',
      benefit: 'Schedule critical operations during high-κ windows for maximum field alignment.',
      cta: 'ENABLE_FORECASTING',
    },
    river: {
      title: 'Sacred Timing Awaits',
      description: 'When to act, when to rest, when to create. Pro members know.',
      benefit: 'Flow with the cosmic rhythm. Let timing work for you, not against you.',
      cta: 'Know Your Windows',
    },
    sol: {
      title: 'Find your best hours',
      description: 'Pro shows you exactly when you\'ll have the most energy each day.',
      benefit: 'Schedule important stuff when you\'re at your best. Simple!',
      cta: 'Get Best Times',
    },
  },
  'failure-warnings': {
    kasra: {
      title: 'FAILURE_MODE_ALERTS_DISABLED',
      description: 'Predictive failure mode detection requires Pro access.',
      benefit: 'Receive alerts 24-48 hours before low-coherence periods.',
      cta: 'ENABLE_ALERTS',
    },
    river: {
      title: 'Forewarned is Forearmed',
      description: 'Pro members receive whispers of coming storms.',
      benefit: 'Prepare for challenging days. Transform difficulty into growth.',
      cta: 'Receive Warnings',
    },
    sol: {
      title: 'Heads up for tough days',
      description: 'Pro warns you 1-2 days before your energy dips.',
      benefit: 'Plan easier tasks for hard days. Avoid scheduling big things then.',
      cta: 'Get Warnings',
    },
  },
  'export-blocked': {
    kasra: {
      title: 'EXPORT_RESTRICTED',
      description: 'Data export functionality requires Pro access.',
      benefit: 'Export your pattern data in JSON, CSV, or PDF format for external analysis.',
      cta: 'ENABLE_EXPORT',
    },
    river: {
      title: 'Carry Your Patterns With You',
      description: 'Pro members may take their data anywhere.',
      benefit: 'Your patterns are yours. Export them. Study them. Share them.',
      cta: 'Unlock Export',
    },
    sol: {
      title: 'Want to download your data?',
      description: 'Pro lets you export your pattern history as a file.',
      benefit: 'Keep your data, share with coaches, or use in other apps.',
      cta: 'Enable Export',
    },
  },
  'streak-milestone': {
    kasra: {
      title: 'STREAK_ACHIEVEMENT_DETECTED',
      description: 'Consistent practice yields optimal results. Upgrade to maximize your data.',
      benefit: 'Pro members see long-term trends that reveal your true signature.',
      cta: 'COMMIT_TO_PRACTICE',
    },
    river: {
      title: 'Your Dedication Shines',
      description: 'You have proven your commitment. Now unlock the full mysteries.',
      benefit: 'Those who stay the path deserve to see the whole picture.',
      cta: 'Deepen Your Practice',
    },
    sol: {
      title: "You're on a roll!",
      description: "You've been checking in consistently. Ready to see more?",
      benefit: 'Pro users with streaks see powerful long-term insights.',
      cta: 'Level Up',
    },
  },
  'high-resonance': {
    kasra: {
      title: 'HIGH_RESONANCE_MATCH',
      description: 'Your κ > 0.85 resonance qualifies for deep historical profile analysis.',
      benefit: 'Pro members access detailed comparison with resonant historical figures.',
      cta: 'ANALYZE_RESONANCE',
    },
    river: {
      title: 'A Soul Recognizes Itself',
      description: 'This resonance is rare. Pro members may explore what it means.',
      benefit: 'Understand the path walked by those who share your pattern.',
      cta: 'Explore the Connection',
    },
    sol: {
      title: 'Strong match found!',
      description: 'Your pattern is really similar to a famous figure. Want to learn more?',
      benefit: 'See what you have in common and what you can learn from them.',
      cta: 'See Full Match',
    },
  },
};

const DISMISS_DELAYS: Record<TriggerContext, number> = {
  'after-checkin': 24 * 60 * 60 * 1000,    // 24 hours
  'shadow-locked': 3 * 60 * 60 * 1000,      // 3 hours
  'history-limited': 24 * 60 * 60 * 1000,   // 24 hours
  'optimal-windows': 12 * 60 * 60 * 1000,   // 12 hours
  'failure-warnings': 12 * 60 * 60 * 1000,  // 12 hours
  'export-blocked': 7 * 24 * 60 * 60 * 1000, // 7 days
  'streak-milestone': 7 * 24 * 60 * 60 * 1000, // 7 days
  'high-resonance': 3 * 60 * 60 * 1000,     // 3 hours
};

export function UpgradeTrigger({
  context,
  onDismiss,
  variant = 'inline',
  className = '',
}: UpgradeTriggerProps) {
  const mode = useStore($mode);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this trigger was recently dismissed
    const dismissKey = `rop_upgrade_dismissed_${context}`;
    const dismissedAt = localStorage.getItem(dismissKey);

    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      const delay = DISMISS_DELAYS[context];
      if (Date.now() - dismissTime < delay) {
        return; // Still in cooldown
      }
    }

    setIsVisible(true);
  }, [context]);

  const handleDismiss = () => {
    const dismissKey = `rop_upgrade_dismissed_${context}`;
    localStorage.setItem(dismissKey, Date.now().toString());
    setIsVisible(false);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    window.location.href = `/subscribe?source=${context}`;
  };

  if (!isVisible) return null;

  const content = TRIGGER_CONTENT[context]?.[mode];
  if (!content) return null;

  if (variant === 'banner') {
    return (
      <div className={`upgrade-banner ${className}`}>
        <div className="banner-content">
          <div className="banner-text">
            <strong>{content.title}</strong>
            <span>{content.benefit}</span>
          </div>
          <div className="banner-actions">
            <button onClick={handleUpgrade} className="banner-cta">
              {content.cta}
            </button>
            <button onClick={handleDismiss} className="banner-dismiss">
              Later
            </button>
          </div>
        </div>
        <style>{`
          .upgrade-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 1rem 2rem;
            background: linear-gradient(90deg, #d4a854 0%, #e5b964 100%);
            color: #0a0908;
            z-index: 40;
            animation: slideUp 0.3s ease-out;
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .banner-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .banner-text {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }
          .banner-text strong {
            font-size: 0.9rem;
          }
          .banner-text span {
            font-size: 0.8rem;
            opacity: 0.8;
          }
          .banner-actions {
            display: flex;
            gap: 0.75rem;
          }
          .banner-cta {
            padding: 0.5rem 1rem;
            background: #0a0908;
            color: #d4a854;
            border: none;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .banner-cta:hover {
            background: #1a1814;
          }
          .banner-dismiss {
            padding: 0.5rem 1rem;
            background: transparent;
            color: #0a0908;
            border: 1px solid rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s;
          }
          .banner-dismiss:hover {
            background: rgba(0,0,0,0.1);
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className={`upgrade-modal-overlay ${className}`}>
        <div className="upgrade-modal">
          <button onClick={handleDismiss} className="modal-close">&times;</button>
          <div className="modal-icon">&#9733;</div>
          <h3 className="modal-title">{content.title}</h3>
          <p className="modal-desc">{content.description}</p>
          <div className="modal-benefit">
            <span className="benefit-icon">&#10003;</span>
            <span>{content.benefit}</span>
          </div>
          <button onClick={handleUpgrade} className="modal-cta">
            {content.cta}
          </button>
          <button onClick={handleDismiss} className="modal-later">
            Maybe later
          </button>
        </div>
        <style>{`
          .upgrade-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(10, 9, 8, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            padding: 1rem;
            animation: fadeIn 0.2s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .upgrade-modal {
            position: relative;
            background: #141210;
            border: 1px solid rgba(212, 168, 84, 0.3);
            padding: 2.5rem 2rem;
            max-width: 400px;
            width: 100%;
            text-align: center;
          }
          .modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: 32px;
            height: 32px;
            background: transparent;
            border: none;
            color: rgba(240, 232, 216, 0.5);
            font-size: 1.5rem;
            cursor: pointer;
            transition: color 0.2s;
          }
          .modal-close:hover {
            color: #f0e8d8;
          }
          .modal-icon {
            font-size: 3rem;
            color: #d4a854;
            margin-bottom: 1rem;
          }
          .modal-title {
            font-size: 1.5rem;
            color: #f0e8d8;
            margin-bottom: 0.75rem;
            font-weight: 400;
          }
          .modal-desc {
            font-size: 0.95rem;
            color: rgba(240, 232, 216, 0.7);
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          .modal-benefit {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 1rem;
            background: rgba(212, 168, 84, 0.1);
            border-left: 3px solid #d4a854;
            text-align: left;
            margin-bottom: 1.5rem;
          }
          .benefit-icon {
            color: #d4a854;
            font-size: 1rem;
          }
          .modal-benefit span:last-child {
            font-size: 0.9rem;
            color: rgba(240, 232, 216, 0.8);
          }
          .modal-cta {
            width: 100%;
            padding: 1rem;
            background: #d4a854;
            color: #0a0908;
            border: none;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 0.75rem;
          }
          .modal-cta:hover {
            background: #e5b964;
            box-shadow: 0 0 20px rgba(212, 168, 84, 0.3);
          }
          .modal-later {
            background: transparent;
            border: none;
            color: rgba(240, 232, 216, 0.5);
            font-size: 0.9rem;
            cursor: pointer;
            transition: color 0.2s;
          }
          .modal-later:hover {
            color: #f0e8d8;
          }
        `}</style>
      </div>
    );
  }

  // Default: inline variant
  return (
    <div className={`upgrade-inline ${className}`}>
      <div className="inline-icon">&#9733;</div>
      <div className="inline-content">
        <h4 className="inline-title">{content.title}</h4>
        <p className="inline-desc">{content.description}</p>
        <p className="inline-benefit">{content.benefit}</p>
      </div>
      <div className="inline-actions">
        <button onClick={handleUpgrade} className="inline-cta">
          {content.cta}
        </button>
        <button onClick={handleDismiss} className="inline-dismiss">
          &times;
        </button>
      </div>
      <style>{`
        .upgrade-inline {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(212, 168, 84, 0.08);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 8px;
        }
        .inline-icon {
          font-size: 1.5rem;
          color: #d4a854;
          flex-shrink: 0;
        }
        .inline-content {
          flex: 1;
          min-width: 0;
        }
        .inline-title {
          font-size: 1rem;
          color: #d4a854;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .inline-desc {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .inline-benefit {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
          font-style: italic;
        }
        .inline-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .inline-cta {
          padding: 0.5rem 1rem;
          background: #d4a854;
          color: #0a0908;
          border: none;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .inline-cta:hover {
          background: #e5b964;
        }
        .inline-dismiss {
          padding: 0.25rem;
          background: transparent;
          border: none;
          color: rgba(240, 232, 216, 0.4);
          font-size: 1.25rem;
          cursor: pointer;
          align-self: flex-end;
          transition: color 0.2s;
        }
        .inline-dismiss:hover {
          color: #f0e8d8;
        }
        @media (max-width: 640px) {
          .upgrade-inline {
            flex-direction: column;
          }
          .inline-actions {
            flex-direction: row;
            width: 100%;
          }
          .inline-cta {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Hook to programmatically show upgrade triggers
export function useUpgradeTrigger() {
  const [activeTrigger, setActiveTrigger] = useState<{
    context: TriggerContext;
    variant: 'inline' | 'modal' | 'banner';
  } | null>(null);

  const showTrigger = (context: TriggerContext, variant: 'inline' | 'modal' | 'banner' = 'modal') => {
    // Check if user is already a subscriber
    const isSubscribed = localStorage.getItem('rop_subscription_active');
    if (isSubscribed) return;

    setActiveTrigger({ context, variant });
  };

  const hideTrigger = () => {
    setActiveTrigger(null);
  };

  return { activeTrigger, showTrigger, hideTrigger };
}
