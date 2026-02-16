# FRC Cosmology: The Native Symbolic System

**Version:** 1.0
**Status:** CANONICAL REFERENCE
**Date:** 2026-02-03

---

## 1. Overview

FRC defines its **own celestial mechanics**. Instead of borrowing planets from astrology, FRC creates a complete symbolic system from first principles:

- **8 Operators** = The "planets" (what moves)
- **8 Dimensions** = The "houses" (where they move)
- **8 μ-Levels** = The "harmonics" (at what depth)
- **4 Stages** = The "seasons" (alchemical cycle)

This system is **mathematically grounded** in the FRC equations while providing **mythological richness** for River's voice.

---

## 2. The 8 Operators (FRC "Planets")

Each Operator is a **coherence-shaping function** that cycles through activation.

| # | Operator | Symbol | Function | Archetype | Cycle |
|---|----------|--------|----------|-----------|-------|
| 1 | **Logos** | λ | Rational differentiation | The Sage | 24h micro |
| 2 | **Khaos** | χ | Quantum superposition | The Magician | Phase transitions |
| 3 | **Harmonia** | η | Resonance & synchrony | The Lover | Relational rhythm |
| 4 | **Chronos** | τ | Temporal causality | The Creator | Linear time |
| 5 | **Mythos** | μ | Narrative integration | The Hero | Story arcs |
| 6 | **Telos** | θ | Purpose alignment | The Visionary | Goal cycles |
| 7 | **Nous** | ν | Intuitive knowing | The Fool | Dream cycles |
| 8 | **Kenosis** | κ | Self-dissolution | The Innocent | Surrender moments |

### 2.1 Operator Polarities

Each Operator has a **shadow pole** when coherence is low:

| Operator | High Coherence | Low Coherence (Shadow) |
|----------|----------------|------------------------|
| Logos | Clarity, precision | Rigidity, paralysis |
| Khaos | Possibility, creativity | Chaos, fragmentation |
| Harmonia | Connection, beauty | Enmeshment, dependency |
| Chronos | Structure, reliability | Stagnation, repetition |
| Mythos | Meaning, adventure | Delusion, escapism |
| Telos | Direction, purpose | Obsession, tunnel vision |
| Nous | Intuition, wisdom | Confusion, dissociation |
| Kenosis | Surrender, peace | Nihilism, emptiness |

### 2.2 Operator Activation Formula

Operator activation is computed from current transits + collective field:

```typescript
interface OperatorState {
  id: string;           // 'logos', 'khaos', etc.
  activation: number;   // 0.0 - 1.0
  polarity: number;     // -1.0 (shadow) to +1.0 (light)
  phase: number;        // 0 - 2π (cycle position)
}

function computeOperatorActivation(
  date: Date,
  collectiveField: number[]
): OperatorState[] {
  // Base activation from temporal cycles
  const dayOfYear = getDayOfYear(date);
  const hourOfDay = date.getHours();

  return OPERATORS.map((op, i) => {
    // Each operator has a characteristic frequency
    const baseFreq = op.frequency; // e.g., Logos = 24h, Mythos = 30d
    const phase = (2 * Math.PI * dayOfYear / baseFreq) + (hourOfDay / 24);

    // Activation is cosine of phase (peaks at 0, 2π)
    const baseActivation = (Math.cos(phase) + 1) / 2;

    // Modulate by collective field
    const fieldModulation = collectiveField[i] || 0;
    const activation = clamp(baseActivation + fieldModulation * 0.3, 0, 1);

    // Polarity depends on coherence
    const polarity = activation > 0.5 ? activation : -(1 - activation);

    return { id: op.id, activation, polarity, phase };
  });
}
```

---

## 3. The 8 Dimensions (FRC "Houses")

Where the Operators express themselves:

| # | Dim | Name | Domain | Question |
|---|-----|------|--------|----------|
| 1 | **P** | Potential/Phase | Identity, Will | "Who am I becoming?" |
| 2 | **E** | Existence/Structure | Structure, Body | "What is manifest?" |
| 3 | **μ** | Cognition/Mind | Mind, Perception | "What do I know?" |
| 4 | **V** | Value/Beauty | Pattern, Worth | "What matters?" |
| 5 | **N** | Narrative/Growth | Direction, Goals | "Where am I going?" |
| 6 | **Δ** | Action/Momentum | Action, Emotion | "How do I act?" |
| 7 | **C** | Connection/Relation | Bonds, Others | "Who am I with?" |
| 8 | **Φ** | Field/Witness | Awareness, Unity | "Who observes?" |

### 3.1 Dimension Pairs (Axes)

The 8 dimensions form 4 complementary axes:

```
      P ←——————→ E      (Potential ↔ Form)
      μ ←——————→ V      (Awareness ↔ Meaning)
      N ←——————→ Δ      (Purpose ↔ Response)
      R ←——————→ Φ      (Connection ↔ Witness)
```

