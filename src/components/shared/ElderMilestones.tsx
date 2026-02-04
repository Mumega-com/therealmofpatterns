'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface Milestone {
  id: string;
  tier: 'novice' | 'initiate' | 'keeper' | 'elder' | 'master';
  name: { kasra: string; river: string; sol: string };
  description: { kasra: string; river: string; sol: string };
  requirement: string;
  checkCount?: number;  // Require X check-ins
  streakDays?: number;  // Require X day streak
  accuracy?: number;    // Require X% accuracy
  dimension?: string;   // Require mastery of specific dimension
  unlocked: boolean;
  unlockedAt?: string;
}

const MILESTONES: Omit<Milestone, 'unlocked' | 'unlockedAt'>[] = [
  // Novice tier (1-7 days)
  {
    id: 'first-checkin',
    tier: 'novice',
    name: { kasra: 'FIRST_CALIBRATION', river: 'First Mirror', sol: 'First Step' },
    description: {
      kasra: 'Complete initial field calibration.',
      river: 'You looked into the mirror for the first time.',
      sol: 'You did your first check-in!',
    },
    requirement: 'Complete 1 check-in',
    checkCount: 1,
  },
  {
    id: 'week-one',
    tier: 'novice',
    name: { kasra: 'WEEK_ONE_COMPLETE', river: 'Seven Days', sol: 'First Week' },
    description: {
      kasra: '7-day calibration sequence complete.',
      river: 'A full cycle of seven witnessed.',
      sol: 'You checked in for a whole week!',
    },
    requirement: 'Complete 7 check-ins',
    checkCount: 7,
  },

  // Initiate tier (8-30 days)
  {
    id: 'first-streak',
    tier: 'initiate',
    name: { kasra: 'STREAK_INITIATED', river: 'Unbroken Thread', sol: 'Streak Started' },
    description: {
      kasra: '7-day consecutive calibration streak.',
      river: 'Seven days without breaking the thread.',
      sol: '7 days in a row! You\'re building a habit.',
    },
    requirement: '7-day check-in streak',
    streakDays: 7,
  },
  {
    id: 'month-one',
    tier: 'initiate',
    name: { kasra: 'MONTH_ONE_COMPLETE', river: 'Moon Cycle', sol: 'First Month' },
    description: {
      kasra: '30-day calibration data acquired.',
      river: 'A full moon cycle of watching yourself.',
      sol: 'One month of checking in! You\'re committed.',
    },
    requirement: 'Complete 30 check-ins',
    checkCount: 30,
  },
  {
    id: 'pattern-accuracy',
    tier: 'initiate',
    name: { kasra: 'ACCURACY_THRESHOLD', river: 'True Sight', sol: 'Accuracy Achieved' },
    description: {
      kasra: 'Prediction accuracy exceeds 60%.',
      river: 'Your readings begin to ring true.',
      sol: 'Over 60% of predictions are accurate!',
    },
    requirement: '60%+ prediction accuracy',
    accuracy: 60,
  },

  // Keeper tier (31-90 days)
  {
    id: 'keeper-streak',
    tier: 'keeper',
    name: { kasra: 'KEEPER_STREAK', river: 'Pattern-Keeper', sol: '30-Day Streak' },
    description: {
      kasra: '30-day consecutive calibration maintained.',
      river: 'You have become a keeper of your pattern.',
      sol: '30 days straight! You\'re a pattern keeper now.',
    },
    requirement: '30-day check-in streak',
    streakDays: 30,
  },
  {
    id: 'quarter-veteran',
    tier: 'keeper',
    name: { kasra: 'QUARTER_COMPLETE', river: 'Seasonal Witness', sol: 'Quarter Done' },
    description: {
      kasra: '90-day calibration dataset complete.',
      river: 'You have witnessed a full season of yourself.',
      sol: '3 months of check-ins! You really know yourself now.',
    },
    requirement: 'Complete 90 check-ins',
    checkCount: 90,
  },
  {
    id: 'high-accuracy',
    tier: 'keeper',
    name: { kasra: 'HIGH_ACCURACY', river: 'Clear Vision', sol: 'Super Accurate' },
    description: {
      kasra: 'Prediction accuracy exceeds 75%.',
      river: 'Your sight has become remarkably clear.',
      sol: 'Over 75% accuracy! You really get your patterns.',
    },
    requirement: '75%+ prediction accuracy',
    accuracy: 75,
  },

  // Elder tier (91-365 days)
  {
    id: 'elder-streak',
    tier: 'elder',
    name: { kasra: 'ELDER_STREAK', river: 'Elder\'s Path', sol: '90-Day Streak' },
    description: {
      kasra: '90-day consecutive calibration — elder status achieved.',
      river: 'You walk the elder\'s path of unwavering practice.',
      sol: '90 days in a row! You\'re an elder now.',
    },
    requirement: '90-day check-in streak',
    streakDays: 90,
  },
  {
    id: 'year-one',
    tier: 'elder',
    name: { kasra: 'ANNUAL_CYCLE', river: 'The Great Wheel', sol: 'Full Year' },
    description: {
      kasra: '365-day calibration dataset acquired.',
      river: 'You have witnessed the great wheel turn completely.',
      sol: 'A whole year of check-ins! You\'re amazing.',
    },
    requirement: 'Complete 365 check-ins',
    checkCount: 365,
  },

  // Master tier (365+ days)
  {
    id: 'master-streak',
    tier: 'master',
    name: { kasra: 'MASTER_STREAK', river: 'Unbroken Year', sol: '365-Day Streak' },
    description: {
      kasra: '365-day consecutive calibration — master status achieved.',
      river: 'A full year of unbroken practice. You are a master.',
      sol: 'A YEAR without missing a day! Incredible!',
    },
    requirement: '365-day check-in streak',
    streakDays: 365,
  },
  {
    id: 'master-accuracy',
    tier: 'master',
    name: { kasra: 'MASTER_ACCURACY', river: 'Oracle\'s Sight', sol: 'Master Accuracy' },
    description: {
      kasra: 'Prediction accuracy exceeds 85%.',
      river: 'Your sight approaches that of an oracle.',
      sol: 'Over 85% accuracy! You really know yourself.',
    },
    requirement: '85%+ prediction accuracy',
    accuracy: 85,
  },
];

