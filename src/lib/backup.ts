/**
 * Database Backup Utilities
 *
 * Provides backup and restore functionality for D1 database.
 * Exports data to R2 storage with rotation policy.
 *
 * Schedule: Daily at 02:00 UTC via cron worker
 * Retention: 7 daily, 4 weekly, 3 monthly backups
 */

// ============================================
// Types
// ============================================

export interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'daily' | 'weekly' | 'monthly';
  tables: string[];
  rowCounts: Record<string, number>;
  sizeBytes: number;
  checksum: string;
}

export interface BackupResult {
  success: boolean;
  backupId?: string;
  metadata?: BackupMetadata;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  tablesRestored: number;
  rowsRestored: number;
  error?: string;
}

// ============================================
// Configuration
// ============================================

export const BACKUP_CONFIG = {
  // Retention policy
  dailyRetention: 7,
  weeklyRetention: 4,
  monthlyRetention: 3,

  // Tables to backup
  tables: [
    'users',
    'checkins',
    'patterns',
    'subscriptions',
    'sessions',
    'predictions',
    'milestones',
    'alerts',
    'circles',
    'circle_members',
    'historical_figures',
    'content_cache',
  ],

  // R2 prefix
  r2Prefix: 'backups/d1/',
};

// ============================================
// Backup Functions
// ============================================

/**
 * Create a full database backup
 */
