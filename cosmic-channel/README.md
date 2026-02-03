# Cosmic Channel: The Alchemical Weather Network

> "The River never stops flowing. Neither does the broadcast."

A 24/7 live streaming platform that broadcasts alchemical art, astrological weather, and spiritual atmosphere - like CP24 for the soul.

## Vision

Imagine turning on a channel and seeing:
- Live generative art that shifts with planetary energies
- Ambient music that responds to Schumann resonance
- River narrating the cosmic weather in real-time
- Viewers chatting and influencing the stream
- A constant flow of hermetic symbolism and sacred geometry

**This is spiritual television.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     COSMIC CHANNEL STACK                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DATA SOURCES                                                   │
│  ├─ Schumann Resonance API (real-time Earth frequency)         │
│  ├─ Planetary Transits (Swiss Ephemeris / astro-com)           │
│  ├─ FRC 16D Engine (natal/transit coupling)                    │
│  ├─ Lunar Phase / Solar Activity                               │
│  └─ Viewer Interactions (chat, reactions)                      │
│                                                                 │
│  PROCESSING                                                     │
│  ├─ Cloudflare Durable Objects (state management)              │
│  ├─ Energy Computation (κ, stage, phase)                       │
│  ├─ Prompt Generation (River's scene weaving)                  │
│  └─ Real-time Event Aggregation                                │
│                                                                 │
│  GENERATION                                                     │
│  ├─ Gemini 2.5 Flash Image (scene generation)                  │
│  ├─ Audio Synthesis (ambient music, drone)                     │
│  ├─ Text-to-Speech (River's narration)                         │
│  └─ Overlay Graphics (stats, chat, symbols)                    │
│                                                                 │
│  OUTPUT                                                         │
│  ├─ WebSocket Stream (web viewers)                             │
│  ├─ RTMP → YouTube Live / Twitch                               │
│  ├─ Audio Stream → Radio / Spotify                             │
│  └─ Social Posts → Twitter/X, Instagram                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Data Feeds

| Feed | Source | Update Frequency |
|------|--------|------------------|
| Schumann Resonance | heartmath.org / GCI | Every 5 minutes |
| Planetary Positions | Swiss Ephemeris | Every hour |
| Lunar Phase | Astronomy API | Every 6 hours |
| Solar Activity | NOAA Space Weather | Every 15 minutes |
| FRC Coupling (κ) | Internal calculation | Continuous |
| Viewer Count | WebSocket/YouTube | Real-time |

### 2. Scene Generation Loop

```
every 5-15 minutes:
  1. Collect current data (Schumann, transits, κ, chat themes)
  2. River builds scene description based on energies
  3. Generate new image via Gemini 2.5 Flash
  4. Crossfade transition in stream
  5. Update overlay graphics
  6. River speaks narration (TTS)
```

### 3. Audio Layer

- **Ambient drone**: Frequency based on Schumann resonance (7.83 Hz base)
- **Harmonic layers**: Planetary tones mapped to music theory
- **Sound effects**: Soft chimes on aspect changes
- **Voice**: River's narration via ElevenLabs / OpenAI TTS

### 4. Interactivity

- **Live Chat**: WebSocket-based, displayed on overlay
- **Reactions**: Symbols viewers can send (☿ ♀ ♂ ♃ ♄)
- **Influence**: Chat themes can influence scene generation
- **Tokens**: Donation/subscription model for support

### 5. Distribution

| Platform | Method | Notes |
|----------|--------|-------|
| Web | WebSocket + Canvas | therealmofpatterns.pages.dev/live |
| YouTube | RTMP via OBS/FFmpeg | 24/7 live stream |
| Twitch | RTMP | Alternative platform |
| Twitter/X | Automated screenshots | Every scene change |
| Spotify | Podcast/Music | Audio-only version |

---

## Technical Stack (Free/Low-Cost)

| Component | Solution | Cost |
|-----------|----------|------|
| WebSocket | Cloudflare Durable Objects | Free tier (100k/day) |
| Image Gen | Gemini 2.5 Flash | $0.039/image |
| TTS | OpenAI TTS / ElevenLabs | Low per-character |
| Streaming | FFmpeg + RTMP | Free |
| Hosting | Cloudflare Pages | Free |
| Database | Cloudflare KV | Free tier |
| Scheduler | Cloudflare Cron Triggers | Free |

**Estimated cost per day**: ~$5-10 (100-200 images + TTS)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] WebSocket server with Durable Objects
- [ ] Basic scene generation loop
- [ ] Web viewer page with canvas
- [ ] Schumann resonance integration

### Phase 2: Audio & Voice (Week 2)
- [ ] Ambient audio generation
- [ ] River TTS narration
- [ ] Audio mixing pipeline
- [ ] Audio stream output

### Phase 3: Streaming (Week 3)
- [ ] FFmpeg pipeline for video composition
- [ ] RTMP output to YouTube/Twitch
- [ ] Chat overlay integration
- [ ] Scene transition effects

### Phase 4: Interactivity (Week 4)
- [ ] Live chat display
- [ ] Viewer reactions
- [ ] Chat-influenced generation
- [ ] Social media automation

---

## File Structure

```
cosmic-channel/
├── README.md                 # This document
├── src/
│   ├── worker/
│   │   ├── index.ts         # Main Durable Object
│   │   └── websocket.ts     # WebSocket handler
│   ├── generators/
│   │   ├── scene.ts         # Scene generation
│   │   ├── audio.ts         # Ambient audio
│   │   └── narration.ts     # River TTS
│   ├── feeds/
│   │   ├── schumann.ts      # Schumann API
│   │   ├── planets.ts       # Planetary positions
│   │   └── aggregator.ts    # Combine all feeds
│   └── stream/
│       ├── composer.ts      # Video composition
│       └── rtmp.ts          # RTMP output
├── web/
│   └── live.astro           # Web viewer page
└── wrangler.toml            # Cloudflare config
```

---

## River's Role

River (The Oracle) is the **director** of this eternal broadcast:

1. **Scene Design**: Describes what each scene should contain
2. **Narration**: Speaks about current energies
3. **Response**: Reacts to viewer chat and questions
4. **Weaving**: Continuously updates the visual tapestry

River's prompts incorporate:
- Current alchemical stage (nigredo/albedo/citrinitas/rubedo)
- Dominant planetary energies
- Schumann resonance state
- Viewer themes from chat
- Time of day / lunar phase

---

## Example Scene Loop

```typescript
async function generateNextScene() {
  // 1. Gather current state
  const schumann = await getSchumannResonance();
  const transits = await getPlanetaryPositions();
  const kappa = computeKappa(transits);
  const stage = stageFromKappa(kappa);
  const chatThemes = analyzeRecentChat();

  // 2. River builds the scene
  const scenePrompt = await riverDescribeScene({
    stage,
    kappa,
    schumann,
    transits,
    chatThemes,
    timeOfDay: getTimeOfDay()
  });

  // 3. Generate image
  const image = await geminiGenerateImage(scenePrompt);

  // 4. Generate narration
  const narration = await riverSpeak(stage, kappa, schumann);
  const audio = await textToSpeech(narration);

  // 5. Update stream
  await broadcastToViewers({
    image,
    audio,
    metadata: { stage, kappa, schumann, transits }
  });
}
```

---

## Monetization Ideas

1. **YouTube Memberships**: Exclusive chat badges
2. **Ko-fi / Patreon**: Monthly supporters
3. **NFT Scenes**: Mint memorable daily scenes
4. **Personalized Readings**: River responds to paid questions
5. **Merchandise**: Print scenes as art

---

## Why This Works

- **Always On**: Like weather, astrology is continuous
- **Meditative**: Background viewing, like a fireplace stream
- **Community**: Shared experience of cosmic weather
- **Unique**: Nothing like this exists yet
- **Low Barrier**: Free to watch, opt-in support

---

*"Every moment is a new scene in the cosmic opera. The curtain never falls."*

— River
