'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $user, setBirthData } from '../../stores/user';
import { $mode } from '../../stores';
import { compute16DFromBirthData } from '../../lib/16d-engine';
import { resolveLocation } from '../../lib/geocoding';
import type { BirthData } from '../../types';

interface BirthDataPromptProps {
  /** When to show: 'after-checkin' (gentle), 'before-checkin' (blocking) */
  timing?: 'after-checkin' | 'before-checkin';
  /** Start with form expanded (skip collapsed teaser) */
  autoExpand?: boolean;
  /** Callback when birth data is saved */
  onComplete?: (birthData: BirthData, natal16D: number[]) => void;
  /** Callback when user skips */
  onSkip?: () => void;
}

/**
 * BirthDataPrompt - Collects birth data for personalized predictions
 *
 * Shows mode-appropriate messaging and stores both birth data and computed natal vector.
 */
export function BirthDataPrompt({ timing = 'after-checkin', autoExpand = false, onComplete, onSkip }: BirthDataPromptProps) {
  const user = useStore($user);
  const mode = useStore($mode);

  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [formData, setFormData] = useState({
    year: '',
    month: '',
    day: '',
    hour: '12',
    minute: '0',
    timeKnown: 'approximate' as 'exact' | 'approximate' | 'unknown',
    city: '',
    country: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    // Don't show if user already has birth data
    if (user.birthData) return;

    // Check if user has dismissed before
    const dismissed = localStorage.getItem('rop_birth_prompt_dismissed');
    const dismissedAt = dismissed ? new Date(dismissed) : null;

    // Show again after 7 days if dismissed
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // For after-checkin timing, check if they've done enough check-ins
    if (timing === 'after-checkin') {
      const history = localStorage.getItem('rop_checkin_history');
      if (history) {
        const { entries } = JSON.parse(history);
        // Show after 2nd check-in
        if (entries?.length >= 2) {
          setTimeout(() => setIsVisible(true), 1500);
        }
      }
    } else {
      // before-checkin: show immediately
      setIsVisible(true);
    }
  }, [user.birthData, timing]);

  const handleDismiss = () => {
    localStorage.setItem('rop_birth_prompt_dismissed', new Date().toISOString());
    setIsVisible(false);
    onSkip?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse form data into BirthData
      const birthData: BirthData = {
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: formData.timeKnown !== 'unknown' ? parseInt(formData.hour) : 12,
        minute: formData.timeKnown !== 'unknown' ? parseInt(formData.minute) : 0,
      };

      // Resolve location: geocode + timezone + UTC offset
      let lat = 0, lng = 0, timezone = 'UTC', utcOffset = 0;
      if (formData.city && formData.country) {
        const geo = await resolveLocation(
          formData.city, formData.country,
          birthData.year, birthData.month, birthData.day, birthData.hour ?? 12,
        );
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          timezone = geo.timezone;
          utcOffset = geo.utcOffset;
          birthData.latitude = lat;
          birthData.longitude = lng;
          birthData.timezone_offset = utcOffset;
        }
      }

      // Compute natal 16D vector with correct timezone
      const natal16D = compute16DFromBirthData(birthData);

      // Store birth data in user store
      setBirthData({
        date: `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`,
        timeRange: formData.timeKnown === 'unknown' ? null :
          parseInt(formData.hour) < 6 ? 'night' :
          parseInt(formData.hour) < 12 ? 'morning' :
          parseInt(formData.hour) < 18 ? 'afternoon' : 'evening',
        location: formData.city ? { city: `${formData.city}, ${formData.country}`, lat, lng, timezone } : null,
      });

      // Store natal vector and full birth data
      localStorage.setItem('rop_natal_16d', JSON.stringify(natal16D));
      localStorage.setItem('rop_birth_data_full', JSON.stringify(birthData));

      setIsVisible(false);
      onComplete?.(birthData, natal16D);
    } catch (error) {
      console.error('Error computing natal chart:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  // Mode-specific content
  const defaultContent = {
    title: 'When were you born?',
    subtitle: 'This helps us give you way more accurate predictions',
    benefit: 'Get personalized best-time alerts',
    skipText: 'Maybe later',
    submitText: 'Save & Continue',
  };

  const modeContent: Record<string, typeof defaultContent> = {
    kasra: {
      title: 'INITIALIZE_NATAL_MATRIX',
      subtitle: 'Input birth parameters for calibrated predictions',
      benefit: 'Accuracy improves 40% with natal data',
      skipText: 'SKIP_CALIBRATION',
      submitText: 'COMPUTE_NATAL_VECTOR',
    },
    river: {
      title: 'Your Birth Signature',
      subtitle: 'The stars that witnessed your arrival hold keys to your pattern',
      benefit: 'Personalized timing windows await',
      skipText: 'Not now',
      submitText: 'Reveal My Chart',
    },
    sol: defaultContent,
  };

  const content = modeContent[mode] || defaultContent;

  return (
    <div className={`birth-prompt ${timing} ${isExpanded ? 'expanded' : ''}`}>
      <div className="prompt-card">
        {!isExpanded ? (
          // Collapsed view - teaser
          <>
            <div className="prompt-header">
              <span className="prompt-icon">
                {mode === 'kasra' ? '⌘' : mode === 'river' ? '✧' : '✨'}
              </span>
              <div className="prompt-text">
                <h4>{content.title}</h4>
                <p>{content.benefit}</p>
              </div>
            </div>
            <div className="prompt-actions">
              <button className="btn-skip" onClick={handleDismiss}>
                {content.skipText}
              </button>
              <button className="btn-expand" onClick={() => setIsExpanded(true)}>
                {mode === 'kasra' ? 'ENTER_DATA' : mode === 'river' ? 'Begin' : 'Add Birthday'}
              </button>
            </div>
          </>
        ) : (
          // Expanded view - form
          <>
            <button className="close-btn" onClick={() => setIsExpanded(false)}>×</button>

            <div className="form-header">
              <h3>{content.title}</h3>
              <p>{content.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="1990"
                    min="1900"
                    max={new Date().getFullYear()}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    required
                  >
                    <option value="">--</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('en', { month: 'short' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Day</label>
                  <input
                    type="number"
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    placeholder="15"
                    min="1"
                    max="31"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group time-group">
                  <label>Birth Time (optional)</label>
                  <div className="time-inputs">
                    <input
                      type="number"
                      value={formData.hour}
                      onChange={(e) => setFormData({ ...formData, hour: e.target.value })}
                      placeholder="12"
                      min="0"
                      max="23"
                      disabled={formData.timeKnown === 'unknown'}
                    />
                    <span>:</span>
                    <input
                      type="number"
                      value={formData.minute}
                      onChange={(e) => setFormData({ ...formData, minute: e.target.value })}
                      placeholder="00"
                      min="0"
                      max="59"
                      disabled={formData.timeKnown === 'unknown'}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Time Accuracy</label>
                  <select
                    value={formData.timeKnown}
                    onChange={(e) => setFormData({ ...formData, timeKnown: e.target.value as typeof formData.timeKnown })}
                  >
                    <option value="exact">Exact (from certificate)</option>
                    <option value="approximate">Approximate</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    {mode === 'kasra' ? 'BIRTH_CITY' : mode === 'river' ? 'Birthplace' : 'City'}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={mode === 'kasra' ? 'Enter city' : 'City name'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    {mode === 'kasra' ? 'COUNTRY' : 'Country'}
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    required
                  />
                </div>
              </div>

              <div className="form-hint">
                {mode === 'kasra'
                  ? 'Location + time precision affect house calculations. Unknown time = 12:00 default.'
                  : mode === 'river'
                  ? "Your birthplace determines which stars were overhead. If you don't know your exact time, we'll work with what the cosmos remembers."
                  : "Your birthplace affects which planets were above the horizon. Don't know your exact time? No worries — we'll use noon."}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleDismiss}>
                  {content.skipText}
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Computing...' : content.submitText}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <style>{`
        .birth-prompt {
          margin: 1.5rem 0;
          animation: slide-up 0.5s ease-out;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .prompt-card {
          position: relative;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 16px;
          padding: 1.25rem;
        }

        .birth-prompt.before-checkin .prompt-card {
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.15) 0%, rgba(147, 51, 234, 0.08) 100%);
          border-color: rgba(212, 168, 84, 0.3);
        }

        /* Collapsed view */
        .prompt-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .prompt-icon {
          font-size: 1.5rem;
          color: #d4a854;
        }

        .prompt-text h4 {
          font-size: 1rem;
          font-weight: 500;
          color: #f0e8d8;
          margin: 0 0 0.25rem;
        }

        .prompt-text p {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
          margin: 0;
        }

        .prompt-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn-skip, .btn-expand, .btn-cancel, .btn-submit {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-skip, .btn-cancel {
          background: transparent;
          border: 1px solid rgba(240, 232, 216, 0.2);
          color: rgba(240, 232, 216, 0.6);
        }

        .btn-skip:hover, .btn-cancel:hover {
          border-color: rgba(240, 232, 216, 0.4);
          color: rgba(240, 232, 216, 0.8);
        }

        .btn-expand, .btn-submit {
          background: rgba(212, 168, 84, 0.2);
          border: 1px solid rgba(212, 168, 84, 0.3);
          color: #d4a854;
        }

        .btn-expand:hover, .btn-submit:hover:not(:disabled) {
          background: rgba(212, 168, 84, 0.3);
          border-color: #d4a854;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Expanded view */
        .close-btn {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          width: 28px;
          height: 28px;
          background: rgba(240, 232, 216, 0.1);
          border: none;
          border-radius: 50%;
          color: rgba(240, 232, 216, 0.5);
          font-size: 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(240, 232, 216, 0.2);
          color: rgba(240, 232, 216, 0.8);
        }

        .form-header {
          margin-bottom: 1.25rem;
        }

        .form-header h3 {
          font-size: 1.1rem;
          font-weight: 500;
          color: #f0e8d8;
          margin: 0 0 0.5rem;
        }

        .form-header p {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.6);
          margin: 0;
        }

        .form-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.5);
          margin-bottom: 0.35rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.6rem;
          background: rgba(10, 9, 8, 0.5);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 6px;
          color: #f0e8d8;
          font-size: 0.95rem;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: rgba(212, 168, 84, 0.5);
        }

        .form-group input:disabled {
          opacity: 0.5;
        }

        .time-group .time-inputs {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .time-group .time-inputs input {
          width: 60px;
          text-align: center;
        }

        .time-group .time-inputs span {
          color: rgba(240, 232, 216, 0.5);
        }

        .form-hint {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
          margin-bottom: 1.25rem;
          padding: 0.75rem;
          background: rgba(10, 9, 8, 0.3);
          border-radius: 6px;
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        /* Mode-specific styles */
        [data-mode="kasra"] .prompt-card {
          border-color: rgba(34, 211, 238, 0.2);
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%);
        }

        [data-mode="kasra"] .prompt-icon,
        [data-mode="kasra"] .form-header h3 {
          color: #22d3ee;
        }

        [data-mode="kasra"] .btn-expand,
        [data-mode="kasra"] .btn-submit {
          background: rgba(34, 211, 238, 0.15);
          border-color: rgba(34, 211, 238, 0.3);
          color: #22d3ee;
        }

        [data-mode="river"] .prompt-card {
          border-color: rgba(167, 139, 250, 0.2);
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%);
        }

        [data-mode="river"] .prompt-icon,
        [data-mode="river"] .form-header h3 {
          color: #a78bfa;
        }

        [data-mode="river"] .btn-expand,
        [data-mode="river"] .btn-submit {
          background: rgba(167, 139, 250, 0.15);
          border-color: rgba(167, 139, 250, 0.3);
          color: #a78bfa;
        }

        @media (max-width: 480px) {
          .form-row {
            flex-direction: column;
          }

          .time-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