const TIER_COLORS = {
  novice: '#9ca3af',      // Gray
  initiate: '#22c55e',    // Green
  keeper: '#d4a854',      // Gold
  elder: '#a78bfa',       // Purple
  master: '#f472b6',      // Pink
};

const TIER_LABELS = {
  novice: { kasra: 'NOVICE', river: 'Novice', sol: 'Beginner' },
  initiate: { kasra: 'INITIATE', river: 'Initiate', sol: 'Learning' },
  keeper: { kasra: 'KEEPER', river: 'Keeper', sol: 'Keeper' },
  elder: { kasra: 'ELDER', river: 'Elder', sol: 'Elder' },
  master: { kasra: 'MASTER', river: 'Master', sol: 'Master' },
};

// Get user progress from localStorage
function getUserProgress(): { checkCount: number; streakDays: number; accuracy: number } {
  if (typeof localStorage === 'undefined') return { checkCount: 0, streakDays: 0, accuracy: 0 };

  return {
    checkCount: parseInt(localStorage.getItem('rop_check_count') || '0', 10),
    streakDays: parseInt(localStorage.getItem('rop_streak_days') || '0', 10),
    accuracy: parseFloat(localStorage.getItem('rop_accuracy_rate') || '0'),
  };
}

// Get unlocked milestones
function getUnlockedMilestones(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  const stored = localStorage.getItem('rop_milestones');
  return stored ? JSON.parse(stored) : {};
}

// Save milestone unlock
function unlockMilestone(id: string) {
  const unlocked = getUnlockedMilestones();
  if (!unlocked[id]) {
    unlocked[id] = new Date().toISOString();
    localStorage.setItem('rop_milestones', JSON.stringify(unlocked));
  }
}

