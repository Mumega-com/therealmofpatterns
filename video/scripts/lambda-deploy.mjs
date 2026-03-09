/**
 * lambda-deploy.mjs
 * Manages Remotion Lambda deployment for headless cloud rendering.
 *
 * Commands:
 *   node scripts/lambda-deploy.mjs setup    — Print setup instructions + validate AWS
 *   node scripts/lambda-deploy.mjs deploy   — Deploy Lambda function + site
 *   node scripts/lambda-deploy.mjs sites    — Deploy/update S3 site only
 *   node scripts/lambda-deploy.mjs info     — Print current deployment info
 *
 * Prerequisites:
 *   1. AWS account with programmatic access
 *   2. AWS credentials in ~/.aws/credentials OR env vars:
 *      AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (default: us-east-1)
 *   3. npm install done (includes @remotion/lambda)
 *
 * Required IAM permissions — run first:
 *   npx remotion lambda policies validate
 *   npx remotion lambda policies print
 *
 * Add these to video/.env after deploying:
 *   REMOTION_AWS_ACCESS_KEY_ID=...
 *   REMOTION_AWS_SECRET_ACCESS_KEY=...
 *   LAMBDA_FUNCTION_NAME=remotion-render-...
 *   LAMBDA_SERVE_URL=https://...
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const envPath = join(ROOT, '.env');

// Load .env
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const REGION    = process.env.AWS_REGION ?? 'us-east-1';
const SITE_NAME = 'therealmofpatterns';
const MEMORY    = 3009;   // MB (max for optimal render speed)
const DISK      = 2048;   // MB
const TIMEOUT   = 240;    // seconds

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function execCapture(cmd) {
  return execSync(cmd, { cwd: ROOT }).toString().trim();
}

function log(msg) { process.stdout.write(msg + '\n'); }

// ── Commands ──────────────────────────────────────────────────────

async function setup() {
  log('\n🚀 Remotion Lambda Setup Guide\n');
  log('Step 1: Configure AWS credentials');
  log('   Option A — AWS credentials file:');
  log('     aws configure');
  log('   Option B — Environment variables in video/.env:');
  log('     AWS_ACCESS_KEY_ID=...');
  log('     AWS_SECRET_ACCESS_KEY=...');
  log(`     AWS_REGION=${REGION}\n`);

  log('Step 2: Validate IAM permissions');
  log('   npx remotion lambda policies validate\n');

  log('Step 3: Create IAM role (one-time)');
  log('   npx remotion lambda role create\n');

  log('Step 4: Deploy function + site');
  log('   node scripts/lambda-deploy.mjs deploy\n');

  log('Step 5: Add to video/.env the output values:');
  log('   LAMBDA_FUNCTION_NAME=remotion-render-...');
  log('   LAMBDA_SERVE_URL=https://...\n');

  log('After setup, use:');
  log('   node scripts/publish-daily.mjs --lambda\n');

  // Try to validate if AWS is configured
  log('─────────────────────────────────────');
  log('Checking AWS configuration...');
  try {
    exec('npx remotion lambda policies validate', { stdio: 'pipe' });
    log('✓ AWS credentials valid and permissions look good!');
  } catch {
    log('⚠ AWS not configured or missing permissions. Follow steps above.');
  }
}

async function deploy() {
  log('\n🚀 Deploying Remotion Lambda...\n');

  // 1. Deploy Lambda function
  log('1/3 Deploying Lambda function...');
  log(`    Memory: ${MEMORY}MB | Disk: ${DISK}MB | Timeout: ${TIMEOUT}s | Region: ${REGION}`);
  try {
    const fnOut = execCapture(
      `npx remotion lambda functions deploy --memory=${MEMORY} --disk=${DISK} --timeout=${TIMEOUT} --region=${REGION} --yes`
    );
    log(`    ✓ ${fnOut.split('\n').find(l => l.includes('remotion-render')) ?? 'deployed'}`);
  } catch (e) {
    log('    ❌ Function deploy failed. Ensure IAM role exists: npx remotion lambda role create');
    process.exit(1);
  }

  // 2. Get function name
  log('\n2/3 Getting function info...');
  let functionName = '';
  try {
    const fnList = execCapture(`npx remotion lambda functions ls --region=${REGION} --json`);
    const fns = JSON.parse(fnList);
    functionName = fns[0]?.functionName ?? '';
    log(`    ✓ Function: ${functionName}`);
  } catch {
    log('    Could not auto-detect function name. Check manually:');
    log('    npx remotion lambda functions ls');
  }

  // 3. Deploy site to S3
  log('\n3/3 Deploying site to S3...');
  let serveUrl = '';
  try {
    const siteOut = execCapture(
      `npx remotion lambda sites create --site-name=${SITE_NAME} --region=${REGION}`
    );
    const urlMatch = siteOut.match(/https:\/\/[^\s]+/);
    serveUrl = urlMatch ? urlMatch[0] : '';
    log(`    ✓ Site URL: ${serveUrl}`);
  } catch (e) {
    log('    ❌ Site deploy failed. Check S3 permissions.');
    process.exit(1);
  }

  // 4. Write to .env
  if (functionName || serveUrl) {
    log('\n📝 Updating video/.env...');
    let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

    if (functionName) {
      if (envContent.includes('LAMBDA_FUNCTION_NAME=')) {
        envContent = envContent.replace(/LAMBDA_FUNCTION_NAME=.*/g, `LAMBDA_FUNCTION_NAME=${functionName}`);
      } else {
        envContent += `\nLAMBDA_FUNCTION_NAME=${functionName}`;
      }
    }
    if (serveUrl) {
      if (envContent.includes('LAMBDA_SERVE_URL=')) {
        envContent = envContent.replace(/LAMBDA_SERVE_URL=.*/g, `LAMBDA_SERVE_URL=${serveUrl}`);
      } else {
        envContent += `\nLAMBDA_SERVE_URL=${serveUrl}`;
      }
    }
    writeFileSync(envPath, envContent.trimEnd() + '\n');
    log('    ✓ .env updated');
  }

  log('\n✅ Lambda deployment complete!\n');
  log('Test with:');
  log('   node scripts/publish-daily.mjs --lambda');
}

