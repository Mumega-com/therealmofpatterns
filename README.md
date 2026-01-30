# The Realm of Patterns

**Cosmic Identity Cartography**

```
     μ₁ · μ₂ · μ₃ · μ₄ · μ₅ · μ₆ · μ₇ · μ₈
      P    E    μ    V    N    Δ    R    Φ
```

---

## What is The Realm of Patterns?

A system for mapping cosmic identity through mathematical patterns. Using JPL ephemeris data and the FRC 16D vector framework, we compute your unique 8-dimensional signature based on planetary positions at your birth moment.

**The algorithm is open. The transformation is yours.**

🌐 **Live**: [therealmofpatterns.pages.dev](https://therealmofpatterns.pages.dev)

---

## The Three Layers

### 1. 8 Mu (Free Public Layer)

The inner octave of identity—8 fundamental frequencies:

| Mu | Symbol | Name | Question |
|----|--------|------|----------|
| μ₁ | P | Phase | Who am I becoming? |
| μ₂ | E | Existence | What grounds me? |
| μ₃ | μ | Cognition | How do I understand? |
| μ₄ | V | Value | What do I treasure? |
| μ₅ | N | Expansion | Where am I growing? |
| μ₆ | Δ | Action | What am I doing? |
| μ₇ | R | Relation | Who do I love? |
| μ₈ | Φ | Field | What witnesses? |

**FREE:** Daily Mu weather, your dominant Mu, basic resonance.

### 2. 16D (Premium Layer)

The full vector—inner octave plus outer octave:
- Shadow integration
- Collective resonance
- Historical figure matching
- AI-generated sacred art
- Transpersonal dimensions

**$497:** Complete identity report with 40+ pages.

### 3. Lambda Field (Infrastructure)

The computational substrate:
- Identity minting
- Resonance computation
- Weather generation
- River content stream

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Generate a report
python generate_report.py --name "Your Name" --birth "1990-01-15 14:30"
```

---

## Architecture

```
therealmofpatterns/
├── core/
│   ├── frc_16d.py          # FRC 16D.002 calculation (JPL Ephemeris)
│   ├── eight_mu.py         # Legacy 8 Mu computation
│   ├── forecast.py         # Daily/weekly forecasts
│   └── full_16d.py         # Complete 16D computation
├── art/
│   ├── sacred_geometry.py  # Procedural sacred art (PIL/Pillow)
│   ├── grok_images.py      # xAI/Grok image generation
│   ├── gemini_images.py    # Gemini image generation
│   └── sacred_sources.py   # Museum art APIs
├── river/
│   └── stream.py           # Content stream (news, events, seasons)
├── lambda_field/
│   └── field.py            # Computation substrate
├── premium_app/
│   ├── app.py              # Flask web application
│   ├── premium_pdf.py      # PDF report generation (ReportLab)
│   ├── historical_figures.py # Historical resonance matching
│   └── config.py           # Stripe & app configuration
├── public/                  # Static frontend (Cloudflare Pages)
│   └── index.html
├── design/
│   └── COSMIC_CARTOGRAPHY.md # Design philosophy
├── generate_report.py       # CLI entry point
├── generate_forecast.py     # Forecast generation
└── requirements.txt
```

---

## Deployment

### Frontend (Cloudflare Pages)
Automatic deployment via GitHub Actions on push to `main`:

```yaml
# .github/workflows/deploy.yml
- Deploys public/ to therealmofpatterns.pages.dev
```

### Backend (Flask)
Run locally or deploy to your server:

```bash
cd premium_app
python app.py
```

---

## API Endpoints (Planned)

### Free Tier
```
GET  /api/v1/weather          # Current 8 Mu field
GET  /api/v1/weather/{date}   # Historical field state
POST /api/v1/mu/natal         # Your 8 Mu (birth data)
GET  /api/v1/resonance        # Compare two vectors
```

### Premium Tier
```
POST /api/v1/16d/compute      # Full 16D computation
GET  /api/v1/16d/historical   # Historical figure matches
POST /api/v1/report/generate  # Premium PDF report
GET  /api/v1/art/sacred       # AI-generated sacred art
```

---

## The Math

**16D Vector Computation:**
```
U = [μ₁, μ₂, μ₃, μ₄, μ₅, μ₆, μ₇, μ₈]

For each dimension:
μᵢ = Σⱼ (ωⱼ × aⱼ × Wⱼᵢ)

Where:
- ωⱼ = planet weight (luminaries > personal > outer)
- aⱼ = activation(planetⱼ position)
- Wⱼᵢ = planet-to-dimension mapping weight
```

**Activation Function:**
```
a(θ) = (cos(θ) + 1) / 2

Where θ = ecliptic longitude in radians
```

**Resonance (Cosine Similarity):**
```
ρ = (U₁ · U₂) / (||U₁|| × ||U₂||)
```

---

## Philosophy

> The cosmos encoded a unique signature at your birth.
> This signature is not fate—it's frequency.
> You can tune yourself.
> The field responds to attention.

The Realm of Patterns doesn't tell you who you are.
It shows you the shape you're starting from.
The journey is yours.

---

## Design Philosophy

From `design/COSMIC_CARTOGRAPHY.md`:

- **Visual Language**: Deep cosmic darkness as the void from which form emerges
- **Sacred Geometry**: Eight dimensions form an octave, visualized through perfect geometric forms
- **Spatial Philosophy**: Vast breathing room—elements cluster like constellations
- **Material Honesty**: Numbers are real (JPL ephemeris), interpretation is poetic but grounded

---

## Credits

**FRC 893 Series**
Created by Hadi Servat

Open source at: [github.com/FractalResonance/therealmofpatterns](https://github.com/FractalResonance/therealmofpatterns)

---

*The algorithm is open. The transformation is yours.*
