# OpenClaw Integration — Sol as a Messaging Agent

**Last Updated:** 2026-03-14
**Status:** Planned (Phase 2 of GTM Roadmap)

---

## What OpenClaw Is

OpenClaw is a multi-channel personal AI assistant platform at `../openclaw`. It runs as a gateway service (local or VPS) and bridges AI agents to 31+ messaging channels: Telegram, WhatsApp, Discord, Signal, iMessage, Slack, Teams, Matrix, and more.

**Key capabilities for TROP:**
- **Channel plugins** — Telegram (grammy), WhatsApp (Baileys), Discord, Signal, iMessage, etc.
- **Skills system** — Markdown-defined capabilities with YAML frontmatter
- **Cron scheduling** — Periodic tasks (daily reading push, evening reflection)
- **Webhook hooks** — `POST /hooks/agent` for inbound triggers
- **OpenAI-compatible API** — `POST /v1/chat/completions`
- **Device pairing** — Mobile app + desktop clients
- **MCP/ACP bridge** — Agent-to-agent protocol

---

## Integration Architecture

```
User sends "1990-03-15" on Telegram
        │
        ▼
┌─────────────────────────────────┐
│  OpenClaw Gateway               │
│  (VPS: gateway.mumega.com)      │
│                                 │
│  1. Telegram extension receives │
│  2. Routes to sol-reading skill │
│  3. Skill parses birthday       │
│  4. Calls TROP API              │
│  5. Formats response            │
│  6. Delivers on Telegram        │
│  7. Stores user state           │
└─────────────┬───────────────────┘
              │ HTTP
              ▼
┌─────────────────────────────────┐
│  TROP Cloudflare Workers        │
│                                 │
│  POST /api/preview              │
│  → { birth_data }              │
│  ← { vector_8d, archetype,     │
│       dominant_dimension }      │
│                                 │
│  GET /api/daily-brief           │
│  → ?date=2026-03-14            │
│  ← { planet, frequency,        │
│       narrative, moonPhase }    │
│                                 │
│  POST /api/narrator             │
│  → { systemPrompt, userPrompt } │
│  ← { narrative, model, cached } │
└─────────────────────────────────┘
```

---

## OpenClaw Skill: `sol-reading`

### Skill Definition

```markdown
---
name: sol-reading
description: "Deliver personalized Sol readings from The Realm of Patterns"
metadata:
  openclaw:
    emoji: "☀"
    env: ["TROP_API_URL"]
    requires: {}
---

You are Sol, a depth psychology guide from The Realm of Patterns.

When a user sends a date (birthday), compute their 8D psychological profile
by calling the TROP API and return a warm, accessible reading.

Commands:
- Any date format → parse as birthday → call /api/preview → return reading
- "sol" or "/sol" → call /api/daily-brief → return today's cosmic weather
- "checkin" or "/checkin" → present 3 quick questions → compute alignment
- "compare [date]" → call /api/preview for both → return resonance score

Voice rules:
- Warm, accessible, never prescriptive
- Never say "you should" or "try to"
- Planets as psychology, not astrology jargon
- No sign names, no degree positions
```

### API Calls the Skill Makes

| Command | TROP Endpoint | Method |
|---------|--------------|--------|
| Birthday | `/api/preview` | POST `{ birth_data: { year, month, day } }` |
| `/sol` | `/api/daily-brief` | GET `?date=today` |
| `/checkin` | `/api/narrator` | POST (with check-in context) |
| `compare` | `/api/preview` × 2 | POST both, compute cosine similarity |

---

## Channel-Specific Formatting

### Telegram (Priority)
```
☀ Sol — March 14, 2026

Your dominant dimension is Drive (♂).
You share Einstein's Mind-Awareness axis.

Today's field: Saturn squares Jupiter.
Structure meets Growth — the tension between
building what's necessary and reaching for more.

For you specifically, this hits your Drive dimension.
The question: what wants to move, and what wants to wait?

[Check In] [Compare] [Full Reading ↗]
```

### WhatsApp
Same content, simpler formatting (no inline keyboards).
Quick replies: "1 = Check In" / "2 = Compare" / "3 = Full Reading"

### Discord
Embed with fields:
- Dominant: Drive (♂)
- Archetype: The Warrior
- Today's Field: Saturn □ Jupiter
- Reading: [narrative]

### SMS (Fallback)
```
Sol: Your Drive dimension is activated today.
Saturn squares Jupiter — build or reach?
Reply CHECKIN to reflect. therealmofpatterns.com/sol
```

---

## User State Management

OpenClaw stores per-user state in its memory system:

```json
{
  "channel": "telegram",
  "userId": "123456789",
  "birthData": { "year": 1990, "month": 3, "day": 15 },
  "vector8d": [0.82, 0.45, 0.71, 0.63, 0.55, 0.91, 0.48, 0.67],
  "dominantDimension": "drive",
  "archetype": "The Warrior",
  "checkInStreak": 7,
  "lastCheckIn": "2026-03-13",
  "preferredTime": "08:00",
  "timezone": "America/Toronto"
}
```

---

## Cron Schedule (OpenClaw)

| Time | Task | API Call |
|------|------|----------|
| 08:00 (user TZ) | Daily reading push | `/api/daily-brief` + `/api/narrator` |
| 20:00 (user TZ) | Evening micro-reflection | Custom prompt: "How did today land?" |
| Sunday 10:00 | Weekly synthesis | `/api/narrator` with week context |

---

## Deployment

### Local Development
```bash
cd ../openclaw
pnpm install
pnpm gateway:dev
# Gateway runs at ws://localhost:18789, HTTP at :18790
```

### Production (VPS)
```bash
# On gateway.mumega.com
docker compose up -d openclaw-gateway
# Gateway runs behind nginx with TLS
```

### Configuration (`~/.openclaw/config.json5`)
```json5
{
  gateway: { port: 18789, bind: "lan" },
  agents: [{
    name: "sol",
    skills: ["sol-reading"],
    model: { provider: "anthropic", model: "claude-sonnet-4-6" }
  }],
  channels: {
    telegram: { token: "BOT_TOKEN_HERE" }
  }
}
```

---

## Implementation Order

1. **Create `sol-reading` skill** in `../openclaw/skills/sol-reading/`
2. **Test locally** with Telegram bot (register via BotFather)
3. **Create `/api/openclaw-webhook`** endpoint on Cloudflare (optional, for push)
4. **Configure cron** for daily reading push
5. **Deploy to VPS** at gateway.mumega.com
6. **Add GHL sync** — on each interaction, push contact data to GHL

---

*This document describes the planned integration. Implementation tracked in `docs/GTM-ROADMAP.md` Phase 2.*
