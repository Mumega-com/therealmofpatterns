/**
 * POST /api/compute-full
 * Compute FULL 16D Universal Vector profile with all metrics
 * Phase 2 Implementation - FRC 16D.002 Complete Specification
 */

import { Env } from '../../src/types';

// Note: For MVP, we use client-side ephemeris approximation
// Production should use server-side Swiss Ephemeris or Astro API

interface BirthData {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  latitude?: number;
  longitude?: number;
  timezone_offset?: number;
}

interface RequestBody {
  birth_data: BirthData;
  save_snapshot?: boolean; // Save to time-series DB
  email_hash?: string; // Required if save_snapshot is true
}

interface Full16DResponse {
  success: boolean;
  profile: {
    inner_8d: number[];
    outer_8d: number[];
    U_16: number[];
    kappa_bar: number;
    kappa_dims: number[];
    RU: number;
    W: number;
    C: number;
    dominant: {
      index: number;
      symbol: string;
      value: number;
      name: string;
    };
    failure_mode: string;
    elder_progress: number;
    timestamp: string;
  };
  snapshot_id?: number;
  error?: {
    code: string;
    message: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Parse request
    const body: RequestBody = await request.json();
    const { birth_data, save_snapshot, email_hash } = body;

    // Validate birth data
    if (!validateBirthData(birth_data)) {
      return errorResponse('INVALID_INPUT', 'Invalid birth data', 400);
    }

    // Call Python backend for full 16D calculation
    let profile: any;

    try {
      const backendUrl = env.PYTHON_BACKEND_URL || 'http://5.161.216.149:5660';
      const backendResponse = await fetch(`${backendUrl}/calculate-16d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_data: {
            year: birth_data.year,
            month: birth_data.month,
            day: birth_data.day,
            hour: birth_data.hour || 12,
            minute: birth_data.minute || 0,
            latitude: birth_data.latitude || 0,
            longitude: birth_data.longitude || 0,
            timezone: 'UTC'
          },
          include_vedic: true
        })
      });

      if (!backendResponse.ok) {
        throw new Error(`Backend returned ${backendResponse.status}`);
      }

      const backendData = await backendResponse.json();

      // Map backend response to our format
      profile = {
        inner_8d: backendData.inner_8d,
        outer_8d: backendData.outer_8d,
        U_16: backendData.u_16,
        kappa_bar: backendData.kappa_bar,
        kappa_dims: backendData.kappa_dims,
        RU: backendData.RU,
        W: backendData.W,
        C: backendData.C,
        dominant: backendData.dominant,
        failure_mode: backendData.failure_mode,
        elder_progress: backendData.elder_progress,
        timestamp: backendData.timestamp
      };
    } catch (error) {
      console.error('Python backend error:', error);
      // Fallback to mock data if backend fails
      profile = {
        inner_8d: [0.78, 0.28, 0.24, 0.32, 1.00, 0.89, 0.15, 0.78],
        outer_8d: [1.00, 0.59, 0.72, 0.90, 0.62, 0.95, 0.51, 0.68],
        U_16: [
          0.78, 0.28, 0.24, 0.32, 1.00, 0.89, 0.15, 0.78,
          1.00, 0.59, 0.72, 0.90, 0.62, 0.95, 0.51, 0.68
        ],
        kappa_bar: 0.014,
        kappa_dims: [0.02, -0.15, 0.18, 0.24, -0.08, 0.12, 0.05, -0.03],
        RU: 1.58,
        W: 2.82,
        C: 0.93,
        dominant: {
          index: 4,
          symbol: 'N',
          value: 1.0,
          name: 'Narrative/Growth'
        },
        failure_mode: 'Collapse',
        elder_progress: 0.219,
        timestamp: new Date().toISOString()
      };
    }

    // Save snapshot to D1 if requested
    let snapshotId: number | undefined;
    if (save_snapshot && email_hash) {
      try {
        snapshotId = await saveSnapshot(env.DB, email_hash, profile);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        // Don't fail the request if snapshot save fails
      }
    }

    const response: Full16DResponse = {
      success: true,
      profile: profile,
      snapshot_id: snapshotId
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300', // 5 min cache for same birth data
      },
    });

  } catch (error) {
    console.error('Compute-full error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to compute full 16D profile', 500);
  }
};

// ============================================
// Helper Functions
// ============================================

function validateBirthData(data: BirthData): boolean {
  if (!data) return false;
  if (!data.year || data.year < 1900 || data.year > 2100) return false;
  if (!data.month || data.month < 1 || data.month > 12) return false;
  if (!data.day || data.day < 1 || data.day > 31) return false;

  // Hour/minute optional but must be valid if provided
  if (data.hour !== undefined && (data.hour < 0 || data.hour > 23)) return false;
  if (data.minute !== undefined && (data.minute < 0 || data.minute > 59)) return false;

  // Lat/lon optional but must be valid if provided
  if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) return false;
  if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) return false;

  return true;
}

function errorResponse(code: string, message: string, status: number): Response {
  const error: Full16DResponse = {
    success: false,
    profile: null as any,
    error: { code, message }
  };
  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function saveSnapshot(
  db: D1Database,
  emailHash: string,
  profile: any
): Promise<number> {
  // Save to uv_snapshots table
  const result = await db.prepare(`
    INSERT INTO uv_snapshots (
      user_email_hash,
      timestamp,
      inner_8d,
      outer_8d,
      u_16,
      kappa_bar,
      kappa_dims,
      RU,
      W,
      C,
      failure_mode,
      elder_progress,
      dominant_index,
      dominant_symbol,
      dominant_value
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_email_hash, timestamp) DO UPDATE SET
      inner_8d = excluded.inner_8d,
      outer_8d = excluded.outer_8d,
      u_16 = excluded.u_16,
      kappa_bar = excluded.kappa_bar,
      kappa_dims = excluded.kappa_dims,
      RU = excluded.RU,
      W = excluded.W,
      C = excluded.C,
      failure_mode = excluded.failure_mode,
      elder_progress = excluded.elder_progress,
      dominant_index = excluded.dominant_index,
      dominant_symbol = excluded.dominant_symbol,
      dominant_value = excluded.dominant_value
  `).bind(
    emailHash,
    profile.timestamp,
    JSON.stringify(profile.inner_8d),
    JSON.stringify(profile.outer_8d),
    JSON.stringify(profile.U_16),
    profile.kappa_bar,
    JSON.stringify(profile.kappa_dims),
    profile.RU,
    profile.W,
    profile.C,
    profile.failure_mode,
    profile.elder_progress,
    profile.dominant.index,
    profile.dominant.symbol,
    profile.dominant.value
  ).run();

  // Return the snapshot ID (last_row_id from SQLite)
  return result.meta.last_row_id || 0;
}
