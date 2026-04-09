'use client';

import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

type SharePlatform = 'twitter' | 'facebook' | 'linkedin' | 'telegram' | 'copy';

interface ShareContent {
  title: string;
  description: string;
  url?: string;
  hashtags?: string[];
}

interface ShareButtonsProps {
  content: ShareContent;
  variant?: 'inline' | 'compact' | 'vertical';
  className?: string;
  onShare?: (platform: SharePlatform) => void;
}

// Generate share URLs
function getShareUrl(platform: SharePlatform, content: ShareContent): string {
  const url = content.url || (typeof window !== 'undefined' ? window.location.href : '');
  const text = `${content.title}\n\n${content.description}`;
  const hashtags = content.hashtags?.join(',') || 'FRC,CosmicPatterns';

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(content.title)}`;
    default:
      return url;
  }
}

// Platform icons
const PlatformIcons = {
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

const PLATFORM_LABELS: Record<string, Record<SharePlatform, string>> = {
  kasra: {
    twitter: 'X',
    facebook: 'FB',
    linkedin: 'LI',
    telegram: 'TG',
    copy: 'COPY',
  },
  river: {
    twitter: 'Share on X',
    facebook: 'Share on Facebook',
    linkedin: 'Share on LinkedIn',
    telegram: 'Share on Telegram',
    copy: 'Copy Link',
  },
  sol: {
    twitter: 'Tweet',
    facebook: 'Share',
    linkedin: 'Post',
    telegram: 'Telegram',
    copy: 'Copy',
  },
};

export function ShareButtons({
  content,
  variant = 'inline',
  className = '',
  onShare,
}: ShareButtonsProps) {
  const mode = useStore($mode);
  const [copied, setCopied] = useState(false);

  const handleShare = async (platform: SharePlatform) => {
    if (platform === 'copy') {
      const url = content.url || window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      window.open(getShareUrl(platform, content), '_blank', 'width=600,height=400');
    }
    onShare?.(platform);
  };

  const platforms: SharePlatform[] = ['twitter', 'facebook', 'linkedin', 'telegram', 'copy'];

  return (
    <div className={`share-buttons ${variant} ${className}`}>
      {platforms.map((platform) => (
        <button
          key={platform}
          className={`share-btn ${platform} ${platform === 'copy' && copied ? 'copied' : ''}`}
          onClick={() => handleShare(platform)}
          title={PLATFORM_LABELS.river[platform]}
        >
          {PlatformIcons[platform]}
          {variant !== 'compact' && (
            <span className="btn-label">
              {platform === 'copy' && copied
                ? mode === 'kasra'
                  ? 'COPIED'
                  : 'Copied!'
                : PLATFORM_LABELS[mode][platform]}
            </span>
          )}
        </button>
      ))}

      <style>{`
        .share-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .share-buttons.inline {
          flex-direction: row;
        }
        .share-buttons.vertical {
          flex-direction: column;
        }
        .share-buttons.compact .share-btn {
          width: 36px;
          height: 36px;
          padding: 0;
          justify-content: center;
        }
        .share-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(212, 168, 84, 0.1);
          border: 1px solid rgba(212, 168, 84, 0.2);
          color: #f0e8d8;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .share-btn:hover {
          background: rgba(212, 168, 84, 0.15);
          border-color: rgba(212, 168, 84, 0.4);
        }
        .share-btn.twitter:hover {
          color: #1da1f2;
          border-color: rgba(29, 161, 242, 0.4);
        }
        .share-btn.facebook:hover {
          color: #1877f2;
          border-color: rgba(24, 119, 242, 0.4);
        }
        .share-btn.linkedin:hover {
          color: #0a66c2;
          border-color: rgba(10, 102, 194, 0.4);
        }
        .share-btn.telegram:hover {
          color: #229ed9;
          border-color: rgba(34, 158, 217, 0.4);
        }
        .share-btn.copy.copied {
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.4);
        }
        .btn-label {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}

