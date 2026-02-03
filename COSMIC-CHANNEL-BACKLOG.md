# Cosmic Channel - Feature Backlog

> The Automated Alchemical Theater - A perpetual art machine

## Priority: Live & Interactive

### Live Code & Movements
- [ ] CSS animations on scene images (floating symbols, drifting particles)
- [ ] Subtle parallax on mouse/device movement
- [ ] Rotating gears in frame corners (clockwork aesthetic)
- [ ] Curtain "breathing" animation (subtle movement)
- [ ] Ken Burns effect - slow zoom/pan across scenes
- [ ] Hourly transition: curtain close → new scene → curtain open
- [ ] WebGL shaders for dynamic lighting effects
- [ ] Canvas-based particle systems (alchemical sparks, motes)

### Social Media Live Integration
- [ ] Stream to YouTube Live / Twitch as 24/7 channel
- [ ] Auto-post new scenes to Twitter/X with narration
- [ ] Instagram story automation (scene + narration overlay)
- [ ] TikTok integration (time-lapse of daily cycle)
- [ ] Discord webhook for scene updates
- [ ] Telegram channel: daily sunrise scene + River voice notes
- [ ] OBS integration for streaming overlay

---

## The Living Archive
- [ ] Permanent scene URLs: `/scene/2026/34/21` (year/day/act)
- [ ] Gallery view: scroll through all generated scenes
- [ ] "This day last year" - cyclical memory feature
- [ ] Scene history API with pagination
- [ ] Export scenes as high-res images
- [ ] Daily/weekly/monthly compilation videos (auto-generated)

---

## Sound Layer
- [ ] Generative ambient per stage:
  - Nigredo: deep drones, distant bells, cave reverb
  - Albedo: crystalline tones, water sounds, silver bells
  - Citrinitas: warm hums, rising frequencies, solar brightness
  - Rubedo: heartbeat rhythms, fire crackle, completion tones
- [ ] Web Audio API procedural generation (never loops)
- [ ] Schumann resonance (7.83Hz) as binaural undertone
- [ ] Volume tied to kappa intensity
- [ ] Mute/unmute with smooth fade
- [ ] Background music radio stream option

---

## River's Voice
- [ ] Text-to-speech narration (ElevenLabs / OpenAI TTS)
- [ ] River speaks when scene changes
- [ ] Voice quality varies by stage:
  - Nigredo: whisper, distant
  - Albedo: clear, reflective
  - Citrinitas: warm, present
  - Rubedo: full, embodied
- [ ] Optional (mutable)
- [ ] Telegram voice message integration

---

## Synchronicity Engine
- [ ] "X souls watching" - anonymous viewer count
- [ ] Shared reactions float up from all viewers
- [ ] Global "pulse" when new scene generates
- [ ] Everyone sees curtain rise together (synced transition)
- [ ] Ephemeral presence - no accounts, no history
- [ ] Reaction symbols: ☉ ☽ ☿ ♀ ♂ ♃ ♄ ✨

---

## Temporal Features
- [ ] Dawn/dusk push notifications (stage transitions)
- [ ] Personal planetary hour display (viewer's local time)
- [ ] Astronomical event integration (eclipses, retrogrades, conjunctions)
- [ ] Special scenes on real celestial events
- [ ] Mercury retrograde = glitchier aesthetic
- [ ] Moon phase influence on albedo scenes
- [ ] Solstice/equinox special 24-hour cycles

---

## Personalization (Opt-in)
- [ ] Birth chart input for personalized experience
- [ ] "Your scene" - transits to natal chart
- [ ] Personal planetary hour calculator
- [ ] Daily horoscope integration with scene
- [ ] The theater as mirror, not just window

---

## Physical Manifestation
- [ ] Raspberry Pi + e-ink display recipe
- [ ] Updates hourly - digital altar piece
- [ ] Old tablet permanent display mode
- [ ] Print-on-demand: today's scene as poster
- [ ] Weekly scene compilation printed as zine

---

## Technical Infrastructure
- [ ] Scene caching in R2 (cheaper than base64 in KV)
- [ ] CDN for image delivery
- [ ] WebSocket scaling (multiple DO instances)
- [ ] Fallback static image if generation fails
- [ ] Health monitoring & alerts
- [ ] Cost tracking dashboard
- [ ] A/B test different prompt styles

---

## Anti-Features (Keep Sacred)
- [x] No likes
- [x] No comments
- [x] No metrics shown to users
- [x] No "share to social" buttons
- [x] No user accounts required
- [x] No optimization for engagement
- [x] It just IS

---

## Completed
- [x] Automated hourly scene generation (DO alarms)
- [x] Multi-provider image generation (Gemini 11-key + OpenAI fallback)
- [x] KV storage for scene persistence
- [x] Planetary hour calculation
- [x] Stage transitions based on time
- [x] WebSocket live connection
- [x] Theater page with curtains
- [x] Live page with chat/reactions UI

---

## Notes

**Philosophy**: This is art infrastructure, not content. A cathedral clock with automata - built once, runs forever, tells cosmic time through symbolic figures. But this one paints itself anew each hour.

**Cost estimate**: ~$5-15/day for 24 DALL-E generations (with Gemini as primary when quota allows)

**Next session priorities**:
1. Connect theater page to auto-load current scene
2. Add CSS animations (floating symbols, curtain breathing)
3. Social media auto-posting pipeline

---

*Last updated: 2026-02-03*
