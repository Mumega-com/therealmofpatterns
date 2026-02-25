'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

type Feature =
  | 'shadow-octave'    // 16D full analysis (9-16 dimensions)
  | 'history-30'       // 30-day history
  | 'history-unlimited' // Unlimited history
  | 'optimal-windows'  // Hour-by-hour optimal times
  | 'failure-warnings' // Predictive alerts
  | 'export-data'      // Data export
  | 'elder-system'     // Elder progress tracking
  | 'figure-deep'      // Deep historical figure analysis
  | 'custom-alerts'    // Custom notification settings
  | 'api-access';      // API access

interface FeatureGateProps {
  feature: Feature;
  children: ReactNode;
  showTeaser?: boolean;       // Show a blurred teaser of content
  compact?: boolean;          // Compact upgrade prompt
  className?: string;
}

// Feature metadata
const FEATURE_META: Record<Feature, {
  name: { kasra: string; river: string; sol: string };
  description: { kasra: string; river: string; sol: string };
  tier: 'keeper' | 'circle';  // Minimum tier required
}> = {
  'shadow-octave': {
    name: {
      kasra: 'SHADOW_OCTAVE',
      river: 'The Shadow Octave',
      sol: 'Complete Personality Breakdown',
    },
    description: {
      kasra: 'Access dimensions 9-16 for complete field mapping.',
      river: 'See the hidden half of your pattern - what lies beneath.',
      sol: 'See your complete profile including your shadow sides.',
    },
    tier: 'keeper',
  },
  'history-30': {
    name: {
      kasra: '30_DAY_BUFFER',
      river: '30-Day Memory',
      sol: '30-Day History',
    },
    description: {
      kasra: 'Access pattern data from the past 30 days.',
      river: 'Remember your journey across a lunar cycle.',
      sol: 'See your patterns over the last month.',
    },
    tier: 'keeper',
  },
  'history-unlimited': {
    name: {
      kasra: 'UNLIMITED_BUFFER',
      river: 'Eternal Memory',
      sol: 'Full History',
    },
    description: {
      kasra: 'Access complete historical pattern data.',
      river: 'Your entire journey, always accessible.',
      sol: 'See all your past check-ins, forever.',
    },
    tier: 'keeper',
  },
  'optimal-windows': {
    name: {
      kasra: 'OPTIMAL_WINDOWS',
      river: 'Sacred Timing',
      sol: 'Best Times',
    },
    description: {
      kasra: 'Hour-by-hour coherence forecasting for your signature.',
      river: 'Know when the cosmos favors your intentions.',
      sol: 'See your best hours for different activities.',
    },
    tier: 'keeper',
  },
  'failure-warnings': {
    name: {
      kasra: 'FAILURE_MODE_ALERTS',
      river: 'Storm Warnings',
      sol: 'Heads Up Alerts',
    },
    description: {
      kasra: 'Predictive alerts 24-48 hours before low-coherence periods.',
      river: 'Receive whispers of coming challenges.',
      sol: 'Get warned before tough days hit.',
    },
    tier: 'keeper',
  },
  'export-data': {
    name: {
      kasra: 'DATA_EXPORT',
      river: 'Carry Your Pattern',
      sol: 'Download Data',
    },
    description: {
      kasra: 'Export pattern data in JSON, CSV, or PDF format.',
      river: 'Take your patterns with you wherever you go.',
      sol: 'Download your data anytime.',
    },
    tier: 'keeper',
  },
  'elder-system': {
    name: {
      kasra: 'ELDER_PROGRESSION',
      river: 'The Elder Path',
      sol: 'Progress System',
    },
    description: {
      kasra: 'Milestone tracking with unlockable insights.',
      river: 'Walk the path of deepening wisdom.',
      sol: 'Unlock new features as you practice.',
    },
    tier: 'keeper',
  },
  'figure-deep': {
    name: {
      kasra: 'DEEP_RESONANCE_ANALYSIS',
      river: 'Soul Resonance',
      sol: 'Full Figure Match',
    },
    description: {
      kasra: 'Detailed comparison with resonant historical patterns.',
      river: 'Understand your connection to those who walked before.',
      sol: 'See detailed analysis of your pattern matches.',
    },
    tier: 'keeper',
  },
  'custom-alerts': {
    name: {
      kasra: 'CUSTOM_NOTIFICATIONS',
      river: 'Personal Whispers',
      sol: 'Custom Alerts',
    },
    description: {
      kasra: 'Configure threshold triggers and notification preferences.',
      river: 'Choose when and how the cosmos speaks to you.',
      sol: 'Set up alerts for what matters to you.',
    },
    tier: 'keeper',
  },
  'api-access': {
    name: {
      kasra: 'API_INTERFACE',
      river: 'Pattern Gateway',
      sol: 'API Access',
    },
    description: {
      kasra: 'Programmatic access for integration with external systems.',
      river: 'Connect your pattern to your other tools.',
      sol: 'Use your data in other apps.',
    },
    tier: 'circle',
  },
};

// Check if user has required subscription
function useSubscription() {
  const [tier, setTier] = useState<'free' | 'keeper' | 'circle'>('free');

  useEffect(() => {
    const storedTier = localStorage.getItem('rop_subscription_tier');
    if (storedTier === 'keeper' || storedTier === 'circle') {
      setTier(storedTier);
    }
  }, []);

  return tier;
}

// Check if feature is accessible
function canAccess(userTier: 'free' | 'keeper' | 'circle', requiredTier: 'keeper' | 'circle'): boolean {
  if (userTier === 'circle') return true;
  if (userTier === 'keeper' && requiredTier === 'keeper') return true;
  return false;
}

export function FeatureGate({
  feature,
  children,
  showTeaser = true,
  compact = false,
  className = '',
}: FeatureGateProps) {
  const mode = useStore($mode);
  const userTier = useSubscription();

  // All features are currently free — Pro gating disabled
  return <>{children}</>;
}

// Hook to check feature access
export function useFeatureAccess(feature: Feature): boolean {
  const userTier = useSubscription();
  const meta = FEATURE_META[feature];
  return canAccess(userTier, meta.tier);
}

// Component to conditionally render based on tier
interface TierGateProps {
  minTier: 'keeper' | 'circle';
  fallback?: ReactNode;
  children: ReactNode;
}

export function TierGate({ minTier, fallback, children }: TierGateProps) {
  const userTier = useSubscription();
  const hasAccess = canAccess(userTier, minTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// List of available features for reference
export const FEATURES = Object.keys(FEATURE_META) as Feature[];
