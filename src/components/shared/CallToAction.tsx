import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface CTAProps {
  variant?: 'primary' | 'secondary' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  preset?: 'checkin' | 'subscribe' | 'learn' | 'theater' | 'weather';
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

// Mode-specific CTA copy
const CTA_PRESETS: Record<string, Record<string, { label: string; sublabel?: string }>> = {
  checkin: {
    kasra: { label: 'Initialize Check-in', sublabel: 'Calibrate your field state' },
    river: { label: 'Begin the Ritual', sublabel: 'Let the patterns speak' },
    sol: { label: 'Start Check-in', sublabel: 'See how you\'re doing today' },
  },
  subscribe: {
    kasra: { label: 'Activate Alerts', sublabel: 'Get optimal window notifications' },
    river: { label: 'Receive Wisdom', sublabel: 'Daily guidance awaits' },
    sol: { label: 'Get Daily Insights', sublabel: 'Free forever, no spam' },
  },
  learn: {
    kasra: { label: 'Access Documentation', sublabel: 'Framework specifications' },
    river: { label: 'Explore the Mysteries', sublabel: 'Deep knowledge awaits' },
    sol: { label: 'Learn More', sublabel: 'Understand your patterns' },
  },
  theater: {
    kasra: { label: 'View Cosmic Channel', sublabel: 'Real-time field visualization' },
    river: { label: 'Enter the Theater', sublabel: 'Witness the eternal dance' },
    sol: { label: 'Watch Now', sublabel: 'Live cosmic scenes' },
  },
  weather: {
    kasra: { label: 'Check Field Status', sublabel: 'Today\'s dimensional analysis' },
    river: { label: 'Read the Signs', sublabel: 'What the cosmos whispers' },
    sol: { label: 'Today\'s Forecast', sublabel: 'See what\'s in the stars' },
  },
};

const PRESET_HREFS: Record<string, string> = {
  checkin: '/sol/checkin',
  subscribe: '/subscribe',
  learn: '/learn',
  theater: '/theater',
  weather: '/weather',
};

export function CallToAction({
  variant = 'primary',
  size = 'md',
  preset,
  href,
  onClick,
  children,
  className = '',
  fullWidth = false,
}: CTAProps) {
  const mode = useStore($mode);

  // Get copy from preset or use children
  const presetContent = preset ? CTA_PRESETS[preset]?.[mode] : null;
  const finalHref = href || (preset ? PRESET_HREFS[preset] : undefined);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-[#d4a854] text-[#0a0908] hover:bg-[#e5b964] hover:shadow-[0_0_20px_rgba(212,168,84,0.3)]',
    secondary: 'border border-[#d4a854] text-[#d4a854] hover:bg-[rgba(212,168,84,0.1)]',
    subtle: 'text-[#d4a854] hover:text-[#e5b964] underline underline-offset-4',
  };

  const baseClasses = `
    inline-flex flex-col items-center justify-center
    font-medium rounded-lg transition-all duration-300
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  const content = children || (
    <>
      <span>{presetContent?.label || 'Learn More'}</span>
      {presetContent?.sublabel && (
        <span className={`${size === 'lg' ? 'text-xs' : 'text-[10px]'} opacity-70 mt-0.5`}>
          {presetContent.sublabel}
        </span>
      )}
    </>
  );

  if (finalHref) {
    return (
      <a href={finalHref} className={baseClasses} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={baseClasses} onClick={onClick}>
      {content}
    </button>
  );
}

// Inline CTA with icon for in-content use
interface InlineCTAProps {
  href: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineCTA({ href, icon = '→', children, className = '' }: InlineCTAProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 text-[#d4a854] hover:text-[#e5b964] transition-colors group ${className}`}
    >
      <span>{children}</span>
      <span className="group-hover:translate-x-1 transition-transform">{icon}</span>
    </a>
  );
}

// Section CTA block for end-of-content sections
interface SectionCTAProps {
  title: string;
  description: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function SectionCTA({
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
}: SectionCTAProps) {
  return (
    <div className={`text-center py-12 border-t border-[rgba(212,168,84,0.1)] ${className}`}>
      <h3 className="text-xl font-serif text-[#f0e8d8] mb-2">{title}</h3>
      <p className="text-[#f0e8d8]/60 text-sm mb-6 max-w-md mx-auto">{description}</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <a
          href={primaryAction.href}
          className="px-6 py-3 bg-[#d4a854] text-[#0a0908] rounded-lg font-medium hover:bg-[#e5b964] transition-colors"
        >
          {primaryAction.label}
        </a>
        {secondaryAction && (
          <a
            href={secondaryAction.href}
            className="px-6 py-3 border border-[#d4a854] text-[#d4a854] rounded-lg hover:bg-[rgba(212,168,84,0.1)] transition-colors"
          >
            {secondaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}
