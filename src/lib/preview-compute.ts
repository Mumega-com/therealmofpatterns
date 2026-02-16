/**
 * Client-side preview computation wrapper
 * Provides instant 8D preview without API dependency
 */

import { computeFromBirthData, getDominant, getDimensionTeaser } from './16d-engine';
import type { BirthData, DimensionInfo } from '../types';
import { DIMENSION_METADATA } from '../types';

export interface LocalPreviewResult {
  vector: number[];
  dominant: DimensionInfo;
  teaser: string;
  dimensions: Array<{
    index: number;
    symbol: string;
    name: string;
    domain: string;
    value: number;
  }>;
}

export interface ArchetypeMatch {
  name: string;
  era: string;
  culture?: string;
  domains?: string[];
  quote: string;
  resonance: number;
}

export function computeLocalPreview(birthData: BirthData): LocalPreviewResult {
  const vector = computeFromBirthData(birthData);
  const dominant = getDominant(vector);
  const teaser = getDimensionTeaser(dominant);

  const dimensions = DIMENSION_METADATA.map((meta, i) => ({
    index: meta.index,
    symbol: meta.symbol,
    name: meta.name,
    domain: meta.domain,
    value: Math.round(vector[i] * 100) / 100,
  }));

  return { vector: Array.from(vector), dominant, teaser, dimensions };
}

export async function fetchArchetype(birthData: BirthData): Promise<ArchetypeMatch | null> {
  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth_data: birthData }),
    });

    if (!res.ok) return null;

    const data: Record<string, unknown> = await res.json();
    return (data.archetype as ArchetypeMatch) || null;
  } catch {
    return null;
  }
}