// Share card for readings
interface ShareCardProps {
  reading: {
    kappa: number;
    stage: string;
    dimensions: { name: string; value: number }[];
  };
  className?: string;
}

export function ShareCard({ reading, className = '' }: ShareCardProps) {
  const mode = useStore($mode);

  const titles = {
    kasra: `κ=${reading.kappa.toFixed(2)} | ${reading.stage.toUpperCase()}_STAGE`,
    river: `Field coherence: ${reading.kappa.toFixed(2)} in ${reading.stage}`,
    sol: `My cosmic reading: ${(reading.kappa * 100).toFixed(0)}% coherence!`,
  };

  const descriptions = {
    kasra: `16D pattern analysis complete. Top dimensions: ${reading.dimensions.slice(0, 3).map(d => d.name).join(', ')}.`,
    river: `The patterns speak today. ${reading.dimensions[0]?.name} leads the dance at ${(reading.dimensions[0]?.value * 100).toFixed(0)}%.`,
    sol: `My top dimension today is ${reading.dimensions[0]?.name}! Checking my cosmic weather on The Realm of Patterns.`,
  };

  const content: ShareContent = {
    title: titles[mode],
    description: descriptions[mode],
    hashtags: ['RealmOfPatterns', 'FRC', 'CosmicPatterns'],
  };

  return (
    <div className={`share-card ${className}`}>
      <div className="card-preview">
        <div className="preview-kappa">
          <span className="kappa-label">
            {mode === 'kasra' ? 'κ' : mode === 'river' ? 'Coherence' : 'Score'}
          </span>
          <span className="kappa-value">{(reading.kappa * 100).toFixed(0)}%</span>
        </div>
        <div className="preview-stage">{reading.stage}</div>
        <div className="preview-dims">
          {reading.dimensions.slice(0, 3).map((dim, i) => (
            <span key={i} className="dim-tag">
              {dim.name}: {(dim.value * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>

      <div className="share-actions">
        <span className="share-label">
          {mode === 'kasra' ? 'SHARE_READING' : mode === 'river' ? 'Share Your Reading' : 'Share'}
        </span>
        <ShareButtons content={content} variant="compact" />
      </div>

      <style>{`
        .share-card {
          background: #141210;
          border: 1px solid rgba(212, 168, 84, 0.2);
          padding: 1.25rem;
        }
        .card-preview {
          text-align: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(212, 168, 84, 0.1);
        }
        .preview-kappa {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .kappa-label {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .kappa-value {
          font-size: 2rem;
          color: #d4a854;
          font-weight: 300;
        }
        .preview-stage {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          text-transform: capitalize;
          margin-bottom: 0.75rem;
        }
        .preview-dims {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }
        .dim-tag {
          padding: 0.25rem 0.5rem;
          background: rgba(212, 168, 84, 0.1);
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.8);
        }
        .share-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .share-label {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
        }
      `}</style>
    </div>
  );
}

// Quick share for check-in completion
interface QuickShareProps {
  streak?: number;
  milestone?: string;
  onDismiss?: () => void;
  className?: string;
}

export function QuickShare({ streak, milestone, onDismiss, className = '' }: QuickShareProps) {
  const mode = useStore($mode);

  let title: string;
  let description: string;

  if (milestone) {
    title = {
      kasra: `MILESTONE_UNLOCKED: ${milestone}`,
      river: `A new threshold crossed: ${milestone}`,
      sol: `I just unlocked: ${milestone}!`,
    }[mode] || '';
    description = {
      kasra: 'Elder system progression confirmed.',
      river: 'The journey deepens, the pattern unfolds.',
      sol: 'Leveling up my cosmic practice!',
    }[mode] || '';
  } else if (streak) {
    title = {
      kasra: `STREAK_MAINTAINED: ${streak}_DAYS`,
      river: `${streak} days of sacred practice`,
      sol: `${streak} day streak!`,
    }[mode] || '';
    description = {
      kasra: `Continuity confirmed. Pattern coherence improving.`,
      river: `Each day, the pattern grows clearer.`,
      sol: `Keeping my cosmic practice going strong!`,
    }[mode] || '';
  } else {
    title = {
      kasra: 'CHECKIN_COMPLETE',
      river: 'Daily practice complete',
      sol: 'Check-in done!',
    }[mode] || '';
    description = {
      kasra: 'Pattern analysis updated.',
      river: 'Another moment of awareness recorded.',
      sol: 'Staying connected to my patterns.',
    }[mode] || '';
  }

  const content: ShareContent = {
    title,
    description,
    hashtags: ['RealmOfPatterns', streak ? 'Streak' : milestone ? 'Milestone' : 'DailyPractice'],
  };

  return (
    <div className={`quick-share ${className}`}>
      <div className="share-prompt">
        <span className="prompt-text">
          {mode === 'kasra'
            ? 'SHARE_COMPLETION?'
            : mode === 'river'
            ? 'Share your practice?'
            : 'Share your achievement?'}
        </span>
        <button className="dismiss-btn" onClick={onDismiss}>
          {mode === 'kasra' ? 'SKIP' : 'Skip'}
        </button>
      </div>
      <ShareButtons content={content} variant="inline" />

      <style>{`
        .quick-share {
          background: rgba(212, 168, 84, 0.05);
          border: 1px solid rgba(212, 168, 84, 0.15);
          padding: 1rem;
        }
        .share-prompt {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .prompt-text {
          font-size: 0.9rem;
          color: #f0e8d8;
        }
        .dismiss-btn {
          background: transparent;
          border: none;
          color: rgba(240, 232, 216, 0.5);
          font-size: 0.8rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .dismiss-btn:hover {
          color: #d4a854;
        }
      `}</style>
    </div>
  );
}

// Native share (mobile)
interface NativeShareButtonProps {
  content: ShareContent;
  className?: string;
  children?: React.ReactNode;
}

export function NativeShareButton({ content, className = '', children }: NativeShareButtonProps) {
  const mode = useStore($mode);
  const [canShare, setCanShare] = useState(false);

  // Check if Web Share API is available
  if (typeof navigator !== 'undefined') {
    setCanShare(!!navigator.share);
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description,
          url: content.url || window.location.href,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    }
  };

  if (!canShare) return null;

  return (
    <button className={`native-share-btn ${className}`} onClick={handleNativeShare}>
      {children || (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>
            {mode === 'kasra' ? 'SHARE' : mode === 'river' ? 'Share' : 'Share'}
          </span>
        </>
      )}

      <style>{`
        .native-share-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          background: rgba(212, 168, 84, 0.1);
          border: 1px solid rgba(212, 168, 84, 0.2);
          color: #f0e8d8;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .native-share-btn:hover {
          background: rgba(212, 168, 84, 0.15);
          border-color: #d4a854;
        }
      `}</style>
    </button>
  );
}

// Hook for share tracking
export function useShareTracking() {
  const trackShare = (platform: SharePlatform, context: string) => {
    // Store share events for analytics
    const shares = JSON.parse(localStorage.getItem('rop_shares') || '[]');
    shares.push({
      platform,
      context,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 shares
    if (shares.length > 100) shares.length = 100;
    localStorage.setItem('rop_shares', JSON.stringify(shares));
  };

  const getShareStats = () => {
    const shares = JSON.parse(localStorage.getItem('rop_shares') || '[]');
    const byPlatform: Record<string, number> = {};
    shares.forEach((s: { platform: string }) => {
      byPlatform[s.platform] = (byPlatform[s.platform] || 0) + 1;
    });
    return {
      total: shares.length,
      byPlatform,
    };
  };

  return { trackShare, getShareStats };
}
