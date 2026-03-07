/**
 * AuthGate — wraps content that requires a session.
 *
 * - Checks /api/auth/me on mount
 * - If authenticated: renders children, calls onAuth(session)
 * - If not: shows email input → sends magic link → shows "check email" state
 */
import { useState, useEffect } from 'react';

interface Session {
  authenticated: true;
  email_hash: string;
  isPro: boolean;
  plan: string;
}

interface AuthGateProps {
  children: React.ReactNode;
  onAuth?: (session: Session) => void;
  /** If true, renders children anyway but still calls onAuth when session found */
  softGate?: boolean;
}

type GateState = 'loading' | 'authed' | 'input' | 'sending' | 'sent' | 'error';

export default function AuthGate({ children, onAuth, softGate = false }: AuthGateProps) {
  const [state, setState] = useState<GateState>('loading');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Pre-fill email from localStorage if available
    const stored = localStorage.getItem('rop_reminder_email') || '';
    if (stored) setEmail(stored);

    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then((data: any) => {
        if (data.authenticated) {
          setState('authed');
          onAuth?.(data as Session);
          // Keep localStorage in sync
          const user = JSON.parse(localStorage.getItem('rop_user') || '{}');
          user.isPro = data.isPro;
          localStorage.setItem('rop_user', JSON.stringify(user));
          localStorage.setItem('rop_subscription_tier', data.plan);
        } else {
          setState('input');
        }
      })
      .catch(() => setState('input'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;

    setState('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, redirect: window.location.pathname }),
      });
      const data = await res.json() as { success: boolean; error?: string };

      if (data.success) {
        localStorage.setItem('rop_reminder_email', trimmed);
        setState('sent');
      } else {
        setErrorMsg(data.error || 'Something went wrong.');
        setState('error');
      }
    } catch {
      setErrorMsg('Could not send. Check your connection.');
      setState('error');
    }
  }

  // Always render children in soft-gate mode
  if (softGate && state !== 'loading') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <div className="auth-gate-loading">
        <span className="auth-gate-spinner" />
      </div>
    );
  }

  if (state === 'authed') {
    return <>{children}</>;
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-inner">
        <span className="auth-gate-icon">◎</span>

        {(state === 'input' || state === 'sending' || state === 'error') && (
          <>
            <h2>Enter the field</h2>
            <p>Your practice lives here. Enter your email to begin or continue across any device.</p>

            <form onSubmit={handleSubmit} className="auth-gate-form">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={state === 'sending'}
                autoFocus
                required
              />
              <button type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send my link →'}
              </button>
            </form>

            {state === 'error' && (
              <p className="auth-gate-error">{errorMsg}</p>
            )}

            <p className="auth-gate-note">
              No password. One click and you're in.
            </p>
          </>
        )}

        {state === 'sent' && (
          <>
            <h2>Check your email</h2>
            <p>
              A link is on its way to <strong>{email}</strong>.
              <br />Click it to enter — it expires in 15 minutes.
            </p>
            <p className="auth-gate-note">
              Can't find it? Check your spam folder.
            </p>
            <button
              className="auth-gate-resend"
              onClick={() => setState('input')}
            >
              Try a different email
            </button>
          </>
        )}
      </div>

      <style>{`
        .auth-gate-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 40vh;
        }
        .auth-gate-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(212,168,84,0.2);
          border-top-color: rgba(212,168,84,0.7);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .auth-gate {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          color: #f0e8d8;
        }
        .auth-gate-inner {
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .auth-gate-icon {
          display: block;
          font-size: 2rem;
          color: rgba(212,168,84,0.5);
          margin-bottom: 1.5rem;
        }
        .auth-gate h2 {
          font-size: 1.75rem;
          font-weight: 300;
          margin: 0 0 0.75rem;
        }
        .auth-gate p {
          font-size: 0.95rem;
          color: rgba(240,232,216,0.6);
          line-height: 1.7;
          margin: 0 0 1.5rem;
        }
        .auth-gate-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .auth-gate-form input {
          background: rgba(240,232,216,0.05);
          border: 1px solid rgba(212,168,84,0.25);
          color: #f0e8d8;
          padding: 0.75rem 1rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        .auth-gate-form input:focus {
          border-color: rgba(212,168,84,0.6);
        }
        .auth-gate-form input::placeholder {
          color: rgba(240,232,216,0.3);
        }
        .auth-gate-form button {
          background: #d4a854;
          color: #0a0908;
          border: none;
          padding: 0.75rem 1.5rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.02em;
        }
        .auth-gate-form button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .auth-gate-note {
          font-size: 0.8rem !important;
          color: rgba(240,232,216,0.35) !important;
          margin-top: 0.5rem !important;
        }
        .auth-gate-error {
          color: rgba(255,100,100,0.8) !important;
          font-size: 0.85rem !important;
        }
        .auth-gate-resend {
          background: none;
          border: none;
          color: rgba(212,168,84,0.6);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.9rem;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          margin-top: 1rem;
        }
        .auth-gate p strong {
          color: rgba(240,232,216,0.88);
        }
      `}</style>
    </div>
  );
}
