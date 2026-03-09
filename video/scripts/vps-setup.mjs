/**
 * vps-setup.mjs
 * One-time setup of Hetzner VPS for Docker-based Remotion rendering.
 * Installs Docker, pulls ghcr.io/remotion-dev/base, and syncs project.
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
  log(`\n🖥  Setting up Hetzner VPS for Docker-based Remotion rendering`);
  log(`   Host: ${USER}@${VPS}\n`);

  // Test connectivity
  log('1/5 Testing SSH connection...');
  try {
    execSync(`${SSH} "echo connected"`, { stdio: 'pipe' });
    log('   ✓ SSH connection OK\n');
  } catch {
    console.error('   ❌ SSH connection failed. Check VPS_HOST, VPS_USER, and SSH key.');
    process.exit(1);
  }

  // Update apt + install Docker
  log('2/5 Installing Docker...');
  remote(
    'apt-get update -qq && apt-get install -y ca-certificates curl && ' +
    'install -m 0755 -d /etc/apt/keyrings && ' +
    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && ' +
    'chmod a+r /etc/apt/keyrings/docker.asc && ' +
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] ' +
      'https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" ' +
      '> /etc/apt/sources.list.d/docker.list && ' +
    'apt-get update -qq && apt-get install -y docker-ce docker-ce-cli containerd.io',
    'Install Docker CE'
  );
  remote('docker --version', 'Verify Docker');
  log('   ✓\n');

  // Pull Remotion base image (has Chromium + all deps pre-baked)
  log('3/5 Pulling ghcr.io/remotion-dev/base (~1.5 GB, one-time)...');
  remote('docker pull ghcr.io/remotion-dev/base', 'docker pull remotion-dev/base');
  log('   ✓\n');

  // Create project directory
  log('4/5 Creating project directory...');
  remote('mkdir -p /opt/therealmofpatterns/video/out', 'mkdir project dirs');
  remote('mkdir -p /opt/therealmofpatterns/video/public/assets', 'mkdir public/assets');
  log('   ✓\n');

  // Initial rsync + docker build
  log('5/5 Syncing project and building Docker image...');
  const rsyncKey = KEY ? `--rsh="ssh -i ${KEY} -o StrictHostKeyChecking=no"` : '';
  execSync(
    `rsync -az --exclude node_modules --exclude out ${rsyncKey} "${ROOT}/" "${USER}@${VPS}:/opt/therealmofpatterns/video/"`,
    { cwd: ROOT, stdio: 'inherit' }
  );
  remote(
    'cd /opt/therealmofpatterns/video && docker build -t rop-video . 2>&1 | tail -5',
    'docker build rop-video'
  );
  log('   ✓\n');

  log('✅ VPS setup complete!\n');
  log('   Test render:');
  log('   node scripts/publish-daily.mjs --vps\n');
  log('   Daily pipeline:');
  log('   npm run publish:vps\n');
}

main().catch(err => {
  console.error('\n❌ Setup error:', err.message);
  process.exit(1);
});
