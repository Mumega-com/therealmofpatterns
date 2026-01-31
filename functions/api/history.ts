/**
 * GET /api/history?email_hash=...&days=30&metrics=kappa_bar,RU
 * Retrieve historical UV snapshots and trends
 */

import { Env } from '../../src/types';

interface HistoryParams {
  email_hash: string;
  days?: number; // Default 30
  metrics?: string; // Comma-separated: kappa_bar,RU,W,C,elder_progress
  include_snapshots?: boolean; // Include full snapshot data (default: false)
}

interface HistoryResponse {
  success: boolean;
  user: {
    email_hash: string;
    total_snapshots: number;
    days_tracked: number;
    date_range: {
      start: string;
      end: string;
    };
  };
  trends: {
    metric: string;
    data: Array<{ date: string; value: number }>;
    stats: {
      min: number;
      max: number;
      mean: number;
      current: number;
    };
  }[];
  snapshots?: any[]; // Optional full snapshot data
  analytics?: {
    avg_kappa_30d: number;
    avg_ru_30d: number;
    avg_elder_progress_30d: number;
    failure_mode_distribution: {
      [mode: string]: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const params: HistoryParams = {
      email_hash: url.searchParams.get('email_hash') || '',
      days: parseInt(url.searchParams.get('days') || '30'),
      metrics: url.searchParams.get('metrics') || 'kappa_bar,RU,elder_progress',
      include_snapshots: url.searchParams.get('include_snapshots') === 'true'
    };

    // Validate email_hash
    if (!params.email_hash) {
      return errorResponse('INVALID_INPUT', 'Missing email_hash parameter', 400);
    }

    // Verify user exists
    const user = await env.DB.prepare(`
      SELECT email_hash FROM user_profiles WHERE email_hash = ?
    `).bind(params.email_hash).first();

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    // Get snapshot count and date range
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_snapshots,
        COUNT(DISTINCT DATE(timestamp)) as days_tracked,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM uv_snapshots
      WHERE user_email_hash = ?
      AND timestamp >= DATE('now', '-' || ? || ' days')
    `).bind(params.email_hash, params.days).first();

    if (!stats || stats.total_snapshots === 0) {
      return jsonResponse({
        success: true,
        user: {
          email_hash: params.email_hash,
          total_snapshots: 0,
          days_tracked: 0,
          date_range: { start: '', end: '' }
        },
        trends: [],
        analytics: null
      });
    }

    // Get snapshots
    const { results: snapshots } = await env.DB.prepare(`
      SELECT *
      FROM uv_snapshots
      WHERE user_email_hash = ?
      AND timestamp >= DATE('now', '-' || ? || ' days')
      ORDER BY timestamp ASC
    `).bind(params.email_hash, params.days).all();

    if (!snapshots || snapshots.length === 0) {
      return errorResponse('NOT_FOUND', 'No snapshots found', 404);
    }

    // Extract requested metrics
    const requestedMetrics = params.metrics.split(',').map(m => m.trim());
    const trends = requestedMetrics.map(metric => {
      const data = snapshots.map(s => ({
        date: (s.timestamp as string).split('T')[0],
        value: s[metric] as number
      }));

      const values = data.map(d => d.value);
      const stats = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((sum, v) => sum + v, 0) / values.length,
        current: values[values.length - 1]
      };

      return { metric, data, stats };
    });

    // Get analytics
    const analytics = await env.DB.prepare(`
      SELECT * FROM user_analytics WHERE user_email_hash = ?
    `).bind(params.email_hash).first();

    const failureModeDistribution = analytics ? {
      Collapse: analytics.collapse_count as number,
      Inversion: analytics.inversion_count as number,
      Dissociation: analytics.dissociation_count as number,
      Dispersion: analytics.dispersion_count as number,
      Healthy: analytics.healthy_count as number
    } : {};

    const response: HistoryResponse = {
      success: true,
      user: {
        email_hash: params.email_hash,
        total_snapshots: stats.total_snapshots as number,
        days_tracked: stats.days_tracked as number,
        date_range: {
          start: (stats.earliest as string) || '',
          end: (stats.latest as string) || ''
        }
      },
      trends,
      analytics: analytics ? {
        avg_kappa_30d: analytics.avg_kappa_30d as number,
        avg_ru_30d: analytics.avg_ru_30d as number,
        avg_elder_progress_30d: analytics.avg_elder_progress_30d as number,
        failure_mode_distribution: failureModeDistribution
      } : undefined
    };

    // Include full snapshots if requested
    if (params.include_snapshots) {
      response.snapshots = snapshots.map(s => ({
        timestamp: s.timestamp,
        inner_8d: JSON.parse(s.inner_8d as string),
        outer_8d: JSON.parse(s.outer_8d as string),
        kappa_bar: s.kappa_bar,
        RU: s.RU,
        W: s.W,
        C: s.C,
        failure_mode: s.failure_mode,
        elder_progress: s.elder_progress,
        dominant: {
          index: s.dominant_index,
          symbol: s.dominant_symbol,
          value: s.dominant_value
        }
      }));
    }

    return jsonResponse(response);

  } catch (error) {
    console.error('History error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch history', 500);
  }
};

// ============================================
// Helper Functions
// ============================================

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300' // 5 min cache
    }
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    user: null as any,
    trends: [],
    error: { code, message }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
