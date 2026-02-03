import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $mode, setEmail as saveUserEmail } from '../../stores';

interface EmailCaptureProps {
  variant?: 'inline' | 'card' | 'minimal';
  headline?: string;
  subheadline?: string;
  className?: string;
  onSuccess?: (email: string) => void;
}

export function EmailCapture({
  variant = 'card',
  headline,
  subheadline,
  className = '',
  onSuccess,
}: EmailCaptureProps) {
  const mode = useStore($mode);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const defaultContent = getDefaultContent(mode);
  const title = headline || defaultContent.headline;
  const subtitle = subheadline || defaultContent.subheadline;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setErrorMsg('Please enter a valid email');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Failed to subscribe');

      // Save email to user store for persistence
      saveUserEmail(email);

      setStatus('success');
      onSuccess?.(email);
    } catch (err) {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className={`email-capture email-capture-${variant} ${className}`}>
        <SuccessMessage mode={mode} />
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <form onSubmit={handleSubmit} className={`email-capture-minimal ${className}`}>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="input flex-1"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '...' : 'Go'}
          </button>
        </div>
        {status === 'error' && (
          <p className="text-red-500 text-sm mt-1">{errorMsg}</p>
        )}
      </form>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`email-capture-inline ${className}`}>
        <p className="mb-2">{subtitle}</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="input flex-1"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending...' : defaultContent.cta}
          </button>
        </form>
        {status === 'error' && (
          <p className="text-red-500 text-sm mt-2">{errorMsg}</p>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`card p-6 email-capture-card ${className}`}>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="opacity-70 mb-4">{subtitle}</p>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="input flex-1"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="btn btn-primary whitespace-nowrap"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sending...' : defaultContent.cta}
          </button>
        </div>
        {status === 'error' && (
          <p className="text-red-500 text-sm mt-2">{errorMsg}</p>
        )}
      </form>

      <p className="text-xs opacity-50 mt-3">
        Free forever. No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}

function getDefaultContent(mode: string) {
  const content = {
    kasra: {
      headline: 'Track Your Patterns',
      subheadline: 'Get daily κ forecasts and optimal window alerts.',
      cta: 'Get Alerts',
    },
    river: {
      headline: 'Receive Daily Wisdom',
      subheadline: 'Let the patterns speak to you each morning.',
      cta: 'Subscribe',
    },
    sol: {
      headline: 'Get Your Daily Forecast',
      subheadline: 'Simple guidance for better days, delivered to your inbox.',
      cta: 'Sign Up Free',
    },
  };
  return content[mode as keyof typeof content] || content.sol;
}

function SuccessMessage({ mode }: { mode: string }) {
  const messages = {
    kasra: {
      icon: '✓',
      title: 'SUBSCRIBED',
      body: 'You will receive daily κ forecasts and alerts.',
    },
    river: {
      icon: '✧',
      title: 'Welcome to the Pattern',
      body: 'The wisdom will find you each morning at dawn.',
    },
    sol: {
      icon: '🎉',
      title: 'You\'re in!',
      body: 'Check your inbox for your first forecast.',
    },
  };
  const msg = messages[mode as keyof typeof messages] || messages.sol;

  return (
    <div className="text-center py-4">
      <div className="text-3xl mb-2">{msg.icon}</div>
      <h4 className="text-lg font-semibold mb-1">{msg.title}</h4>
      <p className="opacity-70">{msg.body}</p>
    </div>
  );
}

export default EmailCapture;
