/**
 * Cosmic Channel - Durable Object for Live Alchemical Broadcast
 *
 * This Durable Object maintains:
 * - WebSocket connections to all viewers
 * - Current scene state
 * - Scene generation scheduling
 * - Real-time data aggregation
 */

interface Env {
  COSMIC_CHANNEL: DurableObjectNamespace;
  GEMINI_API_KEY: string;
  GEMINI_API_KEY_2?: string;
  SCENE_CACHE?: KVNamespace;
}

interface SceneState {
  imageUrl: string;
  stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
  kappa: number;
  schumann: number;
  narration: string;
  timestamp: number;
  sceneNumber: number;
}

interface ViewerMessage {
  type: 'chat' | 'reaction' | 'ping';
  content?: string;
  symbol?: string;
  userId?: string;
}

interface BroadcastMessage {
  type: 'scene' | 'chat' | 'stats' | 'narration';
  data: any;
}

// Schumann resonance API (placeholder - real implementation would use actual API)
async function getSchumannResonance(): Promise<number> {
  // Real implementation: fetch from heartmath.org or similar
  // For now, return a value around 7.83 Hz with some variation
  const baseFreq = 7.83;
  const variation = (Math.random() - 0.5) * 0.5; // ±0.25 Hz
  return baseFreq + variation;
}

// Compute kappa from current transits (simplified)
function computeCurrentKappa(): number {
  // Real implementation would use the FRC 16D engine
  // For now, vary based on time of day
  const hour = new Date().getUTCHours();
  const base = 0.5;
  const variation = Math.sin((hour / 24) * Math.PI * 2) * 0.3;
  return Math.max(0, Math.min(1, base + variation));
}

function stageFromKappa(kappa: number): 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo' {
  if (kappa < 0.25) return 'nigredo';
  if (kappa < 0.5) return 'albedo';
  if (kappa < 0.75) return 'citrinitas';
  return 'rubedo';
}

export class CosmicChannelDO {
  state: DurableObjectState;
  env: Env;
  sessions: Map<WebSocket, { userId: string; connectedAt: number }>;
  currentScene: SceneState | null;
  sceneInterval: number | null;
  chatHistory: { userId: string; content: string; timestamp: number }[];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.currentScene = null;
    this.sceneInterval = null;
    this.chatHistory = [];

