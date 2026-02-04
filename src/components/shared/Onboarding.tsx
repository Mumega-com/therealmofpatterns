'use client';

import { useState, useEffect } from 'react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to The Realm of Patterns',
    description: 'Discover your cosmic signature through the 8-dimensional framework. Your unique pattern reveals how you navigate consciousness.',
    icon: '◎',
  },
  {
    id: 'dimensions',
    title: 'The 8 Dimensions',
    description: 'Phase, Existence, Cognition, Value, Expansion, Action, Relation, and Field - these dimensions map your inner landscape.',
    icon: '⬡',
  },
  {
    id: 'voices',
    title: 'Choose Your Voice',
    description: 'Three perspectives on your patterns: Kasra (technical), River (mystical), or Sol (friendly). Switch anytime with K, R, or S keys.',
    icon: '✧',
  },
  {
    id: 'checkin',
    title: 'Start Your Practice',
    description: 'Take a daily check-in to discover your current field state. Track your patterns over time and watch your understanding deepen.',
    icon: '☀',
    action: {
      label: 'Take Your First Check-in',
      href: '/sol/checkin',
    },
  },
];

interface OnboardingProps {
  onComplete?: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasOnboarded = localStorage.getItem('rop_onboarded');
    if (!hasOnboarded) {
      // Delay showing to let page load
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem('rop_onboarded', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0908]/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#141210] border border-[rgba(212,168,84,0.2)] rounded-2xl overflow-hidden shadow-2xl">
        {/* Progress */}
        <div className="flex gap-1 p-3">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-[#d4a854]' : 'bg-[rgba(212,168,84,0.2)]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="text-5xl text-[#d4a854] mb-4">{step.icon}</div>
          <h2 className="text-2xl font-serif text-[#f0e8d8] mb-3">
            {step.title}
          </h2>
          <p className="text-[#f0e8d8]/70 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 text-[#f0e8d8]/50 hover:text-[#f0e8d8] transition-colors"
          >
            Skip
          </button>
          {step.action && isLastStep ? (
            <a
              href={step.action.href}
              onClick={() => {
                completeOnboarding();
                step.action?.onClick?.();
              }}
              className="flex-1 py-3 bg-[#d4a854] text-[#0a0908] rounded-lg font-medium hover:bg-[#e5b964] transition-colors text-center"
            >
              {step.action.label}
            </a>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-[#d4a854] text-[#0a0908] rounded-lg font-medium hover:bg-[#e5b964] transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Mini onboarding tooltip for specific features
interface FeatureTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export function FeatureTooltip({
  id,
  title,
  description,
  position = 'bottom',
  children,
}: FeatureTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`rop_tooltip_${id}`);
    if (!seen) {
      setTimeout(() => setIsVisible(true), 2000);
    }
  }, [id]);

  const dismiss = () => {
    localStorage.setItem(`rop_tooltip_${id}`, 'true');
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 w-64 p-4 bg-[#1a1814] border border-[rgba(212,168,84,0.3)] rounded-xl shadow-xl ${positionClasses[position]}`}
        >
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 text-[#f0e8d8]/40 hover:text-[#f0e8d8]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h4 className="text-[#d4a854] font-medium mb-1">{title}</h4>
          <p className="text-[#f0e8d8]/70 text-sm">{description}</p>
          <button
            onClick={dismiss}
            className="mt-3 text-sm text-[#d4a854] hover:underline"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
