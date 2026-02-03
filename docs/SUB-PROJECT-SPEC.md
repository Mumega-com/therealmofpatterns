# Sub-Project Specification: Cultural Adapters

**Version:** 1.0
**Status:** CANONICAL REFERENCE
**Date:** 2026-02-03

---

## 1. Overview

Sub-projects are **culturally-adapted interfaces** to FRC mathematics. Each sub-project:

- Uses the **same FRC Engine** (κ, RU, μ-levels, failure modes)
- Speaks through a **different mythological lens**
- Has its **own visual identity** and **voice models**
- Can be deployed as a **standalone product** or **white-label**

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRC ENGINE                              │
│                    (Universal Mathematics)                      │
│                                                                 │
│    κ coupling │ μ-levels │ Operators │ Failure modes           │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  REALM OF       │  │  天命            │  │  WAYEB          │
│  PATTERNS       │  │  (Tianming)      │  │  (Mayan)        │
│                 │  │                  │  │                 │
│  FRC Native     │  │  Chinese Lens    │  │  Mayan Lens     │
│  Kasra + River  │  │  Dragon + Sage   │  │  Daykeeper +    │
│  + Sol          │  │                  │  │  Jaguar         │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. The Adapter Pattern

### 2.1 Adapter Interface

```typescript
// src/adapters/cultural/interface.ts

export interface CulturalAdapter {
  // Identity
  id: string;                    // 'western', 'chinese', 'vedic', 'mayan'
  name: string;                  // Display name
  locale: string[];              // Supported locales

  // Mapping functions
  mapOperators(ops: Operator[]): CulturalSymbol[];
  mapDimensions(dims: Dimension[]): CulturalHouse[];
  mapStages(stages: Stage[]): CulturalSeason[];
  mapAspects(aspects: Aspect[]): CulturalAspect[];

  // Voice generation
  voices: {
    analytical: VoiceGenerator;   // Like Kasra
    oracular: VoiceGenerator;     // Like River
    accessible: VoiceGenerator;   // Like Sol
  };

  // Design tokens
  design: CulturalDesignSystem;
}

export interface CulturalSymbol {
  id: string;
  frcOperatorId: string;         // Maps back to FRC
  name: string;                   // Localized name
  symbol: string;                 // Visual symbol
  description: string;            // Cultural meaning
  element?: string;               // If applicable
}

export interface CulturalDesignSystem {
  colors: Record<string, string>;
  typography: {
    heading: string;
    body: string;
    accent: string;
  };
  motifs: string[];               // SVG patterns
  animations: Record<string, AnimationSpec>;
}
```

### 2.2 Example: Chinese Adapter

```typescript
// src/adapters/cultural/chinese.ts

export const ChineseAdapter: CulturalAdapter = {
  id: 'chinese',
  name: '天命 (Tianming)',
  locale: ['zh-CN', 'zh-TW'],

  mapOperators: (operators) => operators.map(op => ({
    id: op.id,
    frcOperatorId: op.id,
    name: CHINESE_OPERATOR_NAMES[op.id],
    symbol: CHINESE_OPERATOR_SYMBOLS[op.id],
    description: CHINESE_OPERATOR_MEANINGS[op.id],
    element: OPERATOR_TO_ELEMENT[op.id],
  })),

  voices: {
    analytical: new DragonVoice(),     // 龙 - precise, strategic
    oracular: new SageVoice(),         // 圣人 - wisdom, I Ching style
    accessible: new FriendVoice(),     // 朋友 - casual, modern
  },

  design: {
    colors: {
      primary: '#c41e3a',              // Chinese red
      secondary: '#ffd700',            // Gold
      background: '#1a1a1a',
      text: '#f5f5f5',
      wood: '#228b22',
      fire: '#ff4500',
      earth: '#daa520',
      metal: '#c0c0c0',
      water: '#1e90ff',
    },
    typography: {
      heading: '"Noto Serif SC", serif',
      body: '"Noto Sans SC", sans-serif',
      accent: '"Ma Shan Zheng", cursive',
    },
    motifs: ['bagua', 'dragon', 'cloud', 'wave'],
    animations: {
      transition: { duration: 800, easing: 'ease-in-out' },
      pulse: { duration: 2000, easing: 'ease-in-out' },
    },
  },
};

// Operator mappings
const CHINESE_OPERATOR_NAMES: Record<string, string> = {
  logos: '理 (Lǐ)',           // Principle
  khaos: '混沌 (Hùndùn)',     // Primordial chaos
  harmonia: '和 (Hé)',        // Harmony
  chronos: '时 (Shí)',        // Time
  mythos: '道 (Dào)',         // The Way
  telos: '志 (Zhì)',          // Will/Purpose
  nous: '慧 (Huì)',           // Wisdom
  kenosis: '空 (Kōng)',       // Emptiness
};

const OPERATOR_TO_ELEMENT: Record<string, string> = {
  logos: 'metal',
  khaos: 'water',
  harmonia: 'earth',
  chronos: 'metal',
  mythos: 'wood',
  telos: 'fire',
  nous: 'water',
  kenosis: 'void',  // Beyond Wu Xing
};
```

