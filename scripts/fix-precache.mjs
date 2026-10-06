// scripts/fix-precache.mjs
//
// Runs after `next build`. Patches `public/sw.js` to add HTML route
// entries into the Workbox precache manifest — workaround for
// @ducanh2912/next-pwa not honoring additionalManifestEntries.

import fs from 'node:fs';
import path from 'node:path';

const SW_PATH = path.join(process.cwd(), 'public', 'sw.js');

// HTML routes to precache, in priority order. "/" and "/home" are the
// critical ones — the rest are for offline navigation.
const ROUTES = [
  '/',
  '/home',
  '/login',
  '/verify',
  '/apply/loan',
  '/apply',
  '/apply/confirm',
  '/apply/review',
  '/apply-done',
  '/loans',
  '/notifications',
  '/profile',
];

if (!fs.existsSync(SW_PATH)) {
  console.error('✗ sw.js not found at', SW_PATH);
  process.exit(1);
}

let sw = fs.readFileSync(SW_PATH, 'utf8');

// Workbox wraps the precache manifest as `precacheAndRoute([...], {...})`.
// The array contains objects like: {url:"...",revision:"..."}
// We insert our HTML routes at the start of the array.
const INSERTION_POINT = /precacheAndRoute\(\s*\[/;

if (!INSERTION_POINT.test(sw)) {
  console.error('✗ Could not locate precacheAndRoute([...]) in sw.js');
  process.exit(1);
}

// Skip routes already present (avoid duplicates)
const present = new Set();
const urlMatches = sw.matchAll(/url\s*:\s*"([^"]+)"/g);
for (const m of urlMatches) present.add(m[1]);

const missing = ROUTES.filter((r) => !present.has(r));

if (missing.length === 0) {
  console.log('✓ All HTML routes already precached — nothing to inject');
  process.exit(0);
}

const injections = missing
  .map((url) => `{url:${JSON.stringify(url)},revision:null}`)
  .join(',');

sw = sw.replace(INSERTION_POINT, (match) => `${match}${injections},`);

fs.writeFileSync(SW_PATH, sw, 'utf8');
console.log(`✓ Injected ${missing.length} HTML route(s) into sw.js:`);
missing.forEach((r) => console.log(`    ${r}`));