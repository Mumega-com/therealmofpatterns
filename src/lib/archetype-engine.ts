/**
 * Archetype Engine
 *
 * Maps an 8D natal vector to a Hero's Journey archetype.
 * Each person's dominant dimension determines their primary archetype,
 * and their weakest dimension reveals their shadow challenge.
 */

import { DIMENSION_METADATA } from '../types';

// ============================================
// Types
// ============================================

export interface Archetype {
  id: string;
  name: string;
  title: string;          // "The Sage", "The Warrior", etc.
  dimensionIndex: number; // Which dimension this archetype maps to
  planet: string;
  element: string;
  gift: string;           // What this archetype brings
  shadow: string;         // The dark side of this archetype
  shadowName: string;     // Short name for the shadow
  quest: string;          // The core tension of their journey
  quote: string;
  quoteAuthor: string;
}

export interface ArchetypeResult {
  primary: Archetype;
  shadow: Archetype;            // The archetype of their weakest dimension
  dominantIndex: number;
  dominantValue: number;
  weakestIndex: number;
  weakestValue: number;
  secondaryIndex: number;       // Second strongest — adds nuance
  profileShape: 'spike' | 'balanced' | 'split'; // How their energy is distributed
}

export interface JourneyStageContent {
  intro: string;          // Day 1: archetype reveal
  strength: string;       // Day 3: dominant dimension deep-dive
  shadowTeaser: string;   // Day 7: hint at the shadow
  shadowReveal: string;   // Day 14: full shadow exploration
}

// ============================================
// The Eight Archetypes
// ============================================

export const ARCHETYPES: Archetype[] = [
  {
    id: 'hero',
    name: 'Hero',
    title: 'The Hero',
    dimensionIndex: 0,
    planet: 'Sun',
    element: 'Fire',
    gift: 'Authentic self-expression and the courage to be seen',
    shadow: 'Ego inflation — the need to be the center of everything, or its opposite: hiding your light entirely',
    shadowName: 'The Tyrant',
    quest: 'authentic power vs. ego',
    quote: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.',
    quoteAuthor: 'Ralph Waldo Emerson',
  },
  {
    id: 'ruler',
    name: 'Ruler',
    title: 'The Ruler',
    dimensionIndex: 1,
    planet: 'Saturn',
    element: 'Earth',
    gift: 'Building lasting structures and holding things together when others can\'t',
    shadow: 'Rigidity — controlling everything because letting go feels like collapse',
    shadowName: 'The Controller',
    quest: 'order vs. letting go',
    quote: 'The impediment to action advances action. What stands in the way becomes the way.',
    quoteAuthor: 'Marcus Aurelius',
  },
  {
    id: 'sage',
    name: 'Sage',
    title: 'The Sage',
    dimensionIndex: 2,
    planet: 'Mercury',
    element: 'Air',
    gift: 'Seeing patterns others miss and communicating complex truths simply',
    shadow: 'Overthinking — living in your head while life passes by, using analysis to avoid feeling',
    shadowName: 'The Detached Observer',
    quest: 'truth vs. paralysis',
    quote: 'Who looks outside, dreams; who looks inside, awakes.',
    quoteAuthor: 'Carl Jung',
  },
  {
    id: 'lover',
    name: 'Lover',
    title: 'The Creator',
    dimensionIndex: 3,
    planet: 'Venus',
    element: 'Water',
    gift: 'Creating beauty and bringing harmony to chaos',
    shadow: 'Losing yourself in others — codependency disguised as love, or vanity disguised as self-worth',
    shadowName: 'The People-Pleaser',
    quest: 'beauty vs. self-worth',
    quote: 'I paint myself because I am so often alone and because I am the subject I know best.',
    quoteAuthor: 'Frida Kahlo',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    title: 'The Explorer',
    dimensionIndex: 4,
    planet: 'Jupiter',
    element: 'Fire',
    gift: 'Finding meaning in everything and expanding everyone\'s horizons',
    shadow: 'Restlessness — always chasing the next thing, unable to stay with what\'s here',
    shadowName: 'The Wanderer',
    quest: 'meaning vs. grounding',
    quote: 'Traveling leaves you speechless, then turns you into a storyteller.',
    quoteAuthor: 'Ibn Battuta',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    title: 'The Warrior',
    dimensionIndex: 5,
    planet: 'Mars',
    element: 'Fire',
    gift: 'Moving decisively when others hesitate, getting things done',
    shadow: 'Burning out — pushing through everything with force, mistaking aggression for strength',
    shadowName: 'The Destroyer',
    quest: 'will vs. surrender',
    quote: 'I am not afraid. I was born to do this.',
    quoteAuthor: 'Joan of Arc',
  },
  {
    id: 'caregiver',
    name: 'Caregiver',
    title: 'The Caregiver',
    dimensionIndex: 6,
    planet: 'Moon',
    element: 'Water',
    gift: 'Deep empathy and the ability to make others feel truly seen',
    shadow: 'Losing your boundaries — giving until there\'s nothing left, then resenting everyone for it',
    shadowName: 'The Martyr',
    quest: 'love vs. boundaries',
    quote: 'Peace comes from within. Do not seek it without.',
    quoteAuthor: 'Buddha',
  },
  {
    id: 'mystic',
    name: 'Mystic',
    title: 'The Mystic',
    dimensionIndex: 7,
    planet: 'Neptune',
    element: 'Ether',
    gift: 'Presence and the ability to sense what others can\'t see',
    shadow: 'Dissociation — escaping into the transcendent to avoid dealing with the messy, material world',
    shadowName: 'The Ghost',
    quest: 'transcendence vs. embodiment',
    quote: 'What you seek is seeking you.',
    quoteAuthor: 'Rumi',
  },
];

