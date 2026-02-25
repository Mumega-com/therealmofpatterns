'use client';

import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';
import { compute16DFromBirthData } from '../../lib/16d-engine';
import type { BirthData as NatalBirthData } from '../../types';

interface BirthData {
  date: string;
  time: string;
  timeKnown: 'exact' | 'approximate' | 'unknown';
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface OnboardingQuizProps {
  onComplete: (data: BirthData) => void;
  onSkip?: () => void;
}

/**
 * Geocode city + country to lat/lng using OpenStreetMap Nominatim (free, no key required)
 */
async function geocodeLocation(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${city}, ${country}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: { 'User-Agent': 'TheRealmOfPatterns/1.0' },
    });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

const STEP_CONTENT = {
  intro: {
    kasra: {
      title: 'INITIALIZE_VECTOR',
      subtitle: 'Input your birth coordinates to compute your 16D signature.',
      prompt: 'This data calibrates your unique pattern in the cosmic field.',
    },
    river: {
      title: 'Begin Your Reading',
      subtitle: 'The moment you entered this world holds the seed of your pattern.',
      prompt: 'Share your birth moment to unveil what the cosmos encoded in you.',
    },
    sol: {
      title: "Let's Find Your Pattern",
      subtitle: 'Your birthday is the key to understanding your energy.',
      prompt: "This takes 30 seconds. We'll use your birth info to show your unique pattern.",
    },
  },
  date: {
    kasra: {
      title: 'BIRTH_DATE',
      subtitle: 'Input temporal coordinates.',
      label: 'Date of birth',
    },
    river: {
      title: 'The Day You Arrived',
      subtitle: 'When did you cross the threshold into this world?',
      label: 'Your birth date',
    },
    sol: {
      title: 'When were you born?',
      subtitle: 'Your birthday is your starting point.',
      label: 'Birthday',
    },
  },
  time: {
    kasra: {
      title: 'BIRTH_TIME',
      subtitle: 'Time precision affects calculation accuracy.',
      label: 'Time of birth',
      exactLabel: 'Exact time known',
      approxLabel: 'Approximate (±2 hours)',
      unknownLabel: 'Unknown (will use noon)',
    },
    river: {
      title: 'The Hour of Your Becoming',
      subtitle: 'The exact hour reveals the rising pattern.',
      label: 'Time of birth',
      exactLabel: 'I know the exact time',
      approxLabel: 'I know roughly',
      unknownLabel: 'I do not know',
    },
    sol: {
      title: 'What time?',
      subtitle: 'Birth time makes readings more accurate, but we can work without it.',
      label: 'Time',
      exactLabel: 'I know exactly',
      approxLabel: 'Approximately',
      unknownLabel: "I don't know",
    },
  },
  location: {
    kasra: {
      title: 'BIRTH_LOCATION',
      subtitle: 'Geographic coordinates for astronomical calculations.',
      label: 'City/Location',
      countryLabel: 'Country',
    },
    river: {
      title: 'Where the Stars Looked Down',
      subtitle: 'The place where you first breathed determines which stars witnessed your arrival.',
      label: 'Birthplace',
      countryLabel: 'Country',
    },
    sol: {
      title: 'Where were you born?',
      subtitle: 'Your birthplace affects which planets were overhead.',
      label: 'City',
      countryLabel: 'Country',
    },
  },
  complete: {
    kasra: {
      title: 'CALIBRATION_COMPLETE',
      subtitle: 'Vector initialization successful. Ready to compute your 16D signature.',
      prompt: 'Proceed to receive your first pattern analysis.',
    },
    river: {
      title: 'The Pattern is Set',
      subtitle: 'Your cosmic coordinates are captured. The reading awaits.',
      prompt: 'Step forward to receive what the cosmos has written for you.',
    },
    sol: {
      title: "You're All Set!",
      subtitle: 'We have everything we need to show your pattern.',
      prompt: 'Ready to see what makes you unique?',
    },
  },
};

