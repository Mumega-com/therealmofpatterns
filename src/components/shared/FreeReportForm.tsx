'use client';

import { useEffect, useState } from 'react';

interface SubmitResponse {
  success: boolean;
  report_id?: string;
  permalink?: string;
  error?: { code: string; message: string };
}

interface FormData {
  year: string;
  month: string;
  day: string;
  timeKnown: 'known' | 'unknown';
  hour: string;
  minute: string;
  city: string;
  email: string;
}

const INITIAL: FormData = {
  year: '',
  month: '',
  day: '',
  timeKnown: 'unknown',
  hour: '12',
  minute: '00',
  city: '',
  email: '',
};

const LOADING_LINES = [
  'Reading your planetary field…',
  'Mapping your 16 dimensions…',
  'Matching your pattern against 200 historical figures…',
  'Finding your archetype…',
  'Writing your oracle sentence…',
];

function isValidEmail(email: string): boolean {
  if (!email) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidForm(f: FormData): boolean {
  if (!f.year || !f.month || !f.day) return false;
  const y = Number(f.year), m = Number(f.month), d = Number(f.day);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (!isValidEmail(f.email)) return false;
  return true;
}

export function FreeReportForm({ referrerCode = null as string | null }) {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLineIdx, setLoadingLineIdx] = useState(0);

  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setLoadingLineIdx(idx => Math.min(idx + 1, LOADING_LINES.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [submitting]);

  const update = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidForm(form)) {
      setError('Please fill in your birth date correctly.');
      return;
    }

    setError(null);
    setSubmitting(true);
    setLoadingLineIdx(0);

    try {
      const birth_date = `${form.year}-${form.month.padStart(2, '0')}-${form.day.padStart(2, '0')}`;
      const birth_time = form.timeKnown === 'known'
        ? `${form.hour.padStart(2, '0')}:${form.minute.padStart(2, '0')}`
        : null;

      const res = await fetch('/api/archetype-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_date,
          birth_time,
          birth_location: form.city ? { name: form.city } : null,
          email: form.email || null,
          referrer_code: referrerCode,
          language: 'en',
        }),
      });

      const data = await res.json() as SubmitResponse;
      if (!data.success || !data.permalink) {
        throw new Error(data.error?.message || 'Something went wrong. Please try again.');
      }
      window.location.href = data.permalink;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="free-report-loading" aria-live="polite">
        <div className="orbit">
          <div className="orbit-dot" />
        </div>
        <p className="loading-line">{LOADING_LINES[loadingLineIdx]}</p>
        <p className="loading-sub">Your report is computing. About 20–30 seconds.</p>
      </div>
    );
  }

  return (
    <form className="free-report-form" onSubmit={onSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="birth-year">Birth date</label>
        <div className="date-row">
          <input
            id="birth-year" type="number" inputMode="numeric" placeholder="YYYY"
            min={1900} max={2100} value={form.year} onChange={update('year')} required
          />
          <input
            type="number" inputMode="numeric" placeholder="MM"
            min={1} max={12} value={form.month} onChange={update('month')} required
          />
          <input
            type="number" inputMode="numeric" placeholder="DD"
            min={1} max={31} value={form.day} onChange={update('day')} required
          />
        </div>
      </div>

      <fieldset className="field-group time-known">
        <legend>Do you know your birth time?</legend>
        <label className="radio">
          <input
            type="radio" name="timeKnown" value="unknown"
            checked={form.timeKnown === 'unknown'} onChange={update('timeKnown')}
          />
          <span>No / Not sure — use noon</span>
        </label>
        <label className="radio">
          <input
            type="radio" name="timeKnown" value="known"
            checked={form.timeKnown === 'known'} onChange={update('timeKnown')}
          />
          <span>Yes, I know it</span>
        </label>
      </fieldset>

      {form.timeKnown === 'known' && (
        <div className="field-group time-row">
          <label>Time</label>
          <div className="time-inputs">
            <input
              type="number" inputMode="numeric" placeholder="HH"
              min={0} max={23} value={form.hour} onChange={update('hour')}
            />
            <span className="sep">:</span>
            <input
              type="number" inputMode="numeric" placeholder="MM"
              min={0} max={59} value={form.minute} onChange={update('minute')}
            />
          </div>
        </div>
      )}

      <div className="field-group">
        <label htmlFor="birth-city">Birth city (optional)</label>
        <input
          id="birth-city" type="text" placeholder="e.g. Lisbon, Portugal"
          value={form.city} onChange={update('city')}
        />
      </div>

      <div className="field-group">
        <label htmlFor="email">Email (optional — we'll send you the link)</label>
        <input
          id="email" type="email" inputMode="email" placeholder="you@example.com"
          value={form.email} onChange={update('email')}
        />
      </div>

      {error && <p className="error-msg" role="alert">{error}</p>}

      <button type="submit" className="submit-btn" disabled={!isValidForm(form)}>
        Read my pattern →
      </button>

      <p className="fine-print">
        Free. No account required. Your report is permanent and yours to share.
      </p>
    </form>
  );
}
