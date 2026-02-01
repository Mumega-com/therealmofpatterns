/**
 * Admin Dashboard - /admin
 *
 * A styled HTML dashboard for managing The Realm of Patterns CMS.
 * Displays queue statistics, content stats, and action buttons.
 *
 * Authorization: X-Admin-Key header or ?key= query param
 */

import { Env } from '../../src/types';

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avg_priority: number;
}

interface ContentStats {
  total: number;
  by_language: Record<string, number>;
  by_content_type: Record<string, number>;
}

interface RecentContent {
  id: string;
  slug: string;
  title: string;
  language: string;
  content_type: string;
  word_count: number;
  quality_score: number;
  created_at: string;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function checkAuth(request: Request, env: Env): boolean {
  const url = new URL(request.url);
  const keyFromQuery = url.searchParams.get('key');
  const keyFromHeader = request.headers.get('X-Admin-Key');
  const adminKey = keyFromQuery || keyFromHeader;

  if (!env.ADMIN_KEY) {
    console.error('[ADMIN] ADMIN_KEY not configured');
    return false;
  }

  return adminKey === env.ADMIN_KEY;
}

async function getQueueStats(db: D1Database): Promise<QueueStats> {
  // Status counts
  const statusResult = await db.prepare(`
    SELECT status, COUNT(*) as count
    FROM content_queue
    GROUP BY status
  `).all<{ status: string; count: number }>();

  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.results || []) {
    statusCounts[row.status] = row.count;
  }

  // Total and average priority
  const totalResult = await db.prepare(`
    SELECT COUNT(*) as total, AVG(priority_score) as avg_priority
    FROM content_queue
  `).first<{ total: number; avg_priority: number }>();

  return {
    total: totalResult?.total || 0,
    pending: statusCounts['pending'] || 0,
    processing: statusCounts['processing'] || 0,
    completed: statusCounts['completed'] || 0,
    failed: statusCounts['failed'] || 0,
    avg_priority: Math.round((totalResult?.avg_priority || 0) * 100) / 100,
  };
}

async function getContentStats(db: D1Database): Promise<ContentStats> {
  // Total content
  const totalResult = await db.prepare(`
    SELECT COUNT(*) as total FROM cms_cosmic_content
  `).first<{ total: number }>();

  // By language
  const langResult = await db.prepare(`
    SELECT language, COUNT(*) as count
    FROM cms_cosmic_content
    GROUP BY language
    ORDER BY count DESC
  `).all<{ language: string; count: number }>();

  const byLanguage: Record<string, number> = {};
  for (const row of langResult.results || []) {
    byLanguage[row.language] = row.count;
  }

  // By content type
  const typeResult = await db.prepare(`
    SELECT content_type, COUNT(*) as count
    FROM cms_cosmic_content
    GROUP BY content_type
    ORDER BY count DESC
  `).all<{ content_type: string; count: number }>();

  const byContentType: Record<string, number> = {};
  for (const row of typeResult.results || []) {
    byContentType[row.content_type] = row.count;
  }

  return {
    total: totalResult?.total || 0,
    by_language: byLanguage,
    by_content_type: byContentType,
  };
}

