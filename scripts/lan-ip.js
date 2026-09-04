#!/usr/bin/env node
/**
 * Prints this computer's LAN IPv4 address — the one a physical Android device
 * on the same Wi-Fi should use as its manual proxy host for Charles.
 *
 * Uses os.networkInterfaces() rather than parsing `ifconfig` / `ip addr`, so
 * the same code works on macOS, Linux and Windows.
 *
 * Usage:
 *   yarn lan-ip                 # human-readable, with proxy settings
 *   yarn lan-ip --quiet         # just the IP, for piping
 */
const os = require('os');

const CHARLES_PORT = process.env.CHARLES_PORT || '8888';
const quiet = process.argv.includes('--quiet');

/**
 * Interface names that are Wi-Fi / primary Ethernet on each platform. Ranked —
 * earlier is preferred. macOS: en0 is Wi-Fi on laptops, en1 on some desktops.
 * Linux: wlan0 / wlp* are Wi-Fi, eth0 / enp* wired.
 */
const PREFERRED_NAMES = [
  /^en0$/, // macOS Wi-Fi
  /^en1$/, // macOS secondary
  /^wlan\d+$/, // Linux Wi-Fi
  /^wlp/, // Linux Wi-Fi (predictable names)
  /^eth\d+$/, // Linux wired
  /^enp/, // Linux wired (predictable names)
  /^Wi-?Fi$/i, // Windows
];

/** Private (RFC1918) ranges — a LAN address the phone can actually reach. */
function isPrivateV4(ip) {
  const [a, b] = ip.split('.').map(Number);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function collectCandidates() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses || []) {
      // Node <18 reports family as 'IPv4', >=18 as 4 — accept both.
      const isV4 = address.family === 'IPv4' || address.family === 4;
      if (!isV4 || address.internal) continue;
      // 169.254.x.x is link-local (DHCP failed) — never reachable as a proxy.
      if (address.address.startsWith('169.254.')) continue;
      candidates.push({ name, ip: address.address });
    }
  }
  return candidates;
}

function rank(candidate) {
  const nameRank = PREFERRED_NAMES.findIndex((re) => re.test(candidate.name));
  return [
    isPrivateV4(candidate.ip) ? 0 : 1, // private beats public
    nameRank === -1 ? PREFERRED_NAMES.length : nameRank,
    candidate.name,
  ];
}

const candidates = collectCandidates();

if (candidates.length === 0) {
  console.error(
    'No external IPv4 address found. Connect to Wi-Fi and try again.'
  );
  process.exit(1);
}

candidates.sort((a, b) => {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] < rb[i]) return -1;
    if (ra[i] > rb[i]) return 1;
  }
  return 0;
});

const best = candidates[0];

if (quiet) {
  console.log(best.ip);
  process.exit(0);
}

console.log('');
console.log('  Charles proxy settings for a physical Android device');
console.log('  ---------------------------------------------------');
console.log(`  Proxy host : ${best.ip}      (interface ${best.name})`);
console.log(`  Proxy port : ${CHARLES_PORT}`);
console.log('');
console.log('  On the phone: Settings -> Wi-Fi -> long-press your network ->');
console.log('  Modify network -> Advanced -> Proxy -> Manual, then enter the');
console.log('  host and port above. Approve the "Allow" prompt in Charles.');

if (candidates.length > 1) {
  console.log('');
  console.log('  Other interfaces (use one of these if the above is wrong):');
  for (const candidate of candidates.slice(1)) {
    console.log(`    ${candidate.ip.padEnd(16)} ${candidate.name}`);
  }
}

if (!isPrivateV4(best.ip)) {
  console.log('');
  console.log(
    '  WARNING: this is not a private LAN address. The phone probably cannot'
  );
  console.log(
    '  reach it. Check that both devices are on the same Wi-Fi network.'
  );
}

console.log('');
console.log('  Remember to set the proxy back to "None" when you are done.');
console.log('');