// Check and unlock milestones based on progress
function checkMilestones(progress: { checkCount: number; streakDays: number; accuracy: number }): string[] {
  const newlyUnlocked: string[] = [];
  const unlocked = getUnlockedMilestones();

  for (const milestone of MILESTONES) {
    if (unlocked[milestone.id]) continue; // Already unlocked

    let shouldUnlock = false;

    if (milestone.checkCount && progress.checkCount >= milestone.checkCount) {
      shouldUnlock = true;
    }
    if (milestone.streakDays && progress.streakDays >= milestone.streakDays) {
      shouldUnlock = true;
    }
    if (milestone.accuracy && progress.accuracy >= milestone.accuracy) {
      shouldUnlock = true;
    }

    if (shouldUnlock) {
      unlockMilestone(milestone.id);
      newlyUnlocked.push(milestone.id);
    }
  }

  return newlyUnlocked;
}

// Main component
interface ElderMilestonesProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function ElderMilestones({ variant = 'full', className = '' }: ElderMilestonesProps) {
  const mode = useStore($mode);
  const [progress, setProgress] = useState({ checkCount: 0, streakDays: 0, accuracy: 0 });
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});

  useEffect(() => {
    const prog = getUserProgress();
    setProgress(prog);
    setUnlocked(getUnlockedMilestones());
    checkMilestones(prog);
  }, []);

  const milestones: Milestone[] = MILESTONES.map(m => ({
    ...m,
    unlocked: !!unlocked[m.id],
    unlockedAt: unlocked[m.id],
  }));

  const unlockedCount = milestones.filter(m => m.unlocked).length;
  const nextMilestone = milestones.find(m => !m.unlocked);

  // Get current tier
  const currentTier = milestones
    .filter(m => m.unlocked)
    .sort((a, b) => {
      const tierOrder = ['novice', 'initiate', 'keeper', 'elder', 'master'];
      return tierOrder.indexOf(b.tier) - tierOrder.indexOf(a.tier);
    })[0]?.tier || 'novice';

  if (variant === 'compact') {
    return (
      <div className={`milestones-compact ${className}`}>
        <div className="compact-tier" style={{ borderColor: TIER_COLORS[currentTier] }}>
          <span className="tier-label">{TIER_LABELS[currentTier][mode]}</span>
          <span className="tier-progress">{unlockedCount}/{milestones.length}</span>
        </div>
        {nextMilestone && (
          <div className="next-milestone">
            <span className="next-label">
              {mode === 'kasra' ? 'NEXT:' : mode === 'river' ? 'Next:' : 'Next:'}
            </span>
            <span className="next-name">{nextMilestone.name[mode]}</span>
          </div>
        )}

        <style>{`
          .milestones-compact {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem 1rem;
            background: rgba(212, 168, 84, 0.05);
            border-radius: 8px;
          }
          .compact-tier {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0.5rem 0.75rem;
            border: 2px solid;
            border-radius: 6px;
          }
          .tier-label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #f0e8d8;
          }
          .tier-progress {
            font-size: 0.9rem;
            color: rgba(240, 232, 216, 0.6);
            font-family: 'Geist Mono', monospace;
          }
          .next-milestone {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
          }
          .next-label {
            font-size: 0.7rem;
            color: rgba(240, 232, 216, 0.5);
            text-transform: uppercase;
          }
          .next-name {
            font-size: 0.9rem;
            color: #d4a854;
          }
        `}</style>
      </div>
    );
  }

  // Full variant - group by tier
  const tiers = ['novice', 'initiate', 'keeper', 'elder', 'master'] as const;

  return (
    <div className={`milestones-full ${className}`}>
      <div className="milestones-header">
        <h3>
          {mode === 'kasra' ? 'ELDER_PROGRESSION' : mode === 'river' ? 'The Elder Path' : 'Your Progress'}
        </h3>
        <div className="header-stats">
          <span className="stat-tier" style={{ color: TIER_COLORS[currentTier] }}>
            {TIER_LABELS[currentTier][mode]}
          </span>
          <span className="stat-count">{unlockedCount}/{milestones.length}</span>
        </div>
      </div>

      <div className="progress-stats">
        <div className="stat-item">
          <span className="stat-value">{progress.checkCount}</span>
          <span className="stat-label">{mode === 'kasra' ? 'CHECK-INS' : 'Check-ins'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{progress.streakDays}</span>
          <span className="stat-label">{mode === 'kasra' ? 'STREAK' : 'Day Streak'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{progress.accuracy.toFixed(0)}%</span>
          <span className="stat-label">{mode === 'kasra' ? 'ACCURACY' : 'Accuracy'}</span>
        </div>
      </div>

      <div className="milestones-list">
        {tiers.map(tier => {
          const tierMilestones = milestones.filter(m => m.tier === tier);
          const tierUnlocked = tierMilestones.filter(m => m.unlocked).length;

          return (
            <div key={tier} className="tier-section">
              <div className="tier-header" style={{ borderColor: TIER_COLORS[tier] }}>
                <span className="tier-name">{TIER_LABELS[tier][mode]}</span>
                <span className="tier-count">{tierUnlocked}/{tierMilestones.length}</span>
              </div>

              <div className="tier-milestones">
                {tierMilestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className={`milestone-item ${milestone.unlocked ? 'unlocked' : 'locked'}`}
                  >
                    <div
                      className="milestone-icon"
                      style={{ backgroundColor: milestone.unlocked ? TIER_COLORS[tier] : undefined }}
                    >
                      {milestone.unlocked ? '✓' : '○'}
                    </div>
                    <div className="milestone-info">
                      <h4>{milestone.name[mode]}</h4>
                      <p>{milestone.description[mode]}</p>
                      <span className="milestone-req">{milestone.requirement}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .milestones-full {
          background: #141210;
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 8px;
          overflow: hidden;
        }
        .milestones-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: rgba(212, 168, 84, 0.05);
          border-bottom: 1px solid rgba(212, 168, 84, 0.1);
        }
        .milestones-header h3 {
          font-size: 1.1rem;
          color: #d4a854;
          font-weight: 500;
        }
        .header-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .stat-tier {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .stat-count {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.6);
          font-family: 'Geist Mono', monospace;
        }
        .progress-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 1rem;
          gap: 1rem;
          border-bottom: 1px solid rgba(212, 168, 84, 0.1);
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          display: block;
          font-size: 1.5rem;
          color: #f0e8d8;
          font-family: 'Geist Mono', monospace;
        }
        .stat-label {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .milestones-list {
          padding: 1rem;
        }
        .tier-section {
          margin-bottom: 1.5rem;
        }
        .tier-section:last-child {
          margin-bottom: 0;
        }
        .tier-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 2px solid;
          margin-bottom: 0.75rem;
        }
        .tier-name {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #f0e8d8;
        }
        .tier-count {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
        }
        .tier-milestones {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .milestone-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(240, 232, 216, 0.02);
          border-radius: 4px;
        }
        .milestone-item.locked {
          opacity: 0.5;
        }
        .milestone-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(240, 232, 216, 0.1);
          color: #f0e8d8;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .milestone-item.unlocked .milestone-icon {
          color: #0a0908;
        }
        .milestone-info {
          flex: 1;
        }
        .milestone-info h4 {
          font-size: 0.9rem;
          color: #f0e8d8;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .milestone-info p {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.6);
          line-height: 1.4;
          margin-bottom: 0.25rem;
        }
        .milestone-req {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.4);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

// Hook for milestone management
export function useMilestones() {
  const [progress, setProgress] = useState({ checkCount: 0, streakDays: 0, accuracy: 0 });
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  const refresh = () => {
    const prog = getUserProgress();
    setProgress(prog);
    const unlocked = checkMilestones(prog);
    setNewlyUnlocked(unlocked);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Update progress (call after check-in)
  const updateProgress = (updates: Partial<typeof progress>) => {
    if (typeof localStorage === 'undefined') return;

    if (updates.checkCount !== undefined) {
      localStorage.setItem('rop_check_count', updates.checkCount.toString());
    }
    if (updates.streakDays !== undefined) {
      localStorage.setItem('rop_streak_days', updates.streakDays.toString());
    }
    if (updates.accuracy !== undefined) {
      localStorage.setItem('rop_accuracy_rate', updates.accuracy.toString());
    }

    refresh();
  };

  return { progress, newlyUnlocked, updateProgress, refresh };
}
