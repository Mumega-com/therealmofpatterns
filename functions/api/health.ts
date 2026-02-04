/**
 * Health Check Endpoint
 *
 * Returns system health status for monitoring.
 * GET /api/health - Basic health check (returns 200 if up)
 * GET /api/health?full=true - Detailed health with checks
 */

import type { EventContext } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  checks?: HealthCheck[];
}

// Track start time for uptime calculation
const startTime = Date.now();

export async function onRequest(
  context: EventContext<Env, string, Record<string, unknown>>
): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const fullCheck = url.searchParams.get('full') === 'true';

  const response: HealthResponse = {
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  // For HEAD requests, just return 200
  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        'X-Health-Status': 'healthy',
      },
    });
  }

  // Full health check
  if (fullCheck) {
    const checks: HealthCheck[] = [];

    // Database check
    const dbCheck = await checkDatabase(env.DB);
    checks.push(dbCheck);

    // KV check
    const kvCheck = await checkKV(env.CACHE);
    checks.push(kvCheck);

    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warnChecks = checks.filter(c => c.status === 'warn');

    if (failedChecks.length > 0) {
      response.status = failedChecks.length === checks.length ? 'unhealthy' : 'degraded';
    } else if (warnChecks.length > 0) {
      response.status = 'degraded';
    }

    response.checks = checks;
  }

  const statusCode = response.status === 'unhealthy' ? 503 : 200;

  return new Response(JSON.stringify(response, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Health-Status': response.status,
    },
  });
}

async function checkDatabase(db: D1Database): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const result = await db.prepare('SELECT 1 as ok').first<{ ok: number }>();
    const duration = Date.now() - start;

    if (result?.ok === 1) {
      return {
        name: 'd1-database',
        status: duration > 1000 ? 'warn' : 'pass',
        duration,
        message: duration > 1000 ? 'Slow response' : undefined,
      };
    }
    return {
      name: 'd1-database',
      status: 'fail',
      duration,
      message: 'Unexpected result',
    };
  } catch (error) {
    return {
      name: 'd1-database',
      status: 'fail',
      duration: Date.now() - start,
      message: (error as Error).message,
    };
  }
}

async function checkKV(kv: KVNamespace): Promise<HealthCheck> {
  const start = Date.now();
  const testKey = '_health_check_' + Date.now();

  try {
    // Write test value
    await kv.put(testKey, 'ok', { expirationTtl: 60 });

    // Read it back
    const value = await kv.get(testKey);

    // Delete it
    await kv.delete(testKey);

    const duration = Date.now() - start;

    if (value === 'ok') {
      return {
        name: 'kv-cache',
        status: duration > 500 ? 'warn' : 'pass',
        duration,
        message: duration > 500 ? 'Slow response' : undefined,
      };
    }
    return {
      name: 'kv-cache',
      status: 'fail',
      duration,
      message: 'Read mismatch',
    };
  } catch (error) {
    return {
      name: 'kv-cache',
      status: 'fail',
      duration: Date.now() - start,
      message: (error as Error).message,
    };
  }
}
