#!/usr/bin/env node

/**
 * AIMux CLI runner for npm / npx
 * Copyright (c) 2026 AIMux Contributors
 * Licensed under Apache-2.0
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const candidates = [
  'aimux',
  path.join(os.homedir(), '.local', 'bin', 'aimux'),
  '/usr/local/bin/aimux',
  '/opt/homebrew/bin/aimux',
  '/Applications/AIMux.app/Contents/MacOS/aimux',
  path.join(__dirname, '..', '..', '..', 'target', 'release', 'aimux')
];

let targetBin = null;
for (const cand of candidates) {
  if (cand === 'aimux') {
    const test = spawnSync('which', ['aimux'], { encoding: 'utf8' });
    if (test.status === 0 && test.stdout.trim()) {
      targetBin = test.stdout.trim();
      break;
    }
  } else if (fs.existsSync(cand)) {
    targetBin = cand;
    break;
  }
}

if (targetBin) {
  const result = spawnSync(targetBin, process.argv.slice(2), { stdio: 'inherit' });
  process.exit(result.status ?? 0);
} else {
  console.log(`\x1b[36m=== AIMux (AI Multiplexer & Isolation Runtime) ===\x1b[0m`);
  console.log(`Native binary not found in standard PATH.`);
  console.log(`\nTo install native AIMux on macOS:`);
  console.log(`  curl -fsSL https://raw.githubusercontent.com/Vs153698/aimux/main/scripts/install.sh | bash`);
  console.log(`\nOr download the latest release asset from:`);
  console.log(`  https://github.com/Vs153698/aimux/releases/latest\n`);
  process.exit(1);
}