async function getRecentContent(db: D1Database, limit: number = 20): Promise<RecentContent[]> {
  const result = await db.prepare(`
    SELECT id, slug, title, language, content_type, word_count, quality_score, created_at
    FROM cms_cosmic_content
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all<RecentContent>();

  return result.results || [];
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function renderDashboard(
  queueStats: QueueStats,
  contentStats: ContentStats,
  recentContent: RecentContent[],
  adminKey: string
): string {
  const languageRows = Object.entries(contentStats.by_language)
    .map(([lang, count]) => `<tr><td>${escapeHtml(lang)}</td><td>${count}</td></tr>`)
    .join('\n');

  const contentTypeRows = Object.entries(contentStats.by_content_type)
    .map(([type, count]) => `<tr><td>${escapeHtml(type.replace(/_/g, ' '))}</td><td>${count}</td></tr>`)
    .join('\n');

  const recentRows = recentContent
    .map((item) => `
      <tr>
        <td><a href="/${escapeHtml(item.slug)}" target="_blank">${escapeHtml(item.slug)}</a></td>
        <td>${escapeHtml(item.title?.substring(0, 50) || 'Untitled')}${(item.title?.length || 0) > 50 ? '...' : ''}</td>
        <td>${escapeHtml(item.language)}</td>
        <td>${item.word_count || 0}</td>
        <td class="quality-${getQualityClass(item.quality_score)}">${item.quality_score || 0}</td>
        <td>${formatDate(item.created_at)}</td>
      </tr>
    `)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard | The Realm of Patterns</title>
  <style>
    :root {
      --cosmic-gold: #d4af37;
      --cosmic-purple: #6b21a8;
      --cosmic-deep: #0a0a1a;
      --cosmic-nebula: #1a1a2e;
      --cosmic-text: #e8e6e3;
      --cosmic-muted: #888;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
      --info: #3b82f6;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(180deg, var(--cosmic-deep) 0%, var(--cosmic-nebula) 100%);
      color: var(--cosmic-text);
      min-height: 100vh;
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(212, 175, 55, 0.3);
    }

    h1 {
      color: var(--cosmic-gold);
      font-size: 1.75rem;
      font-weight: 500;
      letter-spacing: 0.05em;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--cosmic-gold) 0%, #b8941f 100%);
      color: var(--cosmic-deep);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
    }

    .btn-secondary {
      background: rgba(107, 33, 168, 0.5);
      color: var(--cosmic-text);
      border: 1px solid var(--cosmic-purple);
    }

    .btn-secondary:hover {
      background: rgba(107, 33, 168, 0.7);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card h2 {
      color: var(--cosmic-gold);
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .stat {
      text-align: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--cosmic-gold);
    }

    .stat-value.pending { color: var(--warning); }
    .stat-value.processing { color: var(--info); }
    .stat-value.completed { color: var(--success); }
    .stat-value.failed { color: var(--error); }

    .stat-label {
      font-size: 0.75rem;
      color: var(--cosmic-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.25rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    th {
      color: var(--cosmic-gold);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    td {
      font-size: 0.9rem;
    }

    td a {
      color: var(--cosmic-gold);
      text-decoration: none;
    }

    td a:hover {
      text-decoration: underline;
    }

    .quality-high { color: var(--success); font-weight: 600; }
    .quality-medium { color: var(--warning); }
    .quality-low { color: var(--error); }

    .mini-table {
      font-size: 0.85rem;
    }

    .mini-table td {
      padding: 0.5rem 0.75rem;
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    .toast.success {
      background: var(--success);
      color: white;
    }

    .toast.error {
      background: var(--error);
      color: white;
    }

    .toast.info {
      background: var(--info);
      color: white;
    }

    .refresh-time {
      font-size: 0.75rem;
      color: var(--cosmic-muted);
    }

    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      header { flex-direction: column; gap: 1rem; }
      .header-actions { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>The Realm of Patterns - Admin</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="seedQueue()" id="seedBtn">
          Seed Queue
        </button>
        <button class="btn btn-primary" onclick="generateBatch()" id="generateBtn">
          Generate Batch
        </button>
      </div>
    </header>

    <div class="grid">
      <!-- Queue Stats Card -->
      <div class="card">
        <div class="card-header">
          <h2>Queue Stats</h2>
          <span class="refresh-time">Auto-refresh: 30s</span>
        </div>
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-value">${queueStats.total}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value pending">${queueStats.pending}</div>
            <div class="stat-label">Pending</div>
          </div>
          <div class="stat">
            <div class="stat-value processing">${queueStats.processing}</div>
            <div class="stat-label">Processing</div>
          </div>
          <div class="stat">
            <div class="stat-value completed">${queueStats.completed}</div>
            <div class="stat-label">Completed</div>
          </div>
          <div class="stat">
            <div class="stat-value failed">${queueStats.failed}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat">
            <div class="stat-value">${queueStats.avg_priority}</div>
            <div class="stat-label">Avg Priority</div>
          </div>
        </div>
      </div>

      <!-- Content Stats Card -->
      <div class="card">
        <div class="card-header">
          <h2>Content Stats</h2>
          <span class="stat-value" style="font-size: 1.25rem;">${contentStats.total} pages</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <h3 style="font-size: 0.75rem; color: var(--cosmic-muted); margin-bottom: 0.5rem;">By Language</h3>
            <table class="mini-table">
              ${languageRows || '<tr><td colspan="2">No content yet</td></tr>'}
            </table>
          </div>
          <div>
            <h3 style="font-size: 0.75rem; color: var(--cosmic-muted); margin-bottom: 0.5rem;">By Type</h3>
            <table class="mini-table">
              ${contentTypeRows || '<tr><td colspan="2">No content yet</td></tr>'}
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Content Table -->
    <div class="card">
      <div class="card-header">
        <h2>Recent Content (Last 20)</h2>
      </div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Slug</th>
              <th>Title</th>
              <th>Lang</th>
              <th>Words</th>
              <th>Quality</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${recentRows || '<tr><td colspan="6" style="text-align: center; color: var(--cosmic-muted);">No content generated yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const ADMIN_KEY = '${escapeHtml(adminKey)}';

    function showToast(message, type = 'info') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + type + ' show';
      setTimeout(() => {
        toast.classList.remove('show');
      }, 4000);
    }

    async function seedQueue() {
      const btn = document.getElementById('seedBtn');
      btn.disabled = true;
      btn.textContent = 'Seeding...';

      try {
        const response = await fetch('/api/queue/seed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY
          },
          body: JSON.stringify({})
        });

        const data = await response.json();

        if (data.success) {
          showToast('Queue seeded: ' + data.added + ' added, ' + data.skipped + ' skipped', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          showToast('Error: ' + (data.error?.message || 'Unknown error'), 'error');
        }
      } catch (error) {
        showToast('Request failed: ' + error.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Seed Queue';
      }
    }

    async function generateBatch() {
      const btn = document.getElementById('generateBtn');
      btn.disabled = true;
      btn.textContent = 'Generating...';

      try {
        const response = await fetch('/api/generate-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY
          },
          body: JSON.stringify({ batch_size: 5 })
        });

        const data = await response.json();

        if (data.success) {
          showToast('Generated: ' + data.generated + ' pages, ' + data.failed + ' failed', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          showToast('Error: ' + (data.error?.message || 'Unknown error'), 'error');
        }
      } catch (error) {
        showToast('Request failed: ' + error.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Batch';
      }
    }

    // Auto-refresh every 30 seconds
    setTimeout(() => {
      location.reload();
    }, 30000);
  </script>
</body>
</html>`;
}

function getQualityClass(score: number): string {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Check authorization
  if (!checkAuth(request, env)) {
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Unauthorized</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0a0a1a;
      color: #e8e6e3;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .box {
      text-align: center;
      padding: 2rem;
      border: 1px solid #d4af37;
      border-radius: 8px;
    }
    h1 { color: #ef4444; margin-bottom: 1rem; }
    p { color: #888; }
  </style>
</head>
<body>
  <div class="box">
    <h1>401 Unauthorized</h1>
    <p>Valid admin key required via X-Admin-Key header or ?key= query param</p>
  </div>
</body>
</html>`, {
      status: 401,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    // Get the admin key for passing to JavaScript
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key') || request.headers.get('X-Admin-Key') || '';

    // Fetch all data
    const [queueStats, contentStats, recentContent] = await Promise.all([
      getQueueStats(env.DB),
      getContentStats(env.DB),
      getRecentContent(env.DB, 20),
    ]);

    const html = renderDashboard(queueStats, contentStats, recentContent, adminKey);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[ADMIN] Dashboard error:', error);
    return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Error</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0a0a1a;
      color: #e8e6e3;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .box {
      text-align: center;
      padding: 2rem;
      border: 1px solid #ef4444;
      border-radius: 8px;
      max-width: 500px;
    }
    h1 { color: #ef4444; margin-bottom: 1rem; }
    pre {
      text-align: left;
      background: rgba(0,0,0,0.3);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>500 Internal Error</h1>
    <pre>${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</pre>
  </div>
</body>
</html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