export function OnboardingQuiz({ onComplete, onSkip }: OnboardingQuizProps) {
  const mode = useStore($mode);
  const [step, setStep] = useState<'intro' | 'date' | 'time' | 'location' | 'complete'>('intro');
  const [birthData, setBirthData] = useState<BirthData>({
    date: '',
    time: '12:00',
    timeKnown: 'unknown',
    city: '',
    country: '',
  });

  const content = STEP_CONTENT[step][mode];

  const handleNext = () => {
    const steps: typeof step[] = ['intro', 'date', 'time', 'location', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: typeof step[] = ['intro', 'date', 'time', 'location', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const handleComplete = async () => {
    setIsGeocoding(true);
    setGeocodeError('');

    try {
      // Geocode city + country to get lat/lng
      const coords = await geocodeLocation(birthData.city, birthData.country);

      const updatedBirthData = {
        ...birthData,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };

      if (!coords) {
        setGeocodeError('Could not find location. Please check city and country, or continue without coordinates.');
      }

      // Parse date parts
      const [year, month, day] = birthData.date.split('-').map(Number);
      const [hour, minute] = (birthData.timeKnown === 'unknown' ? '12:00' : birthData.time).split(':').map(Number);

      // Build the natal BirthData in the format the 16D engine expects
      const natalData: NatalBirthData = {
        year,
        month,
        day,
        hour,
        minute,
        latitude: coords?.lat,
        longitude: coords?.lng,
      };

      // Compute natal 16D vector
      const natal16D = compute16DFromBirthData(natalData);

      // Save to all required localStorage keys
      localStorage.setItem('rop_birth_data', JSON.stringify(updatedBirthData));
      localStorage.setItem('rop_birth_data_full', JSON.stringify(natalData));
      localStorage.setItem('rop_natal_16d', JSON.stringify(natal16D));
      localStorage.setItem('rop_quiz_completed', 'true');

      // Also update rop_user for components that check it
      const existingUser = JSON.parse(localStorage.getItem('rop_user') || '{}');
      localStorage.setItem('rop_user', JSON.stringify({
        ...existingUser,
        birthData: {
          date: birthData.date,
          timeRange: birthData.timeKnown === 'unknown' ? null :
            hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening',
          location: coords ? { city: birthData.city, lat: coords.lat, lng: coords.lng } : { city: birthData.city, lat: 0, lng: 0 },
        },
      }));

      onComplete(updatedBirthData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setGeocodeError('Something went wrong. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'intro':
        return true;
      case 'date':
        return birthData.date !== '';
      case 'time':
        return true; // Time is optional
      case 'location':
        return birthData.city !== '' && birthData.country !== '';
      case 'complete':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="quiz-overlay">
      <div className="quiz-container">
        {/* Progress indicator */}
        <div className="quiz-progress">
          {['intro', 'date', 'time', 'location', 'complete'].map((s, i) => (
            <div
              key={s}
              className={`progress-dot ${step === s ? 'active' : ''} ${
                ['intro', 'date', 'time', 'location', 'complete'].indexOf(step) > i ? 'completed' : ''
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="quiz-content">
          <h2 className="quiz-title">{content.title}</h2>
          <p className="quiz-subtitle">{content.subtitle}</p>

          {step === 'intro' && (
            <div className="quiz-intro">
              <div className="intro-icon">&#9788;</div>
              <p className="intro-prompt">{(content as any).prompt}</p>
            </div>
          )}

          {step === 'date' && (
            <div className="quiz-field">
              <label htmlFor="birthDate">{(content as any).label}</label>
              <input
                type="date"
                id="birthDate"
                value={birthData.date}
                onChange={(e) => setBirthData({ ...birthData, date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {step === 'time' && (
            <div className="quiz-time-step">
              <div className="time-options">
                <label className={`time-option ${birthData.timeKnown === 'exact' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="timeKnown"
                    value="exact"
                    checked={birthData.timeKnown === 'exact'}
                    onChange={() => setBirthData({ ...birthData, timeKnown: 'exact' })}
                  />
                  <span>{(content as any).exactLabel}</span>
                </label>
                <label className={`time-option ${birthData.timeKnown === 'approximate' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="timeKnown"
                    value="approximate"
                    checked={birthData.timeKnown === 'approximate'}
                    onChange={() => setBirthData({ ...birthData, timeKnown: 'approximate' })}
                  />
                  <span>{(content as any).approxLabel}</span>
                </label>
                <label className={`time-option ${birthData.timeKnown === 'unknown' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="timeKnown"
                    value="unknown"
                    checked={birthData.timeKnown === 'unknown'}
                    onChange={() => setBirthData({ ...birthData, timeKnown: 'unknown' })}
                  />
                  <span>{(content as any).unknownLabel}</span>
                </label>
              </div>

              {birthData.timeKnown !== 'unknown' && (
                <div className="quiz-field">
                  <label htmlFor="birthTime">{(content as any).label}</label>
                  <input
                    type="time"
                    id="birthTime"
                    value={birthData.time}
                    onChange={(e) => setBirthData({ ...birthData, time: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {step === 'location' && (
            <div className="quiz-location">
              <div className="quiz-field">
                <label htmlFor="birthCity">{(content as any).label}</label>
                <input
                  type="text"
                  id="birthCity"
                  value={birthData.city}
                  onChange={(e) => setBirthData({ ...birthData, city: e.target.value })}
                  placeholder={mode === 'kasra' ? 'Enter city name' : mode === 'river' ? 'Where were you born?' : 'City name'}
                />
              </div>
              <div className="quiz-field">
                <label htmlFor="birthCountry">{(content as any).countryLabel}</label>
                <input
                  type="text"
                  id="birthCountry"
                  value={birthData.country}
                  onChange={(e) => setBirthData({ ...birthData, country: e.target.value })}
                  placeholder={mode === 'kasra' ? 'Country code or name' : 'Country'}
                />
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="quiz-complete">
              <div className="complete-icon">&#10003;</div>
              <p className="complete-prompt">{(content as any).prompt}</p>
              <div className="complete-summary">
                <div className="summary-item">
                  <span className="summary-label">Date:</span>
                  <span className="summary-value">{birthData.date}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Time:</span>
                  <span className="summary-value">
                    {birthData.timeKnown === 'unknown' ? '12:00 (noon)' : birthData.time}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Location:</span>
                  <span className="summary-value">{birthData.city}, {birthData.country}</span>
                </div>
              </div>
              {geocodeError && (
                <p className="geocode-warning">{geocodeError}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="quiz-actions">
          {step !== 'intro' && step !== 'complete' && (
            <button onClick={handleBack} className="quiz-btn secondary">
              {mode === 'kasra' ? 'BACK' : mode === 'river' ? 'Return' : 'Back'}
            </button>
          )}

          {step === 'intro' && onSkip && (
            <button onClick={onSkip} className="quiz-btn secondary">
              {mode === 'kasra' ? 'SKIP' : mode === 'river' ? 'Perhaps Later' : 'Skip for now'}
            </button>
          )}

          {step !== 'complete' ? (
            <button
              onClick={handleNext}
              className="quiz-btn primary"
              disabled={!canProceed()}
            >
              {mode === 'kasra' ? 'PROCEED' : mode === 'river' ? 'Continue' : 'Next'}
            </button>
          ) : (
            <button onClick={handleComplete} className="quiz-btn primary" disabled={isGeocoding}>
              {isGeocoding
                ? (mode === 'kasra' ? 'COMPUTING...' : mode === 'river' ? 'Weaving...' : 'Computing...')
                : (mode === 'kasra' ? 'COMPUTE_SIGNATURE' : mode === 'river' ? 'Receive My Reading' : 'See My Pattern')
              }
            </button>
          )}
        </div>
      </div>

      <style>{`
        .quiz-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 9, 8, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 50;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .quiz-container {
          background: #141210;
          border: 1px solid rgba(212, 168, 84, 0.2);
          width: 100%;
          max-width: 480px;
          padding: 2rem;
        }

        .quiz-progress {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(212, 168, 84, 0.2);
          transition: all 0.3s;
        }

        .progress-dot.active {
          background: #d4a854;
          transform: scale(1.25);
        }

        .progress-dot.completed {
          background: #d4a854;
        }

        .quiz-content {
          text-align: center;
          margin-bottom: 2rem;
        }

        .quiz-title {
          font-size: 1.5rem;
          color: #d4a854;
          margin-bottom: 0.5rem;
          font-weight: 400;
        }

        .quiz-subtitle {
          font-size: 0.95rem;
          color: rgba(240, 232, 216, 0.7);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .quiz-intro .intro-icon {
          font-size: 4rem;
          color: #d4a854;
          margin-bottom: 1rem;
        }

        .intro-prompt {
          font-size: 1rem;
          color: rgba(240, 232, 216, 0.8);
          line-height: 1.6;
        }

        .quiz-field {
          text-align: left;
          margin-bottom: 1rem;
        }

        .quiz-field label {
          display: block;
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
          margin-bottom: 0.5rem;
        }

        .quiz-field input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: #0a0908;
          border: 1px solid rgba(212, 168, 84, 0.2);
          color: #f0e8d8;
          font-size: 1rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .quiz-field input:focus {
          outline: none;
          border-color: #d4a854;
        }

        .quiz-field input::placeholder {
          color: rgba(240, 232, 216, 0.3);
        }

        .time-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .time-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: #0a0908;
          border: 1px solid rgba(212, 168, 84, 0.15);
          cursor: pointer;
          transition: all 0.2s;
        }

        .time-option:hover {
          border-color: rgba(212, 168, 84, 0.3);
        }

        .time-option.selected {
          border-color: #d4a854;
          background: rgba(212, 168, 84, 0.1);
        }

        .time-option input {
          display: none;
        }

        .time-option span {
          color: rgba(240, 232, 216, 0.8);
          font-size: 0.95rem;
        }

        .quiz-complete .complete-icon {
          font-size: 3rem;
          color: #22c55e;
          margin-bottom: 1rem;
        }

        .complete-prompt {
          font-size: 1rem;
          color: rgba(240, 232, 216, 0.8);
          margin-bottom: 1.5rem;
        }

        .complete-summary {
          text-align: left;
          background: rgba(212, 168, 84, 0.05);
          padding: 1rem;
          border-left: 3px solid #d4a854;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(212, 168, 84, 0.1);
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          color: rgba(240, 232, 216, 0.6);
          font-size: 0.85rem;
        }

        .summary-value {
          color: #f0e8d8;
          font-size: 0.9rem;
        }

        .quiz-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }

        .quiz-btn {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quiz-btn.primary {
          background: #d4a854;
          color: #0a0908;
          border: none;
        }

        .quiz-btn.primary:hover:not(:disabled) {
          background: #e5b964;
        }

        .quiz-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quiz-btn.secondary {
          background: transparent;
          color: rgba(240, 232, 216, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.2);
        }

        .quiz-btn.secondary:hover {
          color: #f0e8d8;
          border-color: rgba(212, 168, 84, 0.4);
        }

        .geocode-warning {
          margin-top: 1rem;
          padding: 0.75rem;
          font-size: 0.8rem;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.1);
          border-left: 3px solid #fbbf24;
        }

        @media (max-width: 480px) {
          .quiz-container {
            padding: 1.5rem;
          }

          .quiz-title {
            font-size: 1.25rem;
          }

          .quiz-actions {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </div>
  );
}

// Hook to check if quiz should be shown
export function useOnboardingQuiz() {
  const [shouldShow, setShouldShow] = useState(false);
  const [birthData, setBirthData] = useState<BirthData | null>(null);

  const checkQuizStatus = () => {
    const completed = localStorage.getItem('rop_quiz_completed');
    const storedData = localStorage.getItem('rop_birth_data');

    if (completed && storedData) {
      setBirthData(JSON.parse(storedData));
      setShouldShow(false);
    } else {
      setShouldShow(true);
    }
  };

  const completeQuiz = (data: BirthData) => {
    setBirthData(data);
    setShouldShow(false);
  };

  const resetQuiz = () => {
    localStorage.removeItem('rop_quiz_completed');
    localStorage.removeItem('rop_birth_data');
    setBirthData(null);
    setShouldShow(true);
  };

  return { shouldShow, birthData, checkQuizStatus, completeQuiz, resetQuiz };
}
