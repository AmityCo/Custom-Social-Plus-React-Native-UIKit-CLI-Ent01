#!/usr/bin/env node
/**
 * Turns Android's global HTTP proxy on/off on a running emulator, pointing it
 * at Charles on the host.
 *
 * Why this and not the emulator's -http-proxy flag: on current emulator builds
 * (verified broken on 36.1.9) the -http-proxy flag silently does nothing —
 * the emulator boots with working internet that bypasses the proxy entirely.
 * Setting Android's own global proxy via adb is what actually routes traffic.
 *
 * Usage:
 *   node scripts/emulator-proxy.js on     # route through Charles
 *   node scripts/emulator-proxy.js off    # clear it
 */
const path = require('path');
const { execFileSync } = require('child_process');

const CHARLES_PORT = process.env.CHARLES_PORT || '8888';
/** 10.0.2.2 is the emulator's alias for the host's loopback interface. */
const PROXY_HOST = '10.0.2.2';

function adbBin() {
  const root = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  return root ? path.join(root, 'platform-tools', 'adb') : 'adb';
}

function adb(args, options = {}) {
  return execFileSync(adbBin(), args, { encoding: 'utf-8', ...options });
}

/** Applies or clears the global proxy. Exported so the launcher can reuse it. */
function setProxy(enabled, serial) {
  const target = serial ? ['-s', serial] : [];
  const value = enabled ? `${PROXY_HOST}:${CHARLES_PORT}` : ':0';

  // ':0' is Android's idiom for "no proxy". Writing an empty string leaves the
  // setting present-but-blank, which some apps still try to honour.
  adb([...target, 'shell', 'settings', 'put', 'global', 'http_proxy', value]);

  const readBack = adb([
    ...target,
    'shell',
    'settings',
    'get',
    'global',
    'http_proxy',
  ]).trim();

  return readBack;
}

function hasRunningEmulator() {
  try {
    return /^emulator-\d+\s+device$/m.test(adb(['devices']));
  } catch {
    return false;
  }
}

if (require.main === module) {
  const mode = (process.argv[2] || '').toLowerCase();

  if (mode !== 'on' && mode !== 'off') {
    console.error('Usage: node scripts/emulator-proxy.js <on|off>');
    process.exit(1);
  }

  if (!hasRunningEmulator()) {
    console.error(
      'No running emulator found. Start one first (yarn android:charles).'
    );
    process.exit(1);
  }

  const readBack = setProxy(mode === 'on');

  if (mode === 'on') {
    console.log(`Proxy ON  -> ${readBack}`);
    console.log(
      `\nCharles must be listening on ${CHARLES_PORT}, or the emulator loses` +
        ` all network access.`
    );
    console.log(
      `Add localhost:8081 and 10.0.2.2:8081 to Charles's bypass list so the` +
        ` Metro bundle still loads.`
    );
  } else {
    console.log(`Proxy OFF -> ${readBack}   (':0' means no proxy)`);
  }
}

module.exports = {
  setProxy,
  hasRunningEmulator,
  adbBin,
  CHARLES_PORT,
  PROXY_HOST,
};
