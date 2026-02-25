/**
 * Geocoding + Timezone Utility
 *
 * Resolves city/country → lat/lng → timezone name → UTC offset.
 * Uses two free APIs, no key required:
 *   1. Nominatim (OpenStreetMap) for geocoding
 *   2. TimeAPI.io for reverse timezone lookup
 *
 * Then uses Intl.DateTimeFormat to compute exact UTC offset
 * for the birth date (handles DST correctly).
 */

export interface GeoResult {
  lat: number;
  lng: number;
  timezone: string;       // IANA timezone e.g. "Asia/Tehran"
  utcOffset: number;      // UTC offset in hours e.g. 3.5
  displayName: string;    // Human-readable name from Nominatim
}

/**
 * Full pipeline: city + country → coordinates + timezone + UTC offset.
 * Returns null only if geocoding itself fails (unknown city).
 * Falls back to UTC offset 0 if timezone lookup fails.
 */
export async function resolveLocation(
  city: string,
  country: string,
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour: number = 12,
): Promise<GeoResult | null> {
  // Step 1: Geocode city + country → lat/lng
  const geo = await nominatimGeocode(city, country);
  if (!geo) return null;

  // Step 2: Get IANA timezone from coordinates
  const timezone = await getTimezone(geo.lat, geo.lng);

  // Step 3: Compute UTC offset for the specific birth date (handles DST)
  const utcOffset = timezone
    ? getUTCOffset(timezone, birthYear, birthMonth, birthDay, birthHour)
    : 0;

  return {
    lat: geo.lat,
    lng: geo.lng,
    timezone: timezone ?? 'UTC',
    utcOffset,
    displayName: geo.displayName,
  };
}

// ─── Nominatim ────────────────────────────────────────────────────────────────

interface NominatimResult {
  lat: number;
  lng: number;
  displayName: string;
}

async function nominatimGeocode(
  city: string,
  country: string,
): Promise<NominatimResult | null> {
  try {
    const query = encodeURIComponent(`${city}, ${country}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=0`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TheRealmOfPatterns/1.0 (contact@therealmofpatterns.com)',
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) return null;

    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

// ─── Timezone lookup ──────────────────────────────────────────────────────────

async function getTimezone(lat: number, lng: number): Promise<string | null> {
  // Try TimeAPI.io (free, no key, reliable)
  try {
    const res = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = await res.json() as { timeZone?: string };
      if (data.timeZone) return data.timeZone;
    }
  } catch {
    // fall through to backup
  }

  // Backup: WorldTimeAPI (free, no key)
  try {
    const res = await fetch(
      `https://worldtimeapi.org/api/timezone`,
      { headers: { Accept: 'application/json' } },
    );
    // WorldTimeAPI doesn't do coord lookup, use rough estimation instead
  } catch {
    // ignore
  }

  // Last resort: estimate from longitude (±15° per hour)
  return estimateTimezoneFromLng(lng);
}

// ─── UTC Offset calculation ───────────────────────────────────────────────────

/**
 * Compute the UTC offset (in decimal hours) for an IANA timezone
 * at a specific date/time. Handles DST automatically via Intl.
 */
function getUTCOffset(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
): number {
  try {
    // Use Intl to get the offset at the exact moment of birth
    const date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));

    // Get UTC time formatted in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);

    const localYear = get('year');
    const localMonth = get('month');
    const localDay = get('day');
    let localHour = get('hour');
    const localMinute = get('minute');

    // Handle midnight edge case (hour=24 in some implementations)
    if (localHour === 24) localHour = 0;

    const localDate = new Date(Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute));
    const offsetMs = localDate.getTime() - date.getTime();
    const offsetHours = offsetMs / (1000 * 60 * 60);

    // Round to nearest 0.25 (15 min) to handle :30 and :45 offsets
    return Math.round(offsetHours * 4) / 4;
  } catch {
    return 0;
  }
}

// ─── Fallback: estimate from longitude ───────────────────────────────────────

/**
 * Rough timezone estimation from longitude (±7.5° per half-hour zone).
 * Used when API calls fail — not accurate but better than UTC.
 */
function estimateTimezoneFromLng(lng: number): string {
  const offsetHours = Math.round(lng / 15);
  const clipped = Math.max(-12, Math.min(14, offsetHours));

  // Map to a representative IANA timezone for the offset
  const offsetToTz: Record<number, string> = {
    '-12': 'Etc/GMT+12', '-11': 'Pacific/Midway', '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage', '-8': 'America/Los_Angeles', '-7': 'America/Denver',
    '-6': 'America/Chicago', '-5': 'America/New_York', '-4': 'America/Halifax',
    '-3': 'America/Sao_Paulo', '-2': 'Atlantic/South_Georgia', '-1': 'Atlantic/Azores',
    '0': 'UTC', '1': 'Europe/Paris', '2': 'Europe/Athens',
    '3': 'Europe/Moscow', '4': 'Asia/Dubai', '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka', '7': 'Asia/Bangkok', '8': 'Asia/Singapore',
    '9': 'Asia/Tokyo', '10': 'Australia/Sydney', '11': 'Pacific/Noumea',
    '12': 'Pacific/Auckland', '13': 'Pacific/Apia', '14': 'Pacific/Kiritimati',
  };

  return offsetToTz[clipped.toString()] ?? 'UTC';
}