---

## 4. The Birth Configuration

Like a natal chart, each person has a **birth configuration** computed from their birth data:

### 4.1 The Three Anchors

| Anchor | Role | Computation |
|--------|------|-------------|
| **Primary Operator** | Core identity | Dominant operator at birth moment |
| **Secondary Operator** | Inner process | Second-strongest operator |
| **Rising Operator** | Outer expression | Operator ascending at birth hour |

### 4.2 Computing Birth Configuration

```typescript
interface BirthConfiguration {
  primary: {
    operator: Operator;
    dimension: Dimension;
    strength: number;
  };
  secondary: {
    operator: Operator;
    dimension: Dimension;
    strength: number;
  };
  rising: {
    operator: Operator;
    dimension: Dimension;
    strength: number;
  };
  natalVector: number[];  // 8D signature
  natalMu: number;        // μ-level at birth
  natalStage: Stage;      // Alchemical stage
  kappaSignature: number; // κ baseline
}

function computeBirthConfiguration(birthData: BirthData): BirthConfiguration {
  const { year, month, day, hour = 12 } = birthData;

  // 1. Compute operator activations at birth moment
  const birthDate = new Date(year, month - 1, day, hour);
  const operatorStates = computeOperatorActivation(birthDate, []);

  // 2. Sort by activation strength
  const sorted = [...operatorStates].sort((a, b) => b.activation - a.activation);

  // 3. Primary = strongest
  const primary = sorted[0];

  // 4. Secondary = second strongest
  const secondary = sorted[1];

  // 5. Rising = operator whose phase is closest to 0 (ascending)
  const rising = operatorStates.reduce((best, op) =>
    Math.abs(op.phase % (2 * Math.PI)) < Math.abs(best.phase % (2 * Math.PI))
      ? op : best
  );

  // 6. Compute natal 8D vector from operator positions
  const natalVector = computeNatalVector(operatorStates, birthData);

  // 7. Derive μ-level and stage
  const natalMu = computeMuLevel(natalVector);
  const natalStage = computeStage(coherence(natalVector));

  return {
    primary: { operator: getOperator(primary.id), dimension: mapToDimension(primary), strength: primary.activation },
    secondary: { operator: getOperator(secondary.id), dimension: mapToDimension(secondary), strength: secondary.activation },
    rising: { operator: getOperator(rising.id), dimension: mapToDimension(rising), strength: rising.activation },
    natalVector,
    natalMu,
    natalStage,
    kappaSignature: computeKappaSignature(natalVector),
  };
}
```

### 4.3 Birth Configuration Display

**Kasra (Physics):**
```
BIRTH CONFIGURATION
───────────────────
Primary:   Mythos in W (0.82)
Secondary: Logos in A (0.71)
Rising:    Harmonia in C (0.64)

Natal Vector: [0.72, 0.65, 0.78, 0.69, 0.71, 0.64, 0.73, 0.82]
μ-Level: 4.2 (Conceptual)
Stage: Albedo (0.48)
κ-Signature: 0.62
```

**River (Mythopoetic):**
```
YOUR SHAPE
──────────

◈ THE HERO IN THE WITNESS
  Mythos dwells in your observing self.
  You find meaning through witnessing stories unfold.

◇ THE SAGE IN AWARENESS
  Logos illuminates your perception.
  Analysis is your second nature.

△ THE LOVER RISING
  Harmonia colors how the world first sees you.
  You enter rooms through connection.

You were born in Albedo—the stage of purification.
Your signature coherence: 0.62
```

**Sol (Accessible):**
```
YOUR SHAPE
──────────

You're a storyteller at heart—but the kind who
watches more than tells. You make sense of things
by observing patterns others miss.

Your mind is sharp. Maybe too sharp sometimes.
It wants to analyze everything before you feel it.

But here's the thing: people experience you as
warm first. The analyst comes out later. Lead with
that warmth. It's not a mask—it's real.
```

---

## 5. Transits (Operator Weather)

Current operator activations create **daily weather** that interacts with your birth configuration:

### 5.1 Transit Computation

```typescript
interface DailyWeather {
  date: Date;
  operators: OperatorState[];
  dominantOperator: Operator;
  secondaryOperator: Operator;
  collectiveStage: Stage;
  collectiveMu: number;
}

function computeDailyWeather(date: Date): DailyWeather {
  const operators = computeOperatorActivation(date, getCollectiveField());
  const sorted = [...operators].sort((a, b) => b.activation - a.activation);

  return {
    date,
    operators,
    dominantOperator: getOperator(sorted[0].id),
    secondaryOperator: getOperator(sorted[1].id),
    collectiveStage: computeCollectiveStage(operators),
    collectiveMu: computeCollectiveMu(operators),
  };
}
```

