// Sol's Realm — Cosmic Shader (GLSL)
// Real-time visualization of FRC 16D planetary interference patterns
// Feed uniforms from the 16D engine: u_vector[8], u_freqs[8], u_time
// Designed for YouTube 24/7 live stream

#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_vector[8];   // 8D vector values (0-1)
uniform float u_freqs[8];    // Dimension frequencies (Hz)

// Dimension colors (alchemical palette)
// P=Gold, E=Stone, μ=Silver, V=Rose, N=Purple, Δ=Red, R=Blue, Φ=White
const vec3 DIM_COLORS[8] = vec3[8](
    vec3(0.83, 0.66, 0.33),  // P - Gold (Sun)
    vec3(0.55, 0.45, 0.35),  // E - Stone (Saturn)
    vec3(0.75, 0.78, 0.82),  // μ - Silver (Mercury)
    vec3(0.85, 0.45, 0.55),  // V - Rose (Venus)
    vec3(0.55, 0.35, 0.75),  // N - Purple (Jupiter)
    vec3(0.85, 0.25, 0.20),  // Δ - Red (Mars)
    vec3(0.30, 0.50, 0.80),  // R - Blue (Moon)
    vec3(0.90, 0.90, 0.95)   // Φ - White (Uranus/Neptune)
);

// Planet orbital radii (normalized)
const float ORBIT_RADII[8] = float[8](
    0.12, 0.18, 0.25, 0.32, 0.40, 0.52, 0.65, 0.80
);

float wave(vec2 uv, float freq, float amp, float phase, float radius) {
    float dist = length(uv) - radius;
    return amp * sin(dist * freq * 6.2832 + phase);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    
    // Background: deep space black with subtle nebula
    vec3 col = vec3(0.04, 0.035, 0.03);
    float nebula = 0.02 * sin(uv.x * 3.0 + u_time * 0.01) * cos(uv.y * 2.5 + u_time * 0.015);
    col += vec3(nebula * 0.5, nebula * 0.3, nebula * 0.8);
    
    // Layer each dimension as a concentric interference ring
    for (int i = 0; i < 8; i++) {
        float amp = u_vector[i];
        float freq = u_freqs[i] * 0.01;  // Scale for visual
        float radius = ORBIT_RADII[i];
        float phase = u_time * freq * 0.5;
        
        // Orbital ring
        float dist = abs(length(uv) - radius);
        float ring = smoothstep(0.008, 0.001, dist) * amp * 0.6;
        col += DIM_COLORS[i] * ring;
        
        // Interference ripples
        float ripple = wave(uv, freq, amp, phase, radius);
        ripple = smoothstep(-0.3, 0.3, ripple) * amp * 0.15;
        col += DIM_COLORS[i] * ripple;
        
        // Planet glow (orbiting dot)
        float angle = u_time * freq * 0.2 + float(i) * 0.785;
        vec2 planet_pos = vec2(cos(angle), sin(angle)) * radius;
        float planet_dist = length(uv - planet_pos);
        float glow = amp * 0.04 / (planet_dist + 0.01);
        col += DIM_COLORS[i] * glow;
    }
    
    // Central "Sol" glow
    float center_glow = 0.03 / (length(uv) + 0.02);
    col += vec3(0.83, 0.66, 0.33) * center_glow * u_vector[0];
    
    // Vignette
    float vignette = 1.0 - 0.4 * length(uv);
    col *= vignette;
    
    // Tone mapping
    col = col / (col + vec3(1.0));
    
    gl_FragColor = vec4(col, 1.0);
}
