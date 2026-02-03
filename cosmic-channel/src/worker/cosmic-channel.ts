/**
 * Cosmic Channel - Automated Alchemical Theater
 *
 * Like a Renaissance automaton cabinet or cuckoo clock:
 * - Scenes generate automatically on the hour
 * - Figures move and animate based on cosmic time
 * - No human intervention needed - perpetual motion
 */

interface Env {
  COSMIC_CHANNEL: DurableObjectNamespace;
  SCENE_CACHE: KVNamespace;
  GEMINI_API_KEY: string;
  GEMINI_API_KEY_2?: string;
  GEMINI_API_KEY_3?: string;
  GEMINI_API_KEY_4?: string;
  GEMINI_API_KEY_5?: string;
  OPENAI_API_KEY?: string;
}

interface TheaterScene {
  id: string;
  imageData: string;
  act: number;           // 1-24 (hour of day)
  stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
  kappa: number;
  schumann: number;
  narration: string;
  timestamp: number;
  dayOfYear: number;
  planetaryHour: string;
  provider: string;
}

// Planetary hours - like a cosmic clock
const PLANETARY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function getPlanetaryHour(date: Date): string {
  const dayOfWeek = date.getUTCDay();
  const hour = date.getUTCHours();
  const dayRuler = DAY_RULERS[dayOfWeek];
  const dayRulerIndex = PLANETARY_RULERS.indexOf(dayRuler);
  const hourRulerIndex = (dayRulerIndex + hour) % 7;
  return PLANETARY_RULERS[hourRulerIndex];
}

function getStage(hour: number): 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo' {
  // Night (nigredo) -> Dawn (albedo) -> Day (citrinitas) -> Dusk (rubedo)
  if (hour >= 0 && hour < 6) return 'nigredo';
  if (hour >= 6 && hour < 12) return 'albedo';
  if (hour >= 12 && hour < 18) return 'citrinitas';
  return 'rubedo';
}

function computeKappa(date: Date): number {
  // Based on planetary hours and time
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  // Create a flowing wave pattern
  const hourWave = Math.sin((hour / 24) * Math.PI * 2);
  const minuteWave = Math.sin((minute / 60) * Math.PI * 2) * 0.1;
  const dayWave = Math.sin((dayOfYear / 365) * Math.PI * 2) * 0.2;

  return Math.max(0.1, Math.min(0.95, 0.5 + hourWave * 0.3 + minuteWave + dayWave));
}

function getSchumann(): number {
  // Simulate Schumann resonance around 7.83 Hz
  return 7.83 + (Math.random() - 0.5) * 0.4;
}

const STAGE_THEMES = {
  nigredo: {
    name: 'Nigredo',
    title: 'The Dark Night',
    archetype: 'The Hermit descending into contemplation',
    symbols: ['skull', 'raven', 'lead', 'eclipse'],
    mood: 'mysterious, introspective, dissolving',
    colors: 'deep obsidian, midnight blue, silver hints',
    light: '#1a1a2e'
  },
  albedo: {
    name: 'Albedo',
    title: 'The Purification',
    archetype: 'The Priestess holding the sacred mirror',
    symbols: ['white rose', 'silver moon', 'dove', 'pearl'],
    mood: 'serene, cleansing, crystalline',
    colors: 'silver, moonlit white, pale blue',
    light: '#f0f4f8'
  },
  citrinitas: {
    name: 'Citrinitas',
    title: 'The Dawning',
    archetype: 'The Magician at the golden hour',
    symbols: ['sunrise', 'phoenix', 'golden chalice', 'eye'],
    mood: 'illuminating, awakening, radiant',
    colors: 'gold, amber, warm honey',
    light: '#fef3c7'
  },
  rubedo: {
    name: 'Rubedo',
    title: 'The Integration',
    archetype: 'The Lovers united in sacred marriage',
    symbols: ['philosophers stone', 'red lion', 'crown', 'heart'],
    mood: 'triumphant, complete, unified',
    colors: 'deep crimson, rose gold, ruby',
    light: '#fecaca'
  }
};

