/**
 * /api/natal-chart
 *
 * Computes a full natal chart from birth data.
 *
 * GET  /api/natal-chart?date=YYYY-MM-DD[&time=HH:MM&lat=XX&lon=XX&location=City&tz=±H]
 * POST /api/natal-chart  body: { date, time?, lat?, lon?, location?, tz? }
 */

import { computeNatalChart, formatChartForSol } from '../../src/lib/natal';
import type { BirthData } from '../../src/types';

export const onRequest: PagesFunction = async ({ request }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let params: Record<string, string> = {};

    if (request.method === 'POST') {
      params = await request.json();
    } else {
      const url = new URL(request.url);
      url.searchParams.forEach((v, k) => { params[k] = v; });
    }

    // Parse date
    const dateStr = params.date;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return Response.json(
        { error: 'date is required in YYYY-MM-DD format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const [year, month, day] = dateStr.split('-').map(Number);

    // Parse optional time
    let hour: number | undefined;
    let minute: number | undefined;
    if (params.time && /^\d{1,2}:\d{2}$/.test(params.time)) {
      const [h, m] = params.time.split(':').map(Number);
      hour = h;
      minute = m;
    }

    // Parse optional location
    const latitude = params.lat ? parseFloat(params.lat) : undefined;
    const longitude = params.lon ? parseFloat(params.lon) : undefined;
    const timezoneOffset = params.tz ? parseFloat(params.tz) : undefined;

    const birthData: BirthData = {
      year, month, day,
      hour,
      minute,
      latitude,
      longitude,
      timezone_offset: timezoneOffset,
    };

    const chart = computeNatalChart(birthData, params.location);
    const textFormat = formatChartForSol(chart);

    return Response.json(
      { ...chart, text: textFormat },
      { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=86400' } }
    );

  } catch (err) {
    console.error('natal-chart error:', err);
    return Response.json(
      { error: 'Failed to compute natal chart', detail: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
};