// ============================================
// Core Engine
// ============================================

/**
 * Given an 8D vector, determine the user's archetype and shadow.
 */
export function assignArchetype(vector: number[]): ArchetypeResult {
  if (vector.length < 8) {
    throw new Error('Vector must have at least 8 dimensions');
  }

  const v = vector.slice(0, 8);

  // Find dominant (highest) and weakest (lowest) dimensions
  let dominantIndex = 0;
  let weakestIndex = 0;
  let secondaryIndex = 0;

  for (let i = 1; i < 8; i++) {
    if (v[i] > v[dominantIndex]) {
      secondaryIndex = dominantIndex;
      dominantIndex = i;
    } else if (v[i] > v[secondaryIndex] || secondaryIndex === dominantIndex) {
      secondaryIndex = i;
    }
    if (v[i] < v[weakestIndex]) {
      weakestIndex = i;
    }
  }

  // Ensure secondary isn't same as dominant
  if (secondaryIndex === dominantIndex) {
    secondaryIndex = dominantIndex === 0 ? 1 : 0;
    for (let i = 0; i < 8; i++) {
      if (i !== dominantIndex && v[i] > v[secondaryIndex]) {
        secondaryIndex = i;
      }
    }
  }

  // Determine profile shape
  const max = v[dominantIndex];
  const min = v[weakestIndex];
  const range = max - min;
  const avg = v.reduce((a, b) => a + b, 0) / 8;
  const variance = v.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / 8;

  let profileShape: 'spike' | 'balanced' | 'split';
  if (variance < 0.01) {
    profileShape = 'balanced';
  } else if (range > 0.4) {
    profileShape = 'spike';
  } else {
    profileShape = 'split';
  }

  return {
    primary: ARCHETYPES[dominantIndex],
    shadow: ARCHETYPES[weakestIndex],
    dominantIndex,
    dominantValue: v[dominantIndex],
    weakestIndex,
    weakestValue: v[weakestIndex],
    secondaryIndex,
    profileShape,
  };
}

// ============================================
// Sol Voice Content (English)
// ============================================

/**
 * Get Sol-voice content for each journey stage, personalized to the user's archetype result.
 */
export function getJourneyContent(result: ArchetypeResult): JourneyStageContent {
  const { primary, shadow, weakestIndex } = result;
  const weakDim = DIMENSION_METADATA[weakestIndex];
  const strongDim = DIMENSION_METADATA[result.dominantIndex];

  return {
    // Day 1: Archetype reveal
    intro: `You are ${primary.title}. Your strongest energy lives in ${strongDim.name} — the dimension of ${strongDim.domain.toLowerCase()}. ${primary.gift}. This is your natural superpower, the thing that comes so easily to you that you might not even recognize it as special. But it is. It shapes how you move through the world, how others experience you, and what you're here to bring.`,

    // Day 3: Dominant dimension deep-dive
    strength: `Your ${strongDim.name} dimension is where you shine. ${getDimensionStrength(result.dominantIndex)} When this energy is flowing, you're in your element — everything feels natural, purposeful, alive. The key isn't to push this energy harder. It's to notice when you're already in it, and let it do its thing.`,

    // Day 7: Shadow teaser
    shadowTeaser: `There's something you might not want to hear. Every ${primary.name} has a blind spot, and yours lives in the ${weakDim.name} dimension — ${weakDim.domain.toLowerCase()}. You might feel it as a vague discomfort, a topic you avoid, or a pattern that keeps repeating. We'll explore this more as you continue your journey. For now, just notice: when does ${weakDim.name.toLowerCase()} energy feel hardest for you?`,

    // Day 14: Full shadow reveal
    shadowReveal: `Let's talk about your shadow. As ${primary.title}, your ${shadow.shadowName} lives in the ${weakDim.name} dimension. ${shadow.shadow}. This isn't a flaw — it's the part of you that hasn't been integrated yet. ${getShadowGuidance(weakestIndex)} The journey isn't about eliminating this pattern. It's about seeing it clearly, understanding where it comes from, and gradually building a healthier relationship with it. That's real growth — not forcing change, but expanding awareness.`,
  };
}