async function sites() {
  log('\n🌐 Deploying/updating S3 site...\n');
  exec(`npx remotion lambda sites create --site-name=${SITE_NAME} --region=${REGION}`);
  log('\n✅ Site updated. Update LAMBDA_SERVE_URL in .env with the URL above.');
}

async function info() {
  log('\n📋 Remotion Lambda Info\n');
  log('Functions:');
  try {
    exec(`npx remotion lambda functions ls --region=${REGION}`);
  } catch {
    log('   No functions found or AWS not configured.');
  }
  log('\nSites:');
  try {
    exec(`npx remotion lambda sites ls --region=${REGION}`);
  } catch {
    log('   No sites found.');
  }
  log('\nCurrent .env values:');
  log(`   LAMBDA_FUNCTION_NAME=${process.env.LAMBDA_FUNCTION_NAME ?? '(not set)'}`);
  log(`   LAMBDA_SERVE_URL=${process.env.LAMBDA_SERVE_URL ?? '(not set)'}`);
  log(`   AWS_REGION=${REGION}`);
}

// ── CLI ───────────────────────────────────────────────────────────
const cmd = process.argv[2];
switch (cmd) {
  case 'setup':   await setup();  break;
  case 'deploy':  await deploy(); break;
  case 'sites':   await sites();  break;
  case 'info':    await info();   break;
  default:
    log('Usage: node scripts/lambda-deploy.mjs [setup|deploy|sites|info]');
    log('  setup  — Print AWS setup guide');
    log('  deploy — Deploy Lambda function + S3 site');
    log('  sites  — Update S3 site only (after code changes)');
    log('  info   — Show current deployment status');
    process.exit(1);
}
