'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';
import { BirthDataPrompt } from '../shared/BirthDataPrompt';
import { PreviewResult } from './PreviewResult';
import { computeLocalPreview, fetchArchetype } from '../../lib/preview-compute';
import type { LocalPreviewResult, ArchetypeMatch } from '../../lib/preview-compute';
import type { BirthData } from '../../types';

type FlowState = 'birth-input' | 'preview';

export function DiscoverFlow() {
  const mode = useStore($mode);
  const [state, setState] = useState<FlowState>('birth-input');
  const [preview, setPreview] = useState<LocalPreviewResult | null>(null);
  const [archetype, setArchetype] = useState<ArchetypeMatch | null>(null);
  const [archetypeLoading, setArchetypeLoading] = useState(false);

  // Check for existing birth data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rop_birth_data_full');
      if (stored) {
        const birthData: BirthData = JSON.parse(stored);
        const result = computeLocalPreview(birthData);
        setPreview(result);
        setState('preview');
        loadArchetype(birthData);
      }
    } catch {
      // No stored data or parse error — start fresh
    }
  }, []);

  function loadArchetype(birthData: BirthData) {
    setArchetypeLoading(true);
    fetchArchetype(birthData)
      .then((match) => setArchetype(match))
      .finally(() => setArchetypeLoading(false));
  }

  function handleBirthDataComplete(birthData: BirthData, _natal16D: number[]) {
    const result = computeLocalPreview(birthData);
    setPreview(result);
    setState('preview');
    loadArchetype(birthData);
  }

  function handleSkip() {
    window.location.href = `/${mode}/checkin`;
  }

  function handleContinueToCheckin() {
    window.location.href = `/${mode}/checkin`;
  }

  return (
    <div className="discover-flow">
      {state === 'birth-input' && (
        <div className="discover-birth-input">
          <div className="discover-intro">
            <h1 className="discover-title">
              {mode === 'kasra' ? 'INITIALIZE_PATTERN_SCAN' : mode === 'river' ? 'The Stars Remember' : 'Discover Your Pattern'}
            </h1>
            <p className="discover-subtitle">
              {mode === 'kasra'
                ? 'Input natal parameters to compute your 8-dimensional identity vector.'
                : mode === 'river'
                ? 'Share the moment you arrived, and the cosmos will reveal your signature.'
                : 'Enter your birthday and instantly see your unique cosmic pattern. Takes 30 seconds.'}
            </p>
          </div>

          <BirthDataPrompt
            timing="before-checkin"
            autoExpand={true}
            onComplete={handleBirthDataComplete}
            onSkip={handleSkip}
          />

          <p className="discover-privacy">
            {mode === 'kasra' ? 'DATA_LOCAL_ONLY // NO_SERVER_STORAGE' : 'Your data stays on your device. Always.'}
          </p>
        </div>
      )}

      {state === 'preview' && preview && (
        <PreviewResult
          preview={preview}
          archetype={archetype}
          archetypeLoading={archetypeLoading}
          onContinueToCheckin={handleContinueToCheckin}
        />
      )}

      <style>{`
        .discover-flow {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2rem 0;
        }

        .discover-birth-input {
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
          animation: fade-up 0.5s ease-out;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .discover-intro {
          text-align: center;
          margin-bottom: 2rem;
        }

        .discover-title {
          font-size: 2rem;
          font-weight: 400;
          color: #d4a854;
          margin: 0 0 0.75rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        [data-mode="kasra"] .discover-title {
          font-family: 'Geist Mono', monospace;
          font-size: 1.5rem;
          color: #22d3ee;
        }

        [data-mode="river"] .discover-title {
          color: #a78bfa;
        }

        .discover-subtitle {
          font-size: 1rem;
          color: rgba(240, 232, 216, 0.6);
          line-height: 1.6;
          margin: 0;
          max-width: 400px;
          margin: 0 auto;
        }

        .discover-privacy {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.3);
          margin-top: 1.5rem;
        }

        @media (max-width: 480px) {
          .discover-title {
            font-size: 1.5rem;
          }

          .discover-birth-input {
            padding: 0 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