// ============================================
// Dimension-Specific Content
// ============================================

function getDimensionStrength(index: number): string {
  const strengths: Record<number, string> = {
    0: 'You have a natural sense of who you are. People are drawn to your authenticity — not because you perform confidence, but because you genuinely know what matters to you.',
    1: 'You build things that last. Where others dream and drift, you create structure. Discipline isn\'t a struggle for you — it\'s how you express care for the things you value.',
    2: 'Your mind sees connections others miss. You process, analyze, and communicate with a clarity that makes complex things feel simple. Ideas are your natural currency.',
    3: 'You have an instinct for beauty and harmony. You make spaces, relationships, and experiences more beautiful just by being present. People feel valued around you.',
    4: 'You\'re wired for growth. Stagnation is your kryptonite — you need meaning, expansion, new horizons. You help others see possibilities they\'d never considered.',
    5: 'You get things done. While others deliberate, you act. Your energy is kinetic — when you decide something matters, nothing stops you from moving toward it.',
    6: 'You feel what others feel. Your emotional radar is finely tuned — you sense the room, you know when someone\'s hurting, you create connection without effort.',
    7: 'You have access to a stillness most people never find. Your awareness runs deeper than thought — you notice the space between things, the patterns beneath the surface.',
  };
  return strengths[index] || '';
}

function getShadowGuidance(weakestIndex: number): string {
  const guidance: Record<number, string> = {
    0: 'When Identity is your shadow, you might struggle with knowing who you really are — especially when no one\'s watching. You might defer to others\' expectations, or feel invisible in groups. The practice: start small. Make one decision today that\'s purely yours.',
    1: 'When Structure is your shadow, discipline feels like a cage. You might start things and not finish them, or avoid commitments because they feel suffocating. The practice: pick one tiny routine — same time every day, no negotiation. Let structure be a gift you give yourself, not a punishment.',
    2: 'When Mind is your shadow, you might avoid deep thinking or feel overwhelmed by complex decisions. Or you might overthink as a defense — analyzing instead of living. The practice: write for 5 minutes without editing. Let your thoughts flow without judging them.',
    3: 'When Heart is your shadow, intimacy feels risky. You might keep people at arm\'s length, struggle with vulnerability, or confuse performance with connection. The practice: tell someone what you actually feel today. Not what you think. What you feel.',
    4: 'When Growth is your shadow, you might cling to what\'s familiar even when it\'s not working. Change feels threatening rather than exciting. The practice: do one thing differently this week. Take a new route, read something outside your comfort zone, ask a question you\'ve been avoiding.',
    5: 'When Drive is your shadow, action feels dangerous. You might procrastinate, freeze when it matters, or channel your energy into control instead of movement. The practice: do the smallest possible version of the thing you\'re avoiding. Not the whole thing — just the first step.',
    6: 'When Connection is your shadow, relationships feel like work. You might isolate when stressed, struggle to ask for help, or keep your emotional world locked away. The practice: reach out to someone today — not because you need something, but just to say you\'re thinking of them.',
    7: 'When Awareness is your shadow, stillness feels unbearable. You might fill every moment with noise, activity, or distraction. Sitting with yourself feels uncomfortable. The practice: 2 minutes of silence. No phone, no music, no agenda. Just sit with what\'s there.',
  };
  return guidance[weakestIndex] || '';
}

// ============================================
// Utility
// ============================================

/**
 * Get the archetype for a specific dimension index.
 */
export function getArchetypeByDimension(dimensionIndex: number): Archetype {
  return ARCHETYPES[dimensionIndex];
}

/**
 * Get a short one-line description for UI display.
 */
export function getArchetypeSummary(result: ArchetypeResult): string {
  const { primary, shadow } = result;
  return `${primary.title} — ${primary.gift.split('.')[0].split(',')[0]}. Shadow: ${shadow.shadowName}.`;
}

/**
 * Get historical figures that share this archetype (same dominant dimension).
 * Call with the seed data figures to find matches.
 */
export function findArchetypeKin(dominantIndex: number, figures: { name: string; vector: number[] }[]): string[] {
  return figures
    .filter(f => {
      const v = f.vector;
      let maxIdx = 0;
      for (let i = 1; i < Math.min(v.length, 8); i++) {
        if (v[i] > v[maxIdx]) maxIdx = i;
      }
      return maxIdx === dominantIndex;
    })
    .map(f => f.name);
}
