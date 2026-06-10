import { describe, it, expect } from 'vitest';
import { validatePayload, composeNatalReading } from '../functions/api/openclaw-webhook';

describe('openclaw-webhook validatePayload', () => {
  const base = { channel: 'telegram', userId: '12345' };

  it('rejects non-object bodies', () => {
    expect(validatePayload(null).ok).toBe(false);
    expect(validatePayload('hi').ok).toBe(false);
    expect(validatePayload(42).ok).toBe(false);
  });

  it('requires channel and userId', () => {
    expect(validatePayload({ userId: 'x', message: '/sol' }).ok).toBe(false);
    expect(validatePayload({ channel: 'telegram', message: '/sol' }).ok).toBe(false);
    expect(validatePayload({ channel: '  ', userId: 'x', message: '/sol' }).ok).toBe(false);
  });

  it('requires either birthData or message', () => {
    const r = validatePayload(base);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/birthData|message/);
  });

  it('accepts a daily-reading request with message only', () => {
    const r = validatePayload({ ...base, message: '/sol' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.channel).toBe('telegram');
      expect(r.payload.birthData).toBeUndefined();
    }
  });

  it('accepts a natal request with valid birthData', () => {
    const r = validatePayload({ ...base, birthData: { year: 1990, month: 6, day: 15 } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.birthData).toEqual({ year: 1990, month: 6, day: 15 });
  });

  it('validates birthData ranges', () => {
    expect(validatePayload({ ...base, birthData: { year: 1899, month: 1, day: 1 } }).ok).toBe(false);
    expect(validatePayload({ ...base, birthData: { year: 2101, month: 1, day: 1 } }).ok).toBe(false);
    expect(validatePayload({ ...base, birthData: { year: 1990, month: 0, day: 1 } }).ok).toBe(false);
    expect(validatePayload({ ...base, birthData: { year: 1990, month: 13, day: 1 } }).ok).toBe(false);
    expect(validatePayload({ ...base, birthData: { year: 1990, month: 1, day: 0 } }).ok).toBe(false);
    expect(validatePayload({ ...base, birthData: { year: 1990, month: 1, day: 32 } }).ok).toBe(false);
    expect(validatePayload({ ...base, birthData: { year: '1990', month: 1, day: 1 } }).ok).toBe(false);
  });

  it('trims channel and userId', () => {
    const r = validatePayload({ channel: ' telegram ', userId: ' 99 ', message: '/sol' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.channel).toBe('telegram');
      expect(r.payload.userId).toBe('99');
    }
  });
});

describe('openclaw-webhook composeNatalReading', () => {
  const input = {
    dominantName: 'Awareness',
    dominantSymbol: '♅',
    teaser: 'You sense things before they take shape.',
    archetypeName: 'Rumi',
    archetypeQuote: 'What you seek is seeking you.',
    resonance: 0.853,
  };

  it('includes dimension, teaser, archetype and rounded resonance', () => {
    const text = composeNatalReading(input);
    expect(text).toContain('Awareness');
    expect(text).toContain('♅');
    expect(text).toContain('You sense things before they take shape.');
    expect(text).toContain('Rumi');
    expect(text).toContain('85% match');
    expect(text).toContain('"What you seek is seeking you."');
  });

  it('contains no prescriptive language', () => {
    const text = composeNatalReading(input);
    expect(text.toLowerCase()).not.toContain('you should');
    expect(text.toLowerCase()).not.toContain('you must');
  });
});
