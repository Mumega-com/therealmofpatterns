'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface AhaMomentProps {
  trigger: 'first-checkin' | 'high-resonance' | 'pattern-recognized' | 'custom';
  data?: {
    dominant?: string;
    kappa?: number;
    resonantFigure?: string;
    insight?: string;
  };
  onDismiss?: () => void;
}

const AHA_CONTENT: Record<string, Record<string, { title: string; messages: string[] }>> = {
  'first-checkin': {
    kasra: {
      title: 'PATTERN_CAPTURED',
      messages: [
        'Your first dimensional reading is complete.',
        'This baseline data will calibrate future analyses.',
        'Continue daily check-ins to map your field dynamics.',
      ],
    },
    river: {
      title: 'The Mirror Has Opened',
      messages: [
        'You have taken your first step into self-knowing.',
        'The dimensions have spoken your current truth.',
        'Return daily to deepen the conversation.',
      ],
    },
    sol: {
      title: 'You Did It! 🎉',
      messages: [
        'Your first pattern reading is complete!',
        'Now you can see how the 8 dimensions show up in your life.',
        'Check in daily to watch your patterns over time.',
      ],
    },
  },
  'high-resonance': {
    kasra: {
      title: 'HIGH_RESONANCE_DETECTED',
      messages: [
        'Pattern match >0.85 identified.',
        'Your signature aligns with historical configuration.',
        'Review resonant profile for dimensional insights.',
      ],
    },
    river: {
      title: 'A Soul Recognizes Itself',
      messages: [
        'Your pattern echoes through time.',
        'In this figure, you see reflected your own depths.',
        'Contemplate what this resonance reveals about your path.',
      ],
    },
    sol: {
      title: 'You Found a Match! ✨',
      messages: [
        'Your pattern is really similar to a famous figure!',
        'This doesn\'t mean you\'re the same, but you share key traits.',
        'It\'s a cool way to understand your unique strengths.',
      ],
    },
  },
  'pattern-recognized': {
    kasra: {
      title: 'PATTERN_ANOMALY_LOGGED',
      messages: [
        'Recurring dimensional signature detected.',
        'Your data reveals consistent field behavior.',
        'This pattern may indicate core characteristics.',
      ],
    },
    river: {
      title: 'The Pattern Reveals Itself',
      messages: [
        'What was hidden now becomes visible.',
        'Your repeated choices carve paths in the cosmic substrate.',
        'Awareness is the first step toward transformation.',
      ],
    },
    sol: {
      title: 'We Noticed Something! 👀',
      messages: [
        'You have a consistent pattern showing up.',
        'This might be a strength to lean into or an area to grow.',
        'The more you check in, the clearer it gets.',
      ],
    },
  },
};

export function AhaMoment({ trigger, data, onDismiss }: AhaMomentProps) {
  const mode = useStore($mode);
  const [isVisible, setIsVisible] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  const content = AHA_CONTENT[trigger]?.[mode] || AHA_CONTENT['first-checkin'][mode];

  useEffect(() => {
    // Animate through messages
    const timer = setInterval(() => {
      setAnimationPhase((prev) => {
        if (prev >= content.messages.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [content.messages.length]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0908]/95 backdrop-blur-md">
      <div className="relative w-full max-w-lg">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,168,84,0.15)_0%,transparent_70%)] blur-xl" />

        <div className="relative bg-[#141210] border border-[rgba(212,168,84,0.3)] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-6 pb-4 text-center border-b border-[rgba(212,168,84,0.1)]">
            <div className="text-4xl text-[#d4a854] mb-3 animate-pulse">◎</div>
            <h2 className="text-2xl font-serif text-[#f0e8d8]">
              {content.title}
            </h2>
          </div>

          {/* Messages */}
          <div className="p-6 space-y-4 min-h-[160px]">
            {content.messages.map((message, i) => (
              <p
                key={i}
                className={`text-[#f0e8d8]/80 text-center transition-all duration-500 ${
                  i < animationPhase
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
              >
                {message}
              </p>
            ))}
          </div>

          {/* Data display if available */}
          {data && (data.dominant || data.kappa) && (
            <div className="px-6 pb-4">
              <div className="flex justify-center gap-6 p-4 bg-[rgba(212,168,84,0.05)] rounded-lg">
                {data.dominant && (
                  <div className="text-center">
                    <div className="text-2xl text-[#d4a854]">{data.dominant}</div>
                    <div className="text-xs text-[#f0e8d8]/50">Dominant</div>
                  </div>
                )}
                {data.kappa && (
                  <div className="text-center">
                    <div className="text-xl text-[#d4a854] font-mono">
                      κ = {data.kappa.toFixed(2)}
                    </div>
                    <div className="text-xs text-[#f0e8d8]/50">Coherence</div>
                  </div>
                )}
                {data.resonantFigure && (
                  <div className="text-center">
                    <div className="text-sm text-[#d4a854]">{data.resonantFigure}</div>
                    <div className="text-xs text-[#f0e8d8]/50">Resonance</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 pt-2">
            <button
              onClick={handleDismiss}
              className="w-full py-3 bg-[#d4a854] text-[#0a0908] rounded-lg font-medium hover:bg-[#e5b964] transition-colors"
            >
              {mode === 'kasra' ? 'ACKNOWLEDGE' : mode === 'river' ? 'I Understand' : 'Got It!'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Hook to trigger aha moments
export function useAhaMoment() {
  const [trigger, setTrigger] = useState<AhaMomentProps['trigger'] | null>(null);
  const [data, setData] = useState<AhaMomentProps['data']>();

  const showAha = (newTrigger: AhaMomentProps['trigger'], newData?: AhaMomentProps['data']) => {
    // Check if this aha has been shown before
    const key = `rop_aha_${newTrigger}`;
    const shown = localStorage.getItem(key);

    if (!shown) {
      setTrigger(newTrigger);
      setData(newData);
      localStorage.setItem(key, 'true');
    }
  };

  const hideAha = () => {
    setTrigger(null);
    setData(undefined);
  };

  return { trigger, data, showAha, hideAha };
}
