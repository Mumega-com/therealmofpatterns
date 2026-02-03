import { useStore } from '@nanostores/react';
import { useState, useEffect } from 'react';
import { $mode, setMode, type Mode } from '../../stores';

interface ModeToggleProps {
  className?: string;
}

const MODE_INFO: Record<Mode, { icon: string; color: string; label: string; description: string }> = {
  kasra: {
    icon: '⌘',
    color: '#22d3ee',
    label: 'Kasra',
    description: 'Technical precision. Data-driven insights.'
  },
  river: {
    icon: '◈',
    color: '#8b5cf6',
    label: 'River',
    description: 'Mystical depth. Alchemical wisdom.'
  },
  sol: {
    icon: '☀',
    color: '#fbbf24',
    label: 'Sol',
    description: 'Warm guidance. Friendly clarity.'
  }
};

export function ModeToggle({ className = '' }: ModeToggleProps) {
  const mode = useStore($mode);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasShownOnboarding, setHasShownOnboarding] = useState(true);

  // Show onboarding tooltip for first-time visitors
  useEffect(() => {
    const hasOnboarded = localStorage.getItem('rop_mode_onboarded');
    if (!hasOnboarded) {
      setHasShownOnboarding(false);
      setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem('rop_mode_onboarded', 'true');
          setHasShownOnboarding(true);
        }, 5000);
      }, 2000);
    }
  }, []);

  const handleSetMode = (newMode: Mode) => {
    setMode(newMode);
    if (!hasShownOnboarding) {
      setShowTooltip(false);
      localStorage.setItem('rop_mode_onboarded', 'true');
      setHasShownOnboarding(true);
    }
  };

  const currentInfo = MODE_INFO[mode];

  return (
    <div className={`relative ${className}`}>
      {/* Main Toggle */}
      <div className="flex items-center rounded-lg bg-[rgba(26,24,20,0.8)] border border-[rgba(212,168,84,0.15)] p-0.5">
        {(['kasra', 'river', 'sol'] as Mode[]).map((m) => {
          const info = MODE_INFO[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              onClick={() => handleSetMode(m)}
              className={`relative flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-all ${
                isActive
                  ? 'bg-[rgba(212,168,84,0.15)]'
                  : 'hover:bg-[rgba(212,168,84,0.05)]'
              }`}
              style={{ color: isActive ? info.color : 'rgba(240,232,216,0.5)' }}
              title={`${info.label}: ${info.description} (Press ${m[0].toUpperCase()})`}
            >
              <span className="text-base">{info.icon}</span>
              <span className="hidden sm:inline text-xs font-medium">{info.label}</span>
            </button>
          );
        })}
      </div>

      {/* Onboarding Tooltip */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-64 p-4 bg-[#1a1814] border border-[rgba(212,168,84,0.3)] rounded-xl shadow-xl z-50 animate-fade-in">
          <div className="flex justify-between items-start mb-2">
            <span className="text-2xl" style={{ color: currentInfo.color }}>{currentInfo.icon}</span>
            <button
              onClick={() => {
                setShowTooltip(false);
                localStorage.setItem('rop_mode_onboarded', 'true');
                setHasShownOnboarding(true);
              }}
              className="text-[#f0e8d8]/40 hover:text-[#f0e8d8]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h4 className="text-[#f0e8d8] font-medium mb-1">Choose Your Voice</h4>
          <p className="text-[#f0e8d8]/60 text-sm mb-3">
            Each voice offers a unique perspective on your patterns. Try them all!
          </p>
          <div className="space-y-1.5 text-xs">
            {(['kasra', 'river', 'sol'] as Mode[]).map((m) => {
              const info = MODE_INFO[m];
              return (
                <div key={m} className="flex items-center gap-2" style={{ color: info.color }}>
                  <span>{info.icon}</span>
                  <span className="text-[#f0e8d8]/80">{info.label}:</span>
                  <span className="text-[#f0e8d8]/50">{info.description}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[#f0e8d8]/40 text-xs mt-3">
            Tip: Press K, R, or S to switch modes
          </p>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