    // Initialize state from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('currentScene');
      if (stored) {
        this.currentScene = stored as SceneState;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // API endpoints
    switch (url.pathname) {
      case '/scene':
        return this.getCurrentScene();
      case '/generate':
        return this.triggerSceneGeneration();
      case '/stats':
        return this.getStats();
      default:
        return new Response('Cosmic Channel Durable Object', { status: 200 });
    }
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const userId = `viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.state.acceptWebSocket(server);
    this.sessions.set(server, { userId, connectedAt: Date.now() });

    // Send current state to new viewer
    if (this.currentScene) {
      server.send(JSON.stringify({
        type: 'scene',
        data: this.currentScene
      }));
    }

    // Send viewer count update to all
    this.broadcastStats();

    // Start scene generation if this is the first viewer
    if (this.sessions.size === 1) {
      this.startSceneLoop();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data: ViewerMessage = JSON.parse(message as string);
      const session = this.sessions.get(ws);

      switch (data.type) {
        case 'chat':
          if (data.content && session) {
            this.handleChat(session.userId, data.content);
          }
          break;
        case 'reaction':
          if (data.symbol) {
            this.handleReaction(data.symbol);
          }
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    this.broadcastStats();

    // Stop scene loop if no viewers
    if (this.sessions.size === 0 && this.sceneInterval) {
      clearInterval(this.sceneInterval);
      this.sceneInterval = null;
    }
  }

  handleChat(userId: string, content: string) {
    const chatMessage = {
      userId,
      content: content.slice(0, 200), // Limit message length
      timestamp: Date.now()
    };

    this.chatHistory.push(chatMessage);

    // Keep only last 100 messages
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }

    // Broadcast to all viewers
    this.broadcast({
      type: 'chat',
      data: chatMessage
    });
  }

  handleReaction(symbol: string) {
    // Validate symbol
    const validSymbols = ['☉', '☽', '☿', '♀', '♂', '♃', '♄', '❤️', '✨', '🔥', '💧', '🌙'];
    if (!validSymbols.includes(symbol)) return;

    this.broadcast({
      type: 'reaction',
      data: { symbol, timestamp: Date.now() }
    });
  }

  broadcast(message: BroadcastMessage) {
    const payload = JSON.stringify(message);
    for (const ws of this.sessions.keys()) {
      try {
        ws.send(payload);
      } catch (e) {
        // Connection might be closed
        this.sessions.delete(ws);
      }
    }
  }

  broadcastStats() {
    this.broadcast({
      type: 'stats',
      data: {
        viewerCount: this.sessions.size,
        sceneNumber: this.currentScene?.sceneNumber || 0,
        uptime: this.currentScene ? Date.now() - this.currentScene.timestamp : 0
      }
    });
  }

  startSceneLoop() {
    // Generate new scene every 5 minutes
    const intervalMs = 5 * 60 * 1000;

    // Generate first scene immediately
    this.generateScene();

    // Then schedule regular generation
    this.sceneInterval = setInterval(() => {
      this.generateScene();
    }, intervalMs) as unknown as number;
  }

  async generateScene() {
    try {
      const schumann = await getSchumannResonance();
      const kappa = computeCurrentKappa();
      const stage = stageFromKappa(kappa);

      // Build prompt
      const prompt = this.buildScenePrompt(stage, kappa, schumann);

      // Generate image
      const imageUrl = await this.callGeminiImageAPI(prompt);

      // Generate narration
      const narration = this.generateNarration(stage, kappa, schumann);

      // Create scene state
      const sceneNumber = (this.currentScene?.sceneNumber || 0) + 1;
      const newScene: SceneState = {
        imageUrl,
        stage,
        kappa,
        schumann,
        narration,
        timestamp: Date.now(),
        sceneNumber
      };

      this.currentScene = newScene;
      await this.state.storage.put('currentScene', newScene);

      // Broadcast to all viewers
      this.broadcast({
        type: 'scene',
        data: newScene
      });

      // Also broadcast narration separately for TTS
      this.broadcast({
        type: 'narration',
        data: { text: narration, sceneNumber }
      });

    } catch (e) {
      console.error('Scene generation error:', e);
    }
  }

  buildScenePrompt(
    stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo',
    kappa: number,
    schumann: number
  ): string {
    const stageThemes = {
      nigredo: {
        archetype: 'The Hermit in contemplation',
        mood: 'mysterious, introspective',
        colors: 'deep blacks, midnight blues, silver hints'
      },
      albedo: {
        archetype: 'The Priestess holding a mirror',
        mood: 'serene, cleansing, clear',
        colors: 'silver, white, pale blue'
      },
      citrinitas: {
        archetype: 'The Magician at golden dawn',
        mood: 'illuminating, awakening',
        colors: 'gold, amber, warm yellow'
      },
      rubedo: {
        archetype: 'The sacred marriage of opposites',
        mood: 'triumphant, unified, complete',
        colors: 'deep red, rose, crimson gold'
      }
    };

    const theme = stageThemes[stage];
    const schumannState = schumann > 8 ? 'elevated' : schumann < 7.5 ? 'calm' : 'balanced';
    const intensity = kappa > 0.7 ? 'powerful' : kappa > 0.4 ? 'steady' : 'subtle';

    return `Create a live broadcast scene for the Cosmic Channel:

SETTING: An ethereal alchemical stage in continuous transformation.
The Schumann resonance is ${schumannState} at ${schumann.toFixed(2)} Hz.

CENTRAL IMAGE: ${theme.archetype}
The energy is ${intensity} at ${Math.round(kappa * 100)}% resonance.

VISUAL ELEMENTS:
- Sacred geometry subtly animated in the background
- Alchemical symbols floating: ☿ ☽ ☉ ♄
- Color palette: ${theme.colors}
- The ${stage} phase atmosphere

MOOD: ${theme.mood}

STYLE:
- Museum-quality hermetic sacred art
- Suitable for continuous viewing (meditative, not jarring)
- NO text, letters, or words
- 16:9 aspect ratio
- Gentle transitions implied in composition

This is a frame from an eternal cosmic broadcast.`;
  }

  async callGeminiImageAPI(prompt: string): Promise<string> {
    const apiKey = this.env.GEMINI_API_KEY;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error('No image in response');
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }

  generateNarration(
    stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo',
    kappa: number,
    schumann: number
  ): string {
    const hour = new Date().getUTCHours();
    const timeOfDay = hour < 6 ? 'deep night' :
                      hour < 12 ? 'morning' :
                      hour < 18 ? 'afternoon' : 'evening';

    const stageNarrations = {
      nigredo: [
        'In the dark before dawn, transformation gestates.',
        'What dissolves creates space for what will emerge.',
        'The shadow holds wisdom for those who listen.'
      ],
      albedo: [
        'Clarity rises like the moon through clouds.',
        'What was hidden now reveals its truth.',
        'Silver light washes away what no longer serves.'
      ],
      citrinitas: [
        'Golden light breaks through the threshold.',
        'Wisdom blazes forth from integration.',
        'The solar eye opens to illuminate the path.'
      ],
      rubedo: [
        'The Great Work approaches completion.',
        'What was two becomes one in sacred union.',
        'The philosopher\'s stone manifests within.'
      ]
    };

    const narrations = stageNarrations[stage];
    const narration = narrations[Math.floor(Math.random() * narrations.length)];

    const schumannNote = schumann > 8
      ? 'Earth\'s heartbeat quickens.'
      : schumann < 7.5
      ? 'Earth rests in stillness.'
      : 'Earth breathes in harmony.';

    return `${narration} At ${Math.round(kappa * 100)}% resonance this ${timeOfDay}, ${schumannNote}`;
  }

  async getCurrentScene(): Promise<Response> {
    return new Response(JSON.stringify(this.currentScene), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async triggerSceneGeneration(): Promise<Response> {
    await this.generateScene();
    return new Response(JSON.stringify({ success: true, scene: this.currentScene }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getStats(): Promise<Response> {
    return new Response(JSON.stringify({
      viewerCount: this.sessions.size,
      sceneNumber: this.currentScene?.sceneNumber || 0,
      currentStage: this.currentScene?.stage,
      kappa: this.currentScene?.kappa,
      schumann: this.currentScene?.schumann
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Worker entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route to Durable Object
    if (url.pathname.startsWith('/live') || url.pathname.startsWith('/ws')) {
      const id = env.COSMIC_CHANNEL.idFromName('main');
      const obj = env.COSMIC_CHANNEL.get(id);
      return obj.fetch(request);
    }

    return new Response('Cosmic Channel API', { status: 200 });
  }
};