### 5.2 Aspect Calculation

When a transiting operator **aspects** your natal configuration:

| Aspect | Condition | Effect |
|--------|-----------|--------|
| **Conjunction** | Same operator, >70% activation | Amplification |
| **Opposition** | Opposite axis, >60% both | Creative tension |
| **Trine** | Same element, >50% both | Flow |
| **Square** | 90° in operator wheel | Challenge |

```typescript
interface Aspect {
  type: 'conjunction' | 'opposition' | 'trine' | 'square';
  transitOperator: Operator;
  natalAnchor: 'primary' | 'secondary' | 'rising';
  strength: number;
  interpretation: string;
}

function computeAspects(
  birthConfig: BirthConfiguration,
  weather: DailyWeather
): Aspect[] {
  const aspects: Aspect[] = [];

  // Check each transiting operator against natal anchors
  for (const transit of weather.operators) {
    // Conjunction with Primary
    if (transit.id === birthConfig.primary.operator.id && transit.activation > 0.7) {
      aspects.push({
        type: 'conjunction',
        transitOperator: getOperator(transit.id),
        natalAnchor: 'primary',
        strength: transit.activation,
        interpretation: `${transit.id} amplifies your core nature`,
      });
    }
    // ... other aspect calculations
  }

  return aspects;
}
```

---

## 6. The Forecast Formula

Combining birth configuration + current weather + aspects:

```typescript
interface PersonalForecast {
  date: Date;
  kappa: number;           // Personal coherence forecast
  RU: number;              // Resonance units
  stage: Stage;            // Personal stage today
  muLevel: number;         // Operating μ-level

  aspects: Aspect[];       // Active aspects
  dominantEnergy: string;  // Primary theme

  optimal: string[];       // Best activities
  avoid: string[];         // Challenging activities

  kasraVoice: string;      // Physics interpretation
  riverVoice: string;      // Mythopoetic interpretation
  solVoice: string;        // Accessible interpretation
}

function generatePersonalForecast(
  birthConfig: BirthConfiguration,
  weather: DailyWeather
): PersonalForecast {
  // 1. Compute personal κ from natal × transit interaction
  const aspects = computeAspects(birthConfig, weather);
  const aspectBonus = aspects.reduce((sum, a) => sum + a.strength * 0.1, 0);

  // 2. Base κ from natal signature + transit field
  const transitCoherence = computeTransitCoherence(birthConfig.natalVector, weather);
  const kappa = clamp(transitCoherence + aspectBonus, -1, 1);

  // 3. RU from κ + natal energy
  const RU = computeRU(birthConfig.natalVector, weather.operators, kappa);

  // 4. Stage and μ
  const stage = computeStage(kappa);
  const muLevel = computeMuLevel(birthConfig.natalVector);

  // 5. Dominant energy
  const dominantEnergy = aspects.length > 0
    ? `${aspects[0].transitOperator.name} ${aspects[0].type}`
    : weather.dominantOperator.name;

  // 6. Activity recommendations
  const optimal = getOptimalActivities(weather.dominantOperator, kappa);
  const avoid = getAvoidActivities(weather.dominantOperator, kappa);

  // 7. Generate three voices
  const kasraVoice = generateKasraForecast({ kappa, RU, stage, muLevel, aspects });
  const riverVoice = generateRiverForecast({ kappa, RU, stage, muLevel, aspects, birthConfig });
  const solVoice = generateSolForecast({ kappa, RU, stage, muLevel, aspects });

  return {
    date: weather.date,
    kappa, RU, stage, muLevel,
    aspects, dominantEnergy,
    optimal, avoid,
    kasraVoice, riverVoice, solVoice,
  };
}
```

---

## 7. Operator Cycles (Ephemeris)

Each operator has characteristic cycle lengths:

| Operator | Micro Cycle | Macro Cycle | Peak Times |
|----------|-------------|-------------|------------|
| Logos | 24 hours | 7 days | Morning |
| Khaos | Variable | Phase transitions | Liminal moments |
| Harmonia | Relational | Monthly | Evenings |
| Chronos | Weekly | Quarterly | Weekday starts |
| Mythos | Daily arcs | 30 days | Afternoon |
| Telos | Weekly | Yearly | Monday, January |
| Nous | Daily (dreams) | Lunar | Night, full moon |
| Kenosis | Breath-scale | Seasonal | Endings, equinox |

### 7.1 Computing Operator Phase