function buildTheaterPrompt(scene: Partial<TheaterScene>): string {
  const theme = STAGE_THEMES[scene.stage || 'citrinitas'];
  const intensity = scene.kappa! > 0.7 ? 'blazing with power' :
                    scene.kappa! > 0.4 ? 'glowing steadily' :
                    'flickering gently';

  return `Create a scene for Act ${scene.act} of the Alchemical Theater:

SETTING: A grand mechanical theater stage - like a Renaissance automaton cabinet.
Deep red velvet curtains frame the scene. Golden clockwork gears turn slowly in the background.

CENTRAL FIGURE: ${theme.archetype}
The figure is ${intensity}, embodying the ${scene.stage} phase.
They move like a beautiful mechanical puppet - precise, graceful, eternal.

MECHANICAL ELEMENTS (like a cuckoo clock):
- Golden gears and celestial mechanisms turning
- Alchemical symbols rotating on brass wheels: ${theme.symbols.slice(0, 3).join(', ')}
- Tiny automaton figures in alcoves
- A brass astrolabe showing the current planetary hour (${scene.planetaryHour})

COLOR PALETTE: ${theme.colors}
ATMOSPHERE: ${theme.mood}

STYLE REQUIREMENTS:
- Museum-quality sacred automaton art
- Renaissance mechanical theater aesthetic
- Rich jewel tones with brass and gold accents
- Theatrical lighting with gentle shadows
- NO text, letters, words, or signatures
- 16:9 theatrical widescreen
- The scene should feel alive yet mechanical - like eternal clockwork

This is Act ${scene.act} of 24 in the daily cycle. Scene ${scene.dayOfYear} of the Cosmic Opera.`;
}

function generateNarration(scene: Partial<TheaterScene>): string {
  const theme = STAGE_THEMES[scene.stage || 'citrinitas'];
  const hour = scene.act || 12;

  const timeDescriptions: Record<string, string> = {
    nigredo: 'In the deep hours, the theater rests in contemplation',
    albedo: 'Dawn light filters through the silver curtains',
    citrinitas: 'Golden light floods the stage at high noon',
    rubedo: 'The evening sun paints everything in crimson'
  };

  const narrations = {
    nigredo: [
      'The mechanical dancers bow in shadow...',
      'Gears turn slowly in the darkness...',
      'The clockwork hermit descends into mystery...'
    ],
    albedo: [
      'Silver bells chime the hour of purification...',
      'The mirror reflects infinite possibilities...',
      'Crystal mechanisms catch the morning light...'
    ],
    citrinitas: [
      'Golden wheels spin with solar energy...',
      'The magician\'s hands weave patterns of light...',
      'Brass angels turn to face the zenith...'
    ],
    rubedo: [
      'The sacred marriage completes the cycle...',
      'Twin figures embrace in ruby light...',
      'The philosopher\'s stone glows at the heart...'
    ]
  };

  const stageNarrations = narrations[scene.stage || 'citrinitas'];
  const narration = stageNarrations[hour % stageNarrations.length];

  return `Act ${scene.act}: ${theme.title}. ${timeDescriptions[scene.stage || 'citrinitas']}. ${narration} The ${scene.planetaryHour} hour governs. Resonance: ${Math.round((scene.kappa || 0.5) * 100)}%.`;
}