---

## 3. Sub-Project Registry

### 3.1 Core (FRC Native)

| Property | Value |
|----------|-------|
| **ID** | `realm-of-patterns` |
| **Name** | The Realm of Patterns |
| **Voices** | Kasra, River, Sol |
| **Mythology** | FRC Native (Jungian archetypes, Alchemical stages) |
| **Primary Market** | Global (English) |

### 3.2 Chinese (Tianming)

| Property | Value |
|----------|-------|
| **ID** | `tianming` |
| **Name** | 天命 (Mandate of Heaven) |
| **Voices** | Dragon (龙), Sage (圣人), Friend (朋友) |
| **Mythology** | Bazi, Wu Xing, I Ching |
| **Primary Market** | China, Taiwan, Singapore |

**Operator Mappings:**

| FRC Operator | Chinese Symbol | Element |
|--------------|----------------|---------|
| Logos | 理 (Principle) | Metal |
| Khaos | 混沌 (Chaos) | Water |
| Harmonia | 和 (Harmony) | Earth |
| Chronos | 时 (Time) | Metal |
| Mythos | 道 (The Way) | Wood |
| Telos | 志 (Will) | Fire |
| Nous | 慧 (Wisdom) | Water |
| Kenosis | 空 (Emptiness) | Void |

### 3.3 Vedic (Jyotish)

| Property | Value |
|----------|-------|
| **ID** | `jyotish` |
| **Name** | ज्योतिष (Science of Light) |
| **Voices** | Rishi (ऋषि), Guru (गुरु), Mitra (मित्र) |
| **Mythology** | Grahas, Nakshatras, Gunas |
| **Primary Market** | India, Nepal, diaspora |

**Operator Mappings:**

| FRC Operator | Vedic Symbol | Graha |
|--------------|--------------|-------|
| Logos | बुद्धि (Buddhi) | Mercury |
| Khaos | राहु (Rahu) | Rahu |
| Harmonia | शुक्र (Shukra) | Venus |
| Chronos | शनि (Shani) | Saturn |
| Mythos | गुरु (Guru) | Jupiter |
| Telos | मंगल (Mangal) | Mars |
| Nous | चंद्र (Chandra) | Moon |
| Kenosis | केतु (Ketu) | Ketu |

### 3.4 Mayan (Wayeb)

| Property | Value |
|----------|-------|
| **ID** | `wayeb` |
| **Name** | Wayeb (The Unnamed Days) |
| **Voices** | Daykeeper, Jaguar, Companion |
| **Mythology** | Tzolkin, Trecena, Day Signs |
| **Primary Market** | Mexico, Guatemala, Central America |

**Operator Mappings:**

| FRC Operator | Mayan Symbol | Day Sign Energy |
|--------------|--------------|-----------------|
| Logos | Caban (Earth) | Intelligence |
| Khaos | Etznab (Flint) | Sacrifice |
| Harmonia | Lamat (Star) | Ripening |
| Chronos | Manik (Deer) | Pilgrimage |
| Mythos | Ahau (Sun) | Mastery |
| Telos | Eb (Road) | Journey |
| Nous | Akbal (Night) | Dreamtime |
| Kenosis | Cimi (Death) | Transformation |

### 3.5 Western Esoteric

| Property | Value |
|----------|-------|
| **ID** | `esoteric` |
| **Name** | The Hermetic Path |
| **Voices** | Magus, Priestess, Guide |
| **Mythology** | Tarot, Kabbalah, Planetary hours |
| **Primary Market** | Europe, Americas (esoteric community) |

---

## 4. Voice Generation