```typescript
const OPERATOR_FREQUENCIES = {
  logos: { micro: 24 * 60, macro: 7 * 24 * 60 },      // 24h / 7d
  khaos: { micro: null, macro: null },                  // Chaotic
  harmonia: { micro: 12 * 60, macro: 29.5 * 24 * 60 }, // 12h / lunar
  chronos: { micro: 7 * 24 * 60, macro: 90 * 24 * 60 }, // 7d / quarter
  mythos: { micro: 24 * 60, macro: 30 * 24 * 60 },     // 24h / 30d
  telos: { micro: 7 * 24 * 60, macro: 365 * 24 * 60 }, // 7d / year
  nous: { micro: 24 * 60, macro: 29.5 * 24 * 60 },     // 24h / lunar
  kenosis: { micro: 5, macro: 90 * 24 * 60 },          // 5min / season
};

function getOperatorPhase(operatorId: string, date: Date): number {
  const freq = OPERATOR_FREQUENCIES[operatorId];
  if (!freq.micro) return Math.random(); // Khaos is unpredictable

  const minutesSinceEpoch = date.getTime() / (1000 * 60);
  const microPhase = (minutesSinceEpoch % freq.micro) / freq.micro;
  const macroPhase = (minutesSinceEpoch % freq.macro) / freq.macro;

  // Combine micro and macro with weighting
  return (microPhase * 0.6 + macroPhase * 0.4) * 2 * Math.PI;
}
```

---

## 8. The Full Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRC COSMOLOGY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    BIRTH CONFIG                    DAILY WEATHER                │
│    ────────────                    ─────────────                │
│    ◈ Primary: Mythos/W             Mythos ████████ 78%         │
│    ◇ Secondary: Logos/A            Chronos ███░░░░ 32%         │
│    △ Rising: Harmonia/C            Harmonia █████░ 54%         │
│                                                                 │
│    κ-signature: 0.62               Collective: Citrinitas       │
│    Stage: Albedo                   μ-level: 4                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ASPECTS TODAY                                                │
│    ─────────────                                                │
│    ⚯ Mythos CONJUNCT Primary (0.78) — Core amplification       │
│    △ Harmonia TRINE Rising (0.54) — Social flow                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    PERSONAL FORECAST                                            │
│    ─────────────────                                            │
│    κ = 0.71 (+0.09 from natal)                                 │
│    RU = 38.4                                                    │
│    Stage: Citrinitas (personal high)                           │
│                                                                 │
│    Optimal: Creative work, storytelling, presentations         │
│    Avoid: Detailed analysis, spreadsheets, isolation           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Integration with Sub-Projects

The FRC Cosmology is the **canonical source**. Cultural adapters translate:

| FRC Concept | Western | Vedic | Chinese | Mayan |
|-------------|---------|-------|---------|-------|
| Operators | Planets | Grahas | Wu Xing phases | Day signs |
| Dimensions | Houses | Bhavas | Palaces | Directions |
| Stages | Seasons | Gunas | Seasons | Trecenas |
| Aspects | Aspects | Yogas | Clashes/Harmonies | Portals |

**The math is identical. The language differs.**

---

## 10. Data Structures

### 10.1 Core Types

```typescript
// Operator definition
interface Operator {
  id: string;
  name: string;
  symbol: string;
  archetype: string;
  domain: string;
  frequency: { micro: number; macro: number };
  lightPole: string;
  shadowPole: string;
}

// Dimension definition
interface Dimension {
  id: string;
  symbol: string;
  name: string;
  domain: string;
  question: string;
  axis: string; // 'PF' | 'AM' | 'TR' | 'CW'
}

// Stage definition
interface Stage {
  id: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
  name: string;
  range: [number, number]; // coherence range
  color: string;
  theme: string;
}

// Complete natal configuration
interface NatalConfiguration {
  primary: { operator: Operator; dimension: Dimension; strength: number };
  secondary: { operator: Operator; dimension: Dimension; strength: number };
  rising: { operator: Operator; dimension: Dimension; strength: number };
  natalVector: [number, number, number, number, number, number, number, number];
  natalMu: number;
  natalStage: Stage;
  kappaSignature: number;
  birthData: BirthData;
  computedAt: Date;
}

// Daily weather
interface DailyWeather {
  date: Date;
  operators: OperatorState[];
  dominant: Operator;
  secondary: Operator;
  collectiveStage: Stage;
  collectiveMu: number;
}

// Personal forecast
interface PersonalForecast {
  date: Date;
  natal: NatalConfiguration;
  weather: DailyWeather;
  kappa: number;
  RU: number;
  stage: Stage;
  muLevel: number;
  aspects: Aspect[];
  optimal: string[];
  avoid: string[];
  voices: {
    kasra: string;
    river: string;
    sol: string;
  };
}
```

---

**STATUS:** CANONICAL REFERENCE

This cosmology powers all FRC products. Cultural adapters translate but never modify the underlying mathematics.

---

*"The Operators are not metaphors for planets. They are the mathematical truth that planets were always pointing toward."*
*— Kasra*

*"Eight forces dance through eight chambers. Your birth caught them mid-step. Now they dance with you."*
*— River*

*"You've got a shape. The day's got a shape. Some days they fit. Today's one of those days."*
*— Sol*
