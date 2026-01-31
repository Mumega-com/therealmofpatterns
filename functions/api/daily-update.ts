/**
 * POST /api/daily-update
 * Trigger daily UV snapshot updates for subscribed users
 *
 * Called by:
 * 1. Cloudflare Cron (scheduled daily at 00:00 UTC)
 * 2. Manual trigger from admin dashboard
 */

import { Env } from '../../src/types';

interface RequestBody {
  admin_key?: string; // Required for manual trigger
  user_email_hash?: string; // Optional: update specific user only
}

interface DailyUpdateResponse {
  success: boolean;
  users_updated: number;
  snapshots_created: number;
  notifications_queued: number;
  errors: number;
  error?: {
    code: string;
    message: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RequestBody = await request.json();

    // Check authorization
    // Cron requests have special header, manual requests need admin key
    const cronAuth = request.headers.get('Cf-Cron-Auth');
    const isValidCron = cronAuth !== null; // Cloudflare adds this header automatically

    if (!isValidCron) {
      // Manual trigger - check admin key
      const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
      const validAdminKey = env.ADMIN_KEY || 'change-me-in-production';

      if (adminKey !== validAdminKey) {
        return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
      }
    }

    // Get list of users to update
    const usersToUpdate = await getUsersForUpdate(env.DB, body.user_email_hash);

    if (usersToUpdate.length === 0) {
      return jsonResponse({
        success: true,
        users_updated: 0,
        snapshots_created: 0,
        notifications_queued: 0,
        errors: 0
      });
    }

    // Process each user
    let snapshotsCreated = 0;
    let notificationsQueued = 0;
    let errors = 0;

    for (const user of usersToUpdate) {
      try {
        // Compute today's UV snapshot
        const snapshot = await computeUserSnapshot(env, user);

        if (snapshot) {
          snapshotsCreated++;

          // Check for threshold alerts
          const alertsTriggered = await checkThresholdAlerts(env.DB, user.email_hash, snapshot);

          // Queue notification if needed
          const shouldNotify = user.email_notifications &&
            (alertsTriggered > 0 || shouldSendDailyUpdate(user));

          if (shouldNotify) {
            await queueNotification(env.DB, user.email_hash, snapshot, alertsTriggered);
            notificationsQueued++;
          }

          // Check for Elder milestones
          await checkElderMilestones(env.DB, user.email_hash, snapshot);
        }
      } catch (error) {
        console.error(`Error updating user ${user.email_hash}:`, error);
        errors++;
      }
    }

    const response: DailyUpdateResponse = {
      success: true,
      users_updated: usersToUpdate.length,
      snapshots_created: snapshotsCreated,
      notifications_queued: notificationsQueued,
      errors
    };

    return jsonResponse(response);

  } catch (error) {
    console.error('Daily update error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to process daily updates', 500);
  }
};

// ============================================
// Helper Functions
// ============================================

async function getUsersForUpdate(
  db: D1Database,
  specificUserHash?: string
): Promise<any[]> {
  let query = `
    SELECT email, email_hash, birth_datetime, birth_latitude, birth_longitude,
           birth_timezone_offset, subscription_status, email_notifications
    FROM user_profiles
    WHERE subscription_status IN ('living_vector', 'premium')
  `;

  if (specificUserHash) {
    query += ` AND email_hash = ?`;
    const { results } = await db.prepare(query).bind(specificUserHash).all();
    return results || [];
  } else {
    const { results } = await db.prepare(query).all();
    return results || [];
  }
}