// Image generation - use the Pages API which has key rotation already built in
async function generateImage(stage: string, kappa: number, date: string): Promise<{ imageData: string; provider: string }> {
  console.log('🎨 Calling Pages API for image generation...');

  try {
    const response = await fetch('https://therealmofpatterns.pages.dev/api/generate-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, kappa, date })
    });

    console.log(`Pages API response status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      if (data.imageData) {
        console.log(`✅ Image generated via ${data.provider || 'unknown'}`);
        return {
          imageData: data.imageData,
          provider: data.provider || 'pages-api'
        };
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Pages API error:', errorData);
    }
  } catch (e) {
    console.error('Pages API exception:', e);
  }

  throw new Error('Image generation failed');
}

// Generate a new theater scene
async function generateTheaterScene(env: Env): Promise<TheaterScene> {
  const now = new Date();
  const act = now.getUTCHours() + 1; // 1-24
  const stage = getStage(now.getUTCHours());
  const kappa = computeKappa(now);
  const schumann = getSchumann();
  const planetaryHour = getPlanetaryHour(now);
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  const sceneData: Partial<TheaterScene> = {
    act,
    stage,
    kappa,
    schumann,
    planetaryHour,
    dayOfYear,
    timestamp: now.getTime()
  };

  // Use the Pages API which has key rotation built in
  const { imageData, provider } = await generateImage(stage, kappa, now.toISOString());
  const narration = generateNarration(sceneData);

  const scene: TheaterScene = {
    id: `scene-${dayOfYear}-${act}`,
    imageData,
    act,
    stage,
    kappa,
    schumann,
    narration,
    timestamp: now.getTime(),
    dayOfYear,
    planetaryHour,
    provider
  };

  // Store in KV (if available)
  if (env.SCENE_CACHE) {
    try {
      await env.SCENE_CACHE.put('current-scene', JSON.stringify(scene), {
        expirationTtl: 7200 // 2 hours
      });
      await env.SCENE_CACHE.put(`scene-${dayOfYear}-${act}`, JSON.stringify(scene), {
        expirationTtl: 86400 // 24 hours
      });
      console.log('✅ Scene stored in KV');
    } catch (e) {
      console.error('KV storage error:', e);
    }
  }

  return scene;
}

// Durable Object for WebSocket connections AND scheduled generation
export class CosmicChannelDO {
  state: DurableObjectState;
  env: Env;
  sessions: Map<WebSocket, { id: string; connectedAt: number }>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();

    // Initialize the alarm on construction
    this.state.blockConcurrencyWhile(async () => {
      const alarm = await this.state.storage.getAlarm();
      if (!alarm) {
        // Set alarm for next hour
        const now = Date.now();
        const nextHour = Math.ceil(now / 3600000) * 3600000;
        await this.state.storage.setAlarm(nextHour);
        console.log(`⏰ Alarm set for next hour: ${new Date(nextHour).toISOString()}`);
      }
    });
  }

  // THE MECHANICAL CLOCK - runs every hour via alarm
  async alarm() {
    console.log('🎭 Clock strikes! Generating new scene...');

    try {
      const scene = await generateTheaterScene(this.env);
      console.log(`✨ Scene generated: Act ${scene.act}, ${scene.stage} (${scene.provider})`);

      // Broadcast to all connected viewers
      this.broadcast({ type: 'scene', data: scene });
    } catch (e) {
      console.error('Scene generation failed:', e);
    }

    // Set next alarm (next hour)
    const now = Date.now();
    const nextHour = Math.ceil(now / 3600000) * 3600000 + 3600000;
    await this.state.storage.setAlarm(nextHour);
    console.log(`⏰ Next alarm: ${new Date(nextHour).toISOString()}`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket();
    }

    switch (url.pathname) {
      case '/scene':
        return this.getCurrentScene();
      case '/generate':
        return this.triggerGeneration();
      case '/stats':
        return this.getStats();
      case '/start-clock':
        // Manually start the clock if needed
        const nextHour = Math.ceil(Date.now() / 3600000) * 3600000;
        await this.state.storage.setAlarm(nextHour);
        return new Response(JSON.stringify({ nextAlarm: new Date(nextHour).toISOString() }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      default:
        return new Response('Cosmic Channel Theater', { status: 200 });
    }
  }

  async handleWebSocket(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const id = `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.state.acceptWebSocket(server);
    this.sessions.set(server, { id, connectedAt: Date.now() });

    // Send current scene
    const scene = await this.env.SCENE_CACHE.get('current-scene');
    if (scene) {
      server.send(JSON.stringify({ type: 'scene', data: JSON.parse(scene) }));
    }

    this.broadcastStats();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      } else if (data.type === 'reaction') {
        this.broadcast({ type: 'reaction', data: { symbol: data.symbol, timestamp: Date.now() } });
      }
    } catch (e) {}
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    this.broadcastStats();
  }

  broadcast(message: any) {
    const payload = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      try { ws.send(payload); } catch { this.sessions.delete(ws); }
    }
  }

  broadcastStats() {
    this.broadcast({ type: 'stats', data: { viewers: this.sessions.size } });
  }

  async getCurrentScene(): Promise<Response> {
    const scene = await this.env.SCENE_CACHE.get('current-scene');
    return new Response(scene || '{}', {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  async triggerGeneration(): Promise<Response> {
    const scene = await generateTheaterScene(this.env);
    this.broadcast({ type: 'scene', data: scene });
    return new Response(JSON.stringify(scene), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  async getStats(): Promise<Response> {
    return new Response(JSON.stringify({ viewers: this.sessions.size }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// Worker entry point
export default {
  // HTTP requests
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Get current scene (public endpoint)
    if (url.pathname === '/scene' || url.pathname === '/api/scene') {
      const scene = await env.SCENE_CACHE.get('current-scene');
      return new Response(scene || '{"error": "No scene yet. Wait for the clock to strike."}', {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Manual trigger (for testing)
    if (url.pathname === '/generate') {
      const scene = await generateTheaterScene(env);
      return new Response(JSON.stringify(scene), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // WebSocket/live connections go to Durable Object
    if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/live')) {
      const id = env.COSMIC_CHANNEL.idFromName('main-theater');
      const obj = env.COSMIC_CHANNEL.get(id);
      return obj.fetch(request);
    }

    return new Response(JSON.stringify({
      name: 'Cosmic Channel - Alchemical Theater',
      description: 'A self-running mechanical theater that generates scenes on the hour',
      clock: 'Uses Durable Object alarms - perpetual motion machine',
      endpoints: {
        '/scene': 'Get current theater scene',
        '/generate': 'Manually trigger new scene',
        '/ws': 'WebSocket connection for live updates',
        '/live/start-clock': 'Initialize the hourly clock'
      }
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