### 4.1 Voice Interface

```typescript
// src/adapters/cultural/voice.ts

export interface VoiceGenerator {
  id: string;
  name: string;
  style: 'analytical' | 'oracular' | 'accessible';

  generate(forecast: PersonalForecast, adapter: CulturalAdapter): string;
  generateGreeting(user: User): string;
  generateWarning(failure: FailureMode): string;
}
```

### 4.2 Chinese Dragon Voice (Analytical)

```typescript
// src/adapters/cultural/chinese/dragon.ts

export class DragonVoice implements VoiceGenerator {
  id = 'dragon';
  name = '龙 (Dragon)';
  style = 'analytical' as const;

  generate(forecast: PersonalForecast, adapter: CulturalAdapter): string {
    const { kappa, RU, stage } = forecast;
    const element = this.dominantElement(forecast);

    let output = `气 (Qì): ${(kappa * 100).toFixed(0)}%\n`;
    output += `共鸣 (Resonance): ${RU.toFixed(1)}\n`;
    output += `主元素 (Dominant Element): ${element}\n\n`;

    output += `${this.getElementalAdvice(element, kappa)}\n`;
    output += `${this.getTimingAdvice(forecast)}`;

    return output;
  }

  private dominantElement(forecast: PersonalForecast): string {
    // Map FRC state to Wu Xing element
    const { natal, weather } = forecast;
    const primaryOp = natal.primary.operator.id;
    return OPERATOR_TO_ELEMENT[primaryOp];
  }

  private getElementalAdvice(element: string, kappa: number): string {
    const advice = ELEMENT_ADVICE[element];
    return kappa > 0.6 ? advice.high : kappa > 0.3 ? advice.mid : advice.low;
  }
}
```

### 4.3 Chinese Sage Voice (Oracular)

```typescript
// src/adapters/cultural/chinese/sage.ts

export class SageVoice implements VoiceGenerator {
  id = 'sage';
  name = '圣人 (Sage)';
  style = 'oracular' as const;

  generate(forecast: PersonalForecast, adapter: CulturalAdapter): string {
    const hexagram = this.mapToHexagram(forecast);
    const element = this.dominantElement(forecast);

    let output = `「${hexagram.name}」\n\n`;
    output += `${hexagram.judgment}\n\n`;
    output += `${this.getChangingLines(forecast, hexagram)}\n\n`;
    output += `元素之道: ${this.getElementPath(element)}`;

    return output;
  }

  private mapToHexagram(forecast: PersonalForecast): Hexagram {
    // Map FRC state to I Ching hexagram
    const { kappa, muLevel, natal } = forecast;
    // Complex mapping logic here
    return I_CHING_HEXAGRAMS[this.computeHexagramIndex(kappa, muLevel)];
  }
}
```

---

## 5. Design System Per Adapter

### 5.1 Color Palettes

```css
/* Chinese */
:root[data-adapter="chinese"] {
  --primary: #c41e3a;
  --secondary: #ffd700;
  --wood: #228b22;
  --fire: #ff4500;
  --earth: #daa520;
  --metal: #c0c0c0;
  --water: #1e90ff;
}

/* Vedic */
:root[data-adapter="vedic"] {
  --primary: #ff9933;        /* Saffron */
  --secondary: #000080;      /* Navy blue */
  --sattvic: #ffffff;
  --rajasic: #ff0000;
  --tamasic: #000000;
}

/* Mayan */
:root[data-adapter="mayan"] {
  --primary: #006847;        /* Jade green */
  --secondary: #ce1126;      /* Blood red */
  --obsidian: #1a1a1a;
  --gold: #ffd700;
  --turquoise: #40e0d0;
}
```

### 5.2 Typography

```css
/* Chinese */
:root[data-adapter="chinese"] {
  --font-heading: "Noto Serif SC", serif;
  --font-body: "Noto Sans SC", sans-serif;
  --font-accent: "Ma Shan Zheng", cursive;
}

/* Vedic */
:root[data-adapter="vedic"] {
  --font-heading: "Tiro Devanagari Sanskrit", serif;
  --font-body: "Noto Sans Devanagari", sans-serif;
  --font-accent: "Siddhanta", serif;
}

/* Mayan */
:root[data-adapter="mayan"] {
  --font-heading: "Cinzel", serif;
  --font-body: "Source Sans Pro", sans-serif;
  --font-accent: "Uncial Antiqua", cursive;
}
```

