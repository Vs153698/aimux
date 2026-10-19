#!/usr/bin/env node

/**
 * AIMux CLI runner for npm / npx
 * Auto-bootstraps the native engine if not already installed.
 * Copyright (c) 2026 AIMux Contributors
 * Licensed under Apache-2.0
 */

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

const VERSION = '0.2.0';
const GITHUB_REPO = 'Vs153698/aimux';

const cacheDir = path.join(os.homedir(), '.aimux', 'bin');
const cachedBin = path.join(cacheDir, os.platform() === 'win32' ? 'aimux.exe' : 'aimux');

function isNativeBinary(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const real = fs.realpathSync(filePath);
    if (real === fs.realpathSync(__filename)) return false;
    if (real.includes('node_modules')) return false;

    const buf = Buffer.alloc(4);
    const fd = fs.openSync(real, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);

    // Shell and Node scripts begin with #! (0x23 0x21)
    if (buf[0] === 0x23 && buf[1] === 0x21) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function findExistingBin() {
  const explicitCandidates = [
    cachedBin,
    path.join(os.homedir(), '.local', 'bin', 'aimux'),
    '/usr/local/bin/aimux',
    '/opt/homebrew/bin/aimux',
    '/Applications/AIMux.app/Contents/MacOS/aimux',
    path.join(__dirname, '..', '..', '..', 'target', 'release', 'aimux')
  ];

  for (const cand of explicitCandidates) {
    if (isNativeBinary(cand)) {
      return cand;
    }
  }

  try {
    const whichCmd = os.platform() === 'win32' ? 'where' : 'which';
    const test = spawnSync(whichCmd, ['aimux'], { encoding: 'utf8' });
    if (test.status === 0 && test.stdout.trim()) {
      const paths = test.stdout.trim().split('\n');
      for (const p of paths) {
        const cleaned = p.trim();
        if (isNativeBinary(cleaned)) {
          return cleaned;
        }
      }
    }
  } catch (e) {}

  return null;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(currentUrl, redirectCount) {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      const client = currentUrl.startsWith('https') ? https : http;
      client.get(currentUrl, { headers: { 'User-Agent': 'aimux-bootstrapper' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download binary: HTTP ${res.statusCode}`));
        }
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(resolve));
      }).on('error', reject);
    }
    get(url, 0);
  });
}

async function ensureNativeBin() {
  const existing = findExistingBin();
  if (existing) return existing;

  const platform = os.platform();
  const arch = os.arch();

  let assetName = '';
  let isTarGz = false;

  if (platform === 'darwin' && arch === 'arm64') {
    assetName = `aimux-v${VERSION}-darwin-arm64.tar.gz`;
    isTarGz = true;
  } else if (platform === 'darwin' && arch === 'x64') {
    assetName = 'aimux-Darwin-x86_64';
  } else if (platform === 'linux' && arch === 'x64') {
    assetName = 'aimux-Linux-x86_64';
  } else if (platform === 'win32' && arch === 'x64') {
    assetName = 'aimux-Windows-x86_64.exe';
  } else {
    assetName = `aimux-v${VERSION}-darwin-arm64.tar.gz`;
    isTarGz = true;
  }

  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}/${assetName}`;

  console.log(`\x1b[36m⚡ AIMux native engine v${VERSION} not found locally.\x1b[0m`);
  console.log(`⬇️  Auto-downloading precompiled binary for ${platform}-${arch} from GitHub...`);

  fs.mkdirSync(cacheDir, { recursive: true });
  const tempDownload = path.join(cacheDir, assetName);

  try {
    await download(downloadUrl, tempDownload);

    if (isTarGz) {
      execSync(`tar -xzf "${tempDownload}" -C "${cacheDir}"`, { stdio: 'ignore' });
      try { fs.unlinkSync(tempDownload); } catch (e) {}
    } else {
      fs.renameSync(tempDownload, cachedBin);
    }

    fs.chmodSync(cachedBin, 0o755);
    console.log(`\x1b[32m✔ Native engine installed to ${cachedBin}\x1b[0m\n`);
    return cachedBin;
  } catch (err) {
    console.error(`\x1b[31m✖ Auto-download failed: ${err.message}\x1b[0m`);
    console.error(`Please install manually: curl -fsSL https://raw.githubusercontent.com/${GITHUB_REPO}/main/scripts/install.sh | bash`);
    process.exit(1);
  }
}

async function run() {
  const bin = await ensureNativeBin();
  const res = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

run();
