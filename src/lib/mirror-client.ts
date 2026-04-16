/**
 * Mirror Client — pushes events to Mumega Mirror (engram memory API).
 *
 * Mirror stores engrams (text + metadata + optional vector embedding)
 * for later recall. TROP writes user interactions as engrams so the
 * narrator can personalize future readings based on accumulated history.
 *
 * Configuration:
 *   env.MIRROR_API_URL   — base URL (e.g. https://mirror.mumega.com)
 *   env.MIRROR_API_TOKEN — bearer token
 *   env.MIRROR_PROJECT   — project tag (default: "realm-of-patterns")
 *
 * Graceful degradation: if MIRROR_API_URL is unset, remember() is a no-op.
 * This lets us wire call sites freely without blocking on infra.
 */

export interface MirrorEngram {
  text: string;
  project?: string;
  subject?: string;               // e.g. telegram_user_id, email_hash
  kind?: 'checkin' | 'reading' | 'view' | 'save' | 'share' | 'event';
  tags?: string[];
  metadata?: Record<string, unknown>;
  occurred_at?: string;           // ISO; defaults server-side if omitted
}

export interface MirrorEnv {
  MIRROR_API_URL?: string;
  MIRROR_API_TOKEN?: string;
  MIRROR_PROJECT?: string;
}

export interface RememberResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Fire-and-forget write to Mirror. Returns a promise but callers should
 * NOT await if they want non-blocking behavior — use ctx.waitUntil() or
 * just swallow the promise. We still return the result for sync callers
 * that want to know.
 */
export async function remember(env: MirrorEnv, engram: MirrorEngram): Promise<RememberResult> {
  if (!env.MIRROR_API_URL || !env.MIRROR_API_TOKEN) {
    return { ok: true, skipped: true };
  }

  const payload = {
    text: engram.text,
    project: engram.project ?? env.MIRROR_PROJECT ?? 'realm-of-patterns',
    subject: engram.subject,
    kind: engram.kind ?? 'event',
    tags: engram.tags ?? [],
    metadata: engram.metadata ?? {},
    occurred_at: engram.occurred_at ?? new Date().toISOString(),
  };

  try {
    const res = await fetch(`${env.MIRROR_API_URL.replace(/\/$/, '')}/remember`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MIRROR_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json() as { id?: string; engram_id?: string };
    return { ok: true, id: data.id ?? data.engram_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Recall recent engrams about a subject. Returns plain text blobs for
 * the narrator to use as personalization context.
 */
export async function recall(
  env: MirrorEnv,
  subject: string,
  opts: { limit?: number; kind?: string; query?: string } = {},
): Promise<string[]> {
  if (!env.MIRROR_API_URL || !env.MIRROR_API_TOKEN) return [];

  const params = new URLSearchParams({
    project: env.MIRROR_PROJECT ?? 'realm-of-patterns',
    subject,
    limit: String(opts.limit ?? 10),
  });
  if (opts.kind) params.set('kind', opts.kind);
  if (opts.query) params.set('query', opts.query);

  try {
    const res = await fetch(`${env.MIRROR_API_URL.replace(/\/$/, '')}/recall?${params}`, {
      headers: { Authorization: `Bearer ${env.MIRROR_API_TOKEN}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { engrams?: Array<{ text: string }> };
    return (data.engrams ?? []).map(e => e.text);
  } catch {
    return [];
  }
}
