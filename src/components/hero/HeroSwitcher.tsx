'use client';

import { useState, useEffect } from 'react';
import { HeroSimple } from './HeroSimple';
import { HeroEnhanced } from './HeroEnhanced';

/**
 * HeroSwitcher - Shows the right hero based on user state
 *
 * First-time visitor → HeroSimple (focused, single CTA)
 * Returning user (has done check-in) → HeroEnhanced (full experience with modes)
 */
export function HeroSwitcher() {
  const [hasCheckedIn, setHasCheckedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has done a check-in before
    const history = localStorage.getItem('rop_checkin_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        setHasCheckedIn(parsed.entries?.length > 0);
      } catch {
        setHasCheckedIn(false);
      }
    } else {
      setHasCheckedIn(false);
    }
  }, []);

  // Loading state - show minimal placeholder
  if (hasCheckedIn === null) {
    return (
      <div className="hero-loading">
        <style>{`
          .hero-loading {
            min-height: 100vh;
            background: #0a0908;
          }
        `}</style>
      </div>
    );
  }

  // First-time user
  if (!hasCheckedIn) {
    return <HeroSimple />;
  }

  // Returning user
  return <HeroEnhanced />;
}
