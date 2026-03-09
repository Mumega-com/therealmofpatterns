/**
 * vps-setup.mjs
 * One-time setup of Hetzner VPS for Remotion headless rendering.
 * Installs Node.js 22, npm, Chromium, and project dependencies.
 *
 * Usage:
 *   node scripts/vps-setup.mjs
 *
 * Requires video/.env:
 *   VPS_HOST=your-vps-ip-or-hostname
 *   VPS_USER=root   (default)
 *   VPS_SSH_KEY=~/.ssh/id_rsa  (optional, falls back to agent)
 *
 * After setup, run renders with:
 *   node scripts/publish-daily.mjs --vps
 *   npm run publish:vps
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const envPath = join(ROOT, '.env');

if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const VPS  = process.env.VPS_HOST;
const USER = process.env.VPS_USER ?? 'root';
const KEY  = process.env.VPS_SSH_KEY;

if (!VPS) {
  console.error('❌ VPS_HOST not set in video/.env');
  console.error('   Add: VPS_HOST=your.hetzner.ip');
  process.exit(1);
}

const SSH_OPTS = KEY ? `-i ${KEY}` : '';
const SSH = `ssh ${SSH_OPTS} -o StrictHostKeyChecking=no ${USER}@${VPS}`;

function log(msg) { process.stdout.write(msg + '\n'); }

function remote(cmd, label) {
  log(`   ${label ?? cmd}`);
  execSync(`${SSH} "${cmd}"`, { stdio: 'inherit' });
}

async function main() {
  log(`\n🖥  Setting up Hetzner VPS for Remotion rendering`);
  log(`   Host: ${USER}@${VPS}\n`);

  // Test connectivity
  log('1/6 Testing SSH connection...');
  try {
    execSync(`${SSH} "echo connected"`, { stdio: 'pipe' });
    log('   ✓ SSH connection OK\n');
  } catch {
    console.error('   ❌ SSH connection failed. Check VPS_HOST, VPS_USER, and SSH key.');
    process.exit(1);
  }

  // Update apt
  log('2/6 Updating package lists...');
  remote('apt-get update -qq', 'apt-get update');
  log('   ✓\n');

  // Install Node.js 22 via NodeSource
  log('3/6 Installing Node.js 22...');
  remote(
    'curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs',
    'Install Node.js 22'
  );
  remote('node --version && npm --version', 'Verify versions');
  log('   ✓\n');

  // Install Chromium + deps for Remotion
  log('4/6 Installing Chromium and rendering dependencies...');
  remote(
    'apt-get install -y chromium-browser ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils 2>/dev/null || true',
    'Install Chromium + deps'
  );
  log('   ✓\n');

  // Create project directory
  log('5/6 Creating project directory...');
  remote(`mkdir -p /opt/therealmofpatterns/video/out`, 'mkdir /opt/therealmofpatterns/video');
  remote(`mkdir -p /opt/therealmofpatterns/video/public/assets`, 'mkdir public/assets');
  log('   ✓\n');

  // Initial rsync + npm install
  log('6/6 Syncing project and installing dependencies...');
  const rsyncKey = KEY ? `--rsh="ssh -i ${KEY} -o StrictHostKeyChecking=no"` : '';
  execSync(
    `rsync -az --exclude node_modules --exclude out ${rsyncKey} "${ROOT}/" "${USER}@${VPS}:/opt/therealmofpatterns/video/"`,
    { cwd: ROOT, stdio: 'inherit' }
  );
  remote(
    'cd /opt/therealmofpatterns/video && npm install 2>&1 | tail -3',
    'npm install'
  );
  log('   ✓\n');

  log('✅ VPS setup complete!\n');
  log('   Test render:');
  log('   node scripts/publish-daily.mjs --vps\n');
  log('   Full daily pipeline (render on VPS + upload YouTube):');
  log('   npm run publish:vps\n');
}

main().catch(err => {
  console.error('\n❌ Setup error:', err.message);
  process.exit(1);
});
