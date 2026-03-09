/**
 * render-vps.mjs
 * Renders a Remotion composition on the Hetzner VPS using Docker.
 *
 * Pipeline:
 *   1. rsync source → VPS
 *   2. docker build (cached after first run — only rebuilds if package.json changes)
 *   3. docker run → renders inside ghcr.io/remotion-dev/base container
 *   4. rsync output → local
 *
 * Usage (direct):
 *   node scripts/render-vps.mjs DailyWeather out/daily-2026-03-09.mp4 .render-props.json
 *
 * Called internally by publish-daily.mjs --vps
 *
 * Requires video/.env:
 *   VPS_HOST=your-vps-ip
 *   VPS_USER=root  (default)
 *   VPS_SSH_KEY=~/.ssh/id_rsa  (optional)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const envPath = join(ROOT, '.env');

if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

export const VPS_REMOTE_DIR = '/opt/therealmofpatterns/video';

const VPS  = process.env.VPS_HOST;
const USER = process.env.VPS_USER ?? 'root';
const KEY  = process.env.VPS_SSH_KEY;

export function getSSH() {
  const sshKey = KEY ? `-i ${KEY} ` : '';
  return `ssh ${sshKey}-o StrictHostKeyChecking=no -o ConnectTimeout=10 ${USER}@${VPS}`;
}

export function getRsync() {
  return KEY ? `rsync --rsh="ssh -i ${KEY} -o StrictHostKeyChecking=no"` : 'rsync';
}

function log(msg) { process.stdout.write(msg + '\n'); }

/**
 * Main render function — called from publish-daily.mjs
 * @param {string} composition  e.g. 'DailyWeather'
 * @param {string} localOutPath e.g. '/Users/.../out/daily-2026-03-09.mp4'
 * @param {string} propsFile    e.g. '/Users/.../video/.render-props.json'
 */
export async function renderOnVPS(composition, localOutPath, propsFile) {
  if (!VPS) {
    throw new Error('VPS_HOST not set in video/.env. Run: node scripts/vps-setup.mjs first.');
  }

  const SSH    = getSSH();
  const RSYNC  = getRsync();
  const outName = basename(localOutPath);
  const REMOTE  = VPS_REMOTE_DIR;

  log(`   VPS: ${USER}@${VPS}`);

  // 1. Sync source files (exclude node_modules and out dir for speed)
  log('   Syncing source to VPS...');
  execSync(
    `${RSYNC} -az --delete \
      --exclude node_modules \
      --exclude out \
      --exclude ".DS_Store" \
      "${ROOT}/" "${USER}@${VPS}:${REMOTE}/"`,
    { cwd: ROOT, stdio: 'pipe' }
  );
  log('   ✓ Synced');

  // 2. Build Docker image (layer-cached — fast if only src changed, slow only when package.json changes)
  log('   Building Docker image (cached after first run)...');
  execSync(
    `${SSH} "cd ${REMOTE} && docker build -t rop-video . 2>&1 | tail -5"`,
    { stdio: 'inherit' }
  );
  log('   ✓ Image ready');

  // 3. Create out dir on VPS
  execSync(`${SSH} "mkdir -p ${REMOTE}/out"`, { stdio: 'pipe' });

  // 4. Run Remotion render inside Docker container
  log(`   Rendering ${composition} in Docker (4 CPU / 16GB)...`);
  const startTime = Date.now();
  execSync(
    `${SSH} "cd ${REMOTE} && \
      docker run --rm \
        --cpus=4 \
        --memory=12g \
        -v ${REMOTE}/out:/app/out \
        -v ${REMOTE}/.render-props.json:/app/.render-props.json:ro \
        rop-video \
        ${composition} 'out/${outName}' \
        --props='.render-props.json' \
        --log=error \
        --concurrency=4"`,
    { stdio: 'inherit' }
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`   ✓ Render complete (${elapsed}s)`);

  // 5. Download output
  log('   Downloading output...');
  execSync(
    `${RSYNC} -az "${USER}@${VPS}:${REMOTE}/out/${outName}" "${localOutPath}"`,
    { stdio: 'pipe' }
  );
  const size = (statSync(localOutPath).size / 1024 / 1024).toFixed(1);
  log(`   ✓ Downloaded (${size} MB)`);
}

// ── CLI usage ─────────────────────────────────────────────────────
if (process.argv[2] && !process.argv[2].startsWith('--')) {
  const [,, composition, localOut, propsFile] = process.argv;
  if (!composition || !localOut) {
    console.error('Usage: node scripts/render-vps.mjs <composition> <local-out-path> [props-file]');
    process.exit(1);
  }
  const resolvedProps = propsFile
    ? join(ROOT, propsFile)
    : join(ROOT, '.render-props.json');
  renderOnVPS(composition, join(ROOT, localOut), resolvedProps)
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