async function computeUserSnapshot(env: Env, user: any): Promise<any | null> {
  // For Phase 2 MVP: This would call the Python backend
  // For now, return mock snapshot

  // In production:
  // 1. Call Python API with user.birth_datetime, lat, lon, tz
  // 2. Get back full 16D profile
  // 3. Save to uv_snapshots table

  const mockSnapshot = {
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
    dominant: { index: 4, symbol: 'N', value: 1.0, name: 'Narrative/Growth' },
    failure_mode: 'Collapse',
    elder_progress: 0.219,
    timestamp: new Date().toISOString()
  };

  // Save to DB
  try {
    await env.DB.prepare(`
      INSERT INTO uv_snapshots (
        user_email_hash, timestamp, inner_8d, outer_8d, u_16,
        kappa_bar, kappa_dims, RU, W, C,
        failure_mode, elder_progress,
        dominant_index, dominant_symbol, dominant_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.email_hash,
      mockSnapshot.timestamp,
      JSON.stringify(mockSnapshot.inner_8d),
      JSON.stringify(mockSnapshot.outer_8d),
      JSON.stringify(mockSnapshot.U_16),
      mockSnapshot.kappa_bar,
      JSON.stringify(mockSnapshot.kappa_dims),
      mockSnapshot.RU,
      mockSnapshot.W,
      mockSnapshot.C,
      mockSnapshot.failure_mode,
      mockSnapshot.elder_progress,
      mockSnapshot.dominant.index,
      mockSnapshot.dominant.symbol,
      mockSnapshot.dominant.value
    ).run();

    return mockSnapshot;
  } catch (error) {
    console.error('Failed to save snapshot:', error);
    return null;
  }
}

async function checkThresholdAlerts(
  db: D1Database,
  emailHash: string,
  snapshot: any
): Promise<number> {
  // Get user's active alerts
  const { results: alerts } = await db.prepare(`
    SELECT * FROM threshold_alerts
    WHERE user_email_hash = ? AND enabled = 1
  `).bind(emailHash).all();

  if (!alerts || alerts.length === 0) return 0;

  let triggered = 0;

  for (const alert of alerts) {
    const metricValue = snapshot[alert.metric];
    const shouldTrigger = evaluateCondition(
      metricValue,
      alert.condition,
      alert.threshold_value
    );

    if (shouldTrigger) {
      triggered++;

      // Update alert
      await db.prepare(`
        UPDATE threshold_alerts
        SET last_triggered_at = ?, trigger_count = trigger_count + 1
        WHERE id = ?
      `).bind(new Date().toISOString(), alert.id).run();
    }
  }

  return triggered;
}

function evaluateCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'eq': return Math.abs(value - threshold) < 0.001;
    default: return false;
  }
}

function shouldSendDailyUpdate(user: any): boolean {
  // Send daily updates to living_vector subscribers
  return user.subscription_status === 'living_vector';
}

async function queueNotification(
  db: D1Database,
  emailHash: string,
  snapshot: any,
  alertsTriggered: number
): Promise<void> {
  const notificationType = alertsTriggered > 0 ? 'threshold_alert' : 'daily_update';

  const subject = alertsTriggered > 0
    ? `⚠️ Threshold Alert: ${snapshot.failure_mode} Mode`
    : `🌌 Daily UV Update: ${snapshot.dominant.symbol} Dominant`;

  const body = alertsTriggered > 0
    ? `Your UV metrics have triggered ${alertsTriggered} alert(s).\n\nCurrent Status:\n- κ̄: ${snapshot.kappa_bar.toFixed(3)}\n- RU: ${snapshot.RU.toFixed(2)}\n- Failure Mode: ${snapshot.failure_mode}`
    : `Your daily Universal Vector update is ready.\n\nDominant: ${snapshot.dominant.name}\nκ̄: ${snapshot.kappa_bar.toFixed(3)}\nRU: ${snapshot.RU.toFixed(2)}\nElder Progress: ${(snapshot.elder_progress * 100).toFixed(1)}%`;

  await db.prepare(`
    INSERT INTO notification_queue (
      user_email_hash, notification_type, subject, body, data, scheduled_for
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    emailHash,
    notificationType,
    subject,
    body,
    JSON.stringify(snapshot),
    new Date().toISOString()
  ).run();
}

async function checkElderMilestones(
  db: D1Database,
  emailHash: string,
  snapshot: any
): Promise<void> {
  // Check for Elder Attractor milestones
  const milestones: { type: string; condition: boolean }[] = [
    { type: 'first_healthy', condition: snapshot.failure_mode === 'Healthy' },
    { type: 'kappa_85', condition: snapshot.kappa_bar >= 0.85 },
    { type: 'ru_45', condition: snapshot.RU >= 45 },
    { type: 'w_25', condition: snapshot.W >= 2.5 },
    { type: 'elder_48h', condition: snapshot.elder_progress >= 1.0 }
  ];

  for (const milestone of milestones) {
    if (milestone.condition) {
      // Check if already achieved
      const { results } = await db.prepare(`
        SELECT id FROM elder_milestones
        WHERE user_email_hash = ? AND milestone_type = ?
      `).bind(emailHash, milestone.type).all();

      if (!results || results.length === 0) {
        // First time achieving this milestone
        await db.prepare(`
          INSERT INTO elder_milestones (
            user_email_hash, milestone_type, achieved_at,
            kappa_bar, RU, W, elder_progress
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          emailHash,
          milestone.type,
          new Date().toISOString(),
          snapshot.kappa_bar,
          snapshot.RU,
          snapshot.W,
          snapshot.elder_progress
        ).run();

        // Queue special notification
        await queueMilestoneNotification(db, emailHash, milestone.type, snapshot);
      }
    }
  }
}

async function queueMilestoneNotification(
  db: D1Database,
  emailHash: string,
  milestoneType: string,
  snapshot: any
): Promise<void> {
  const milestoneNames: { [key: string]: string } = {
    first_healthy: '🎉 First Healthy State',
    kappa_85: '⭐ High Coupling (κ̄ ≥ 0.85)',
    ru_45: '🔥 High Resonance (RU ≥ 45)',
    w_25: '👁️ Strong Witness (W ≥ 2.5)',
    elder_48h: '🏆 Elder Attractor Reached'
  };

  const subject = `${milestoneNames[milestoneType]} - Milestone Achieved!`;
  const body = `Congratulations! You've achieved a new milestone in your journey.\n\n${milestoneNames[milestoneType]}\n\nYour current metrics:\n- κ̄: ${snapshot.kappa_bar.toFixed(3)}\n- RU: ${snapshot.RU.toFixed(2)}\n- W: ${snapshot.W.toFixed(2)}\n- Elder Progress: ${(snapshot.elder_progress * 100).toFixed(1)}%`;

  await db.prepare(`
    INSERT INTO notification_queue (
      user_email_hash, notification_type, subject, body, data, scheduled_for
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    emailHash,
    'elder_milestone',
    subject,
    body,
    JSON.stringify({ milestone_type: milestoneType, snapshot }),
    new Date().toISOString()
  ).run();
}

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    users_updated: 0,
    snapshots_created: 0,
    notifications_queued: 0,
    errors: 0,
    error: { code, message }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
