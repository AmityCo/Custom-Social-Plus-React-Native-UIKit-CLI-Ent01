#!/usr/bin/env node
/**
 * Launches an Android emulator with its HTTP proxy already pointed at Charles
 * running on the host machine.
 *
 * 10.0.2.2 is the emulator's alias for the host's loopback interface — from
 * inside the emulator, "localhost" is the emulator itself, so the host must be
 * addressed as 10.0.2.2.
 *
 * Usage:
 *   yarn android:charles                        # auto-detect the AVD
 *   yarn android:charles Pixel_9_Pro            # explicit AVD
 *   AVD=Pixel_9_Pro yarn android:charles        # explicit AVD via env
 *   CHARLES_PORT=9999 yarn android:charles      # non-default Charles port
 *
 * Any extra args after the AVD name are forwarded to the emulator binary, e.g.
 *   yarn android:charles Pixel_9_Pro -no-snapshot-load
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { setProxy, adbBin } = require('./emulator-proxy');

const CHARLES_PORT = process.env.CHARLES_PORT || '8888';
const PROXY = `http://10.0.2.2:${CHARLES_PORT}`;

/**
 * Resolve the emulator binary. It is frequently absent from PATH even when the
 * SDK is installed, so check the SDK locations before falling back to PATH.
 */
function resolveEmulator() {
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(require('os').homedir(), 'Library', 'Android', 'sdk'), // macOS default
    path.join(require('os').homedir(), 'Android', 'Sdk'), // Linux default
  ].filter(Boolean);

  for (const root of sdkRoots) {
    const candidate = path.join(root, 'emulator', 'emulator');
    if (fs.existsSync(candidate)) return candidate;
  }
  // Fall back to PATH and let spawn fail with a clear message if absent.
  return 'emulator';
}

const emulatorBin = resolveEmulator();

function listAvds() {
  try {
    return execFileSync(emulatorBin, ['-list-avds'], { encoding: 'utf-8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(`Could not run "${emulatorBin} -list-avds".`);
    console.error(
      'Set ANDROID_HOME to your SDK location, or add the emulator to PATH.'
    );
    process.exit(1);
  }
}

// First non-flag arg is the AVD name; everything else is passed through.
const argv = process.argv.slice(2);
const firstFlag = argv.findIndex((arg) => arg.startsWith('-'));
const positional = firstFlag === -1 ? argv : argv.slice(0, firstFlag);
const passthrough = firstFlag === -1 ? [] : argv.slice(firstFlag);

let avd = positional[0] || process.env.AVD;

if (!avd) {
  const avds = listAvds();
  if (avds.length === 0) {
    console.error('No AVDs found. Create one in Android Studio first.');
    process.exit(1);
  }
  if (avds.length > 1) {
    console.error('Multiple AVDs found — pass the one you want:\n');
    for (const name of avds) console.error(`  yarn android:charles ${name}`);
    console.error('');
    process.exit(1);
  }
  avd = avds[0];
  console.log(`Auto-detected AVD: ${avd}`);
}

// A already-running instance of the same AVD would make this a second, separate
// device — warn rather than silently booting a duplicate.
try {
  const devices = execFileSync(adbBin(), ['devices'], { encoding: 'utf-8' });
  if (/^emulator-\d+\s+device$/m.test(devices)) {
    console.warn(
      '\nWARNING: an emulator is already running. This will start a SECOND one.'
    );
    console.warn(
      'Close the running emulator first, or set the proxy on it live via'
    );
    console.warn(
      `Extended controls (...) -> Settings -> Proxy -> Manual, 10.0.2.2:${CHARLES_PORT}\n`
    );
  }
} catch {
  /* adb unavailable — not worth failing the launch over */
}

const args = ['-avd', avd, '-http-proxy', PROXY, ...passthrough];

console.log(`\nLaunching ${avd} with proxy ${PROXY}`);
console.log(`${emulatorBin} ${args.join(' ')}\n`);
console.log(
  `Reminder: add localhost:8081 and 10.0.2.2:8081 to Charles's\n` +
    `Proxy -> Proxy Settings -> External Proxies bypass list (or use a\n` +
    `Charles exclude rule) so the Metro JS bundle skips the proxy.\n`
);

const child = spawn(emulatorBin, args, { stdio: 'inherit' });

child.on('error', (error) => {
  console.error(`\nFailed to launch the emulator: ${error.message}`);
  if (error.code === 'ENOENT') {
    console.error('Set ANDROID_HOME, or add the emulator binary to PATH.');
  }
  process.exit(1);
});

child.on('exit', (code) => process.exit(code ?? 0));

/**
 * The -http-proxy flag above is not sufficient on its own — on current emulator
 * builds it silently does nothing (verified: 36.1.9 boots with working internet
 * that bypasses the proxy). Android's own global proxy setting is what actually
 * routes traffic, and it can only be written once the device is booted.
 */
async function applyProxyAfterBoot() {
  const deadline = Date.now() + 300000; // 5 minutes

  while (Date.now() < deadline) {
    try {
      const booted = execFileSync(
        adbBin(),
        ['shell', 'getprop', 'sys.boot_completed'],
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
      ).trim();

      if (booted === '1') {
        const readBack = setProxy(true);
        console.log(`\nGlobal proxy applied -> ${readBack}`);
        console.log(`Turn it off with: yarn charles:off\n`);
        return;
      }
    } catch {
      /* device not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.warn(
    '\nEmulator did not report boot within 5 minutes — set the proxy manually:'
  );
  console.warn('  yarn charles:on\n');
}

applyProxyAfterBoot();