export async function createBackup(
  db: D1Database,
  r2: R2Bucket,
  type: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<BackupResult> {
  const timestamp = new Date().toISOString();
  const backupId = `backup_${type}_${timestamp.replace(/[:.]/g, '-')}`;

  try {
    const backup: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};

    // Export each table
    for (const table of BACKUP_CONFIG.tables) {
      try {
        const result = await db.prepare(`SELECT * FROM ${table}`).all();
        backup[table] = result.results || [];
        rowCounts[table] = backup[table].length;
      } catch (err) {
        // Table might not exist, skip it
        console.log(`[Backup] Table ${table} skipped: ${(err as Error).message}`);
        backup[table] = [];
        rowCounts[table] = 0;
      }
    }

    // Serialize backup
    const backupData = JSON.stringify(backup);
    const sizeBytes = new TextEncoder().encode(backupData).length;

    // Calculate checksum
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(backupData)
    );
    const checksum = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create metadata
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      type,
      tables: Object.keys(backup).filter(t => rowCounts[t] > 0),
      rowCounts,
      sizeBytes,
      checksum,
    };

    // Upload to R2
    const key = `${BACKUP_CONFIG.r2Prefix}${backupId}.json`;
    await r2.put(key, backupData, {
      customMetadata: {
        type,
        timestamp,
        checksum,
        tables: metadata.tables.join(','),
      },
    });

    // Upload metadata separately
    const metaKey = `${BACKUP_CONFIG.r2Prefix}${backupId}.meta.json`;
    await r2.put(metaKey, JSON.stringify(metadata, null, 2));

    console.log(`[Backup] Created ${type} backup: ${backupId} (${sizeBytes} bytes)`);

    return {
      success: true,
      backupId,
      metadata,
    };
  } catch (error) {
    console.error('[Backup] Failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * List available backups
 */
export async function listBackups(r2: R2Bucket): Promise<BackupMetadata[]> {
  const prefix = BACKUP_CONFIG.r2Prefix;
  const listed = await r2.list({ prefix });

  const backups: BackupMetadata[] = [];

  for (const obj of listed.objects) {
    if (obj.key.endsWith('.meta.json')) {
      const metaObj = await r2.get(obj.key);
      if (metaObj) {
        const metadata = JSON.parse(await metaObj.text()) as BackupMetadata;
        backups.push(metadata);
      }
    }
  }

  // Sort by timestamp descending
  backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return backups;
}

/**
 * Restore database from backup
 */
export async function restoreBackup(
  db: D1Database,
  r2: R2Bucket,
  backupId: string
): Promise<RestoreResult> {
  try {
    // Fetch backup
    const key = `${BACKUP_CONFIG.r2Prefix}${backupId}.json`;
    const backupObj = await r2.get(key);

    if (!backupObj) {
      return { success: false, tablesRestored: 0, rowsRestored: 0, error: 'Backup not found' };
    }

    const backup = JSON.parse(await backupObj.text()) as Record<string, unknown[]>;

    let tablesRestored = 0;
    let rowsRestored = 0;

    // Restore each table
    for (const [table, rows] of Object.entries(backup)) {
      if (rows.length === 0) continue;

      try {
        // Clear existing data
        await db.prepare(`DELETE FROM ${table}`).run();

        // Insert rows in batches
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);

          for (const row of batch) {
            const columns = Object.keys(row as Record<string, unknown>);
            const values = Object.values(row as Record<string, unknown>);
            const placeholders = columns.map(() => '?').join(', ');

            await db
              .prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
              .bind(...values)
              .run();
          }
        }

        tablesRestored++;
        rowsRestored += rows.length;
        console.log(`[Restore] Table ${table}: ${rows.length} rows`);
      } catch (err) {
        console.error(`[Restore] Table ${table} failed:`, err);
      }
    }

    console.log(`[Restore] Complete: ${tablesRestored} tables, ${rowsRestored} rows`);

    return {
      success: true,
      tablesRestored,
      rowsRestored,
    };
  } catch (error) {
    console.error('[Restore] Failed:', error);
    return {
      success: false,
      tablesRestored: 0,
      rowsRestored: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Rotate old backups according to retention policy
 */
export async function rotateBackups(r2: R2Bucket): Promise<{ deleted: string[] }> {
  const backups = await listBackups(r2);
  const deleted: string[] = [];

  const now = new Date();
  const daily = backups.filter(b => b.type === 'daily');
  const weekly = backups.filter(b => b.type === 'weekly');
  const monthly = backups.filter(b => b.type === 'monthly');

  // Helper to delete old backups
  const deleteOld = async (list: BackupMetadata[], keep: number) => {
    const toDelete = list.slice(keep);
    for (const backup of toDelete) {
      const dataKey = `${BACKUP_CONFIG.r2Prefix}${backup.id}.json`;
      const metaKey = `${BACKUP_CONFIG.r2Prefix}${backup.id}.meta.json`;
      await r2.delete(dataKey);
      await r2.delete(metaKey);
      deleted.push(backup.id);
      console.log(`[Rotate] Deleted ${backup.id}`);
    }
  };

  // Apply retention policy
  await deleteOld(daily, BACKUP_CONFIG.dailyRetention);
  await deleteOld(weekly, BACKUP_CONFIG.weeklyRetention);
  await deleteOld(monthly, BACKUP_CONFIG.monthlyRetention);

  return { deleted };
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(
  r2: R2Bucket,
  backupId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get metadata
    const metaKey = `${BACKUP_CONFIG.r2Prefix}${backupId}.meta.json`;
    const metaObj = await r2.get(metaKey);
    if (!metaObj) {
      return { valid: false, error: 'Metadata not found' };
    }
    const metadata = JSON.parse(await metaObj.text()) as BackupMetadata;

    // Get backup data
    const dataKey = `${BACKUP_CONFIG.r2Prefix}${backupId}.json`;
    const dataObj = await r2.get(dataKey);
    if (!dataObj) {
      return { valid: false, error: 'Backup data not found' };
    }
    const data = await dataObj.text();

    // Verify checksum
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(data)
    );
    const checksum = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (checksum !== metadata.checksum) {
      return { valid: false, error: 'Checksum mismatch' };
    }

    // Verify data is valid JSON
    JSON.parse(data);

    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

// ============================================
// Cron Job Handler
// ============================================

/**
 * Handle backup cron job
 * Schedule: 0 2 * * * (02:00 UTC daily)
 */
export async function handleBackupCron(
  db: D1Database,
  r2: R2Bucket
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const dayOfMonth = now.getUTCDate();

  let backupType: 'daily' | 'weekly' | 'monthly' = 'daily';

  // Monthly on the 1st
  if (dayOfMonth === 1) {
    backupType = 'monthly';
  }
  // Weekly on Sundays
  else if (dayOfWeek === 0) {
    backupType = 'weekly';
  }

  // Create backup
  const result = await createBackup(db, r2, backupType);

  if (!result.success) {
    return { success: false, message: `Backup failed: ${result.error}` };
  }

  // Rotate old backups
  const rotated = await rotateBackups(r2);

  return {
    success: true,
    message: `Created ${backupType} backup: ${result.backupId}. Deleted ${rotated.deleted.length} old backups.`,
  };
}