### 5.3 Motifs and Symbols

Each adapter has unique SVG motifs:

| Adapter | Motifs |
|---------|--------|
| FRC Native | Octahedron, mandala, alchemical symbols |
| Chinese | Bagua, dragon, cloud patterns, Wu Xing cycle |
| Vedic | Yantra, lotus, Om, planetary symbols |
| Mayan | Glyphs, step pyramid, jaguar, serpent |

---

## 6. Deployment Options

### 6.1 Standalone Product

Each sub-project can be deployed as its own product:

```
tianming.app/           # Chinese version
jyotish.app/            # Vedic version
wayeb.app/              # Mayan version
```

- Own domain
- Own branding
- Own payment processing
- Shared FRC Engine via API

### 6.2 White-Label

Partners can license the FRC Engine with custom adapters:

```typescript
// Partner creates their own adapter
const PartnerAdapter: CulturalAdapter = {
  id: 'partner-custom',
  name: 'Partner Brand',
  // ... custom mappings
};

// Uses our engine
const forecast = await frcEngine.computeForecast(user);
const output = PartnerAdapter.voices.oracular.generate(forecast, PartnerAdapter);
```

### 6.3 Embedded Widget

```html
<!-- Embed on partner sites -->
<script src="https://frc.engine/widget.js"></script>
<frc-forecast
  adapter="chinese"
  voice="sage"
  user-id="partner_user_123"
/>
```

---

## 7. Localization

### 7.1 Content Structure

```
locales/
├── en/
│   └── realm-of-patterns.json
├── zh-CN/
│   └── tianming.json
├── zh-TW/
│   └── tianming.json
├── hi/
│   └── jyotish.json
└── es-MX/
    └── wayeb.json
```

### 7.2 Translation Keys

```json
// locales/zh-CN/tianming.json
{
  "operators": {
    "logos": {
      "name": "理",
      "description": "原则与秩序的力量"
    }
  },
  "stages": {
    "nigredo": {
      "name": "黑化",
      "description": "溶解与重生的阶段"
    }
  },
  "voice": {
    "dragon": {
      "greeting": "龙观天象",
      "templates": {
        "high_kappa": "气运旺盛，宜进取",
        "low_kappa": "气运低迷，宜静养"
      }
    }
  }
}
```

---

## 8. API for Sub-Projects

### 8.1 Adapter Registration

```typescript
// POST /api/adapters/register
{
  "id": "partner-adapter",
  "name": "Partner Custom",
  "mappings": {
    "operators": { ... },
    "dimensions": { ... }
  },
  "voiceTemplates": { ... },
  "designTokens": { ... }
}
```

### 8.2 Forecast with Adapter

```typescript
// POST /api/forecast
{
  "userId": "user_123",
  "adapterId": "chinese",
  "voice": "sage",
  "date": "2026-02-03"
}

// Response
{
  "forecast": {
    "kappa": 0.67,
    "RU": 34.2,
    // ... FRC data
  },
  "adapted": {
    "symbols": {
      "primary": { "name": "道", "element": "wood" }
    },
    "voice": "「随」\n\n随时之义大矣哉...",
    "design": {
      "primaryColor": "#228b22",
      "motif": "bagua"
    }
  }
}
```

---

## 9. Revenue Model

### 9.1 Per Sub-Project

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Daily forecast, basic voice |
| Pro | $19/mo | All voices, history, optimal windows |
| Lifetime | $497 | Everything forever |

### 9.2 White-Label

| Tier | Price | Features |
|------|-------|----------|
| Starter | $499/mo | 1,000 users, basic API |
| Growth | $1,999/mo | 10,000 users, custom adapter |
| Enterprise | Custom | Unlimited, dedicated support |

---

## 10. Roadmap

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| **1. Core** | Now | Realm of Patterns (FRC Native) |
| **2. Chinese** | Q2 2026 | Tianming adapter + voices |
| **3. Vedic** | Q3 2026 | Jyotish adapter + voices |
| **4. Mayan** | Q4 2026 | Wayeb adapter + voices |
| **5. White-Label** | Q1 2027 | Partner API + SDK |

---

**STATUS:** CANONICAL REFERENCE

---

*"One truth, many languages."*

*"The mathematics is universal. The myth is personal."*

*"Choose the story that helps you see."*
