#!/usr/bin/env python3
"""
Sol's Realm — Cosmic Audio Synthesizer
Generates audio frequencies from real-time planetary positions using FRC 16D.002 + Hans Cousto's Cosmic Octave.

Usage:
    python3 cosmic_audio.py                    # Generate 60s WAV for current sky
    python3 cosmic_audio.py --duration 300     # 5 minute meditation
    python3 cosmic_audio.py --natal 1986-11-29 # Generate natal frequency blend
"""

import numpy as np
import wave
import struct
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Tuple

try:
    from frc_16d import natal, now, DIM_NAMES, DIM_FULL, PLANET_NAMES, W, OMEGA
except ImportError:
    from .frc_16d import natal, now, DIM_NAMES, DIM_FULL, PLANET_NAMES, W, OMEGA

# ═══════════════════════════════════════════════════════════════════════════════
# HANS COUSTO COSMIC OCTAVE — Planetary Frequencies (Hz)
# Based on synodic orbital periods, octave-shifted to audible range
# ═══════════════════════════════════════════════════════════════════════════════

PLANET_FREQ = {
    'Sun': 126.22,
    'Moon': 210.42,
    'Mercury': 141.27,
    'Venus': 221.23,
    'Mars': 144.72,
    'Jupiter': 183.58,
    'Saturn': 147.85,
    'Uranus': 207.36,
    'Neptune': 211.44,
    'Pluto': 140.64
}

# Dimension → Contributing Planets (from W matrix)
DIM_PLANET_MAP = {
    'P': ['Sun', 'Mars', 'Saturn'],
    'E': ['Saturn', 'Venus'],
    'μ': ['Mercury', 'Neptune', 'Pluto'],
    'V': ['Venus', 'Moon', 'Mars', 'Pluto'],
    'N': ['Jupiter', 'Mercury', 'Neptune'],
    'Δ': ['Mars', 'Sun', 'Saturn', 'Uranus'],
    'R': ['Moon', 'Venus', 'Pluto'],
    'Φ': ['Uranus', 'Neptune', 'Moon']
}

SAMPLE_RATE = 44100


def generate_tone(freq: float, amplitude: float, duration: float, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """Generate a sine wave with slow amplitude modulation (breathing effect)."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    # Base sine wave
    wave_data = np.sin(2 * np.pi * freq * t)
    # Slow breathing modulation (0.05 Hz = one breath every 20 seconds)
    breath = 0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * t)
    # Fade in/out (2 seconds each)
    fade_samples = int(2 * sample_rate)
    fade_in = np.linspace(0, 1, min(fade_samples, len(t)))
    fade_out = np.linspace(1, 0, min(fade_samples, len(t)))
    envelope = np.ones(len(t))
    envelope[:len(fade_in)] *= fade_in
    envelope[-len(fade_out):] *= fade_out
    return wave_data * amplitude * breath * envelope


def generate_cosmic_audio(vector_8d: List[float], duration: float = 60.0, output_path: str = "cosmic_weather.wav") -> str:
    """
    Generate a WAV file from the 8D cosmic vector.
    Each dimension becomes a frequency layer, amplitude = dimension value.
    """
    samples = np.zeros(int(SAMPLE_RATE * duration))

    for i, dim in enumerate(DIM_NAMES):
        planets = DIM_PLANET_MAP[dim]
        # Weighted average frequency for this dimension
        freqs = [PLANET_FREQ[p] for p in planets]
        dim_freq = sum(freqs) / len(freqs)
        amplitude = vector_8d[i] * 0.12  # Scale to prevent clipping

        # Generate the tone for this dimension
        tone = generate_tone(dim_freq, amplitude, duration)
        samples += tone

        # Add subtle harmonic (octave above, quieter)
        harmonic = generate_tone(dim_freq * 2, amplitude * 0.15, duration)
        samples += harmonic

    # Normalize to prevent clipping
    max_val = np.max(np.abs(samples))
    if max_val > 0:
        samples = samples / max_val * 0.85

    # Write WAV
    with wave.open(output_path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        for sample in samples:
            wav_file.writeframes(struct.pack('h', int(sample * 32767)))

    return output_path


def generate_interference_pattern(vec1: List[float], vec2: List[float], duration: float = 60.0, output_path: str = "interference.wav") -> str:
    """
    Generate interference pattern between two 8D vectors (e.g., natal vs transit).
    Creates binaural-beat-like effects from the frequency difference.
    """
    samples_L = np.zeros(int(SAMPLE_RATE * duration))
    samples_R = np.zeros(int(SAMPLE_RATE * duration))

    for i, dim in enumerate(DIM_NAMES):
        planets = DIM_PLANET_MAP[dim]
        freqs = [PLANET_FREQ[p] for p in planets]
        base_freq = sum(freqs) / len(freqs)

        # Left channel: natal (karma) frequency
        amp1 = vec1[i] * 0.12
        tone1 = generate_tone(base_freq, amp1, duration)
        samples_L += tone1

        # Right channel: transit (dharma) frequency, slightly detuned by gap
        gap = vec2[i] - vec1[i]
        detune = base_freq + (gap * 5)  # 5 Hz max detune based on gap
        amp2 = vec2[i] * 0.12
        tone2 = generate_tone(detune, amp2, duration)
        samples_R += tone2

    # Normalize both channels
    for ch in [samples_L, samples_R]:
        max_val = np.max(np.abs(ch))
        if max_val > 0:
            ch /= max_val
            ch *= 0.85

    # Write stereo WAV
    with wave.open(output_path, 'w') as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        for l, r in zip(samples_L, samples_R):
            wav_file.writeframes(struct.pack('hh', int(l * 32767), int(r * 32767)))

    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sol's Realm — Cosmic Audio Synthesizer")
    parser.add_argument("--duration", type=float, default=60.0, help="Duration in seconds (default: 60)")
    parser.add_argument("--natal", type=str, help="Birth date (YYYY-MM-DD) for natal frequency blend")
    parser.add_argument("--interference", action="store_true", help="Generate interference pattern (natal vs transit)")
    parser.add_argument("--output", type=str, default=None, help="Output file path")
    args = parser.parse_args()

    sky = now()
    sky_vec = sky['vector']

    print(f"🪐 Current Sky: {sky['signature']} | Dominant: {sky['dominant']['name']}")
    print(f"⏱  Duration: {args.duration}s")

    if args.natal:
        parts = args.natal.split('-')
        birth_dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 12, 0)
        natal_data = natal(birth_dt)
        natal_vec = natal_data['vector']
        print(f"🧬 Natal Signature: {natal_data['signature']}")

        if args.interference:
            out = args.output or "cosmic_interference.wav"
            generate_interference_pattern(natal_vec, sky_vec, args.duration, out)
            print(f"🎶 Interference pattern saved: {out}")
        else:
            out = args.output or "natal_frequency.wav"
            generate_cosmic_audio(natal_vec, args.duration, out)
            print(f"🎶 Natal audio saved: {out}")
    else:
        out = args.output or "cosmic_weather.wav"
        generate_cosmic_audio(sky_vec, args.duration, out)
        print(f"🎶 Cosmic weather audio saved: {out}")
