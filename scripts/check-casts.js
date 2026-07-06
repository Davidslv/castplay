#!/usr/bin/env node
'use strict';

/*
 * check-casts.js — the cast/encoding gate.
 *
 * Two project-specific invariants that ordinary linters don't know about, and
 * both of which actually broke during development:
 *
 *   1. No raw ESC control byte (U+001B) anywhere in the source tree. In a
 *      `.cast` (and in docs) the escape must be the JSON escape `\u001b`; a raw
 *      byte is invisible in an editor AND makes `JSON.parse` throw. This guard
 *      makes that class of bug unrepresentable.
 *
 *   2. Every cast we ship parses. All `examples/*.cast` files and every inline
 *      `<script type="text/cast">` block in `index.html` must survive
 *      `parseCast()` — so a broken demo can never land.
 *
 * Dependency-free by design, like the library. Run via `npm run lint:casts`.
 * Exits non-zero on the first failure.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const { parseCast } = require(path.join(repoRoot, 'castplay.js'));

const SKIP_DIRS = new Set(['.git', 'node_modules']);
const ESC = 0x1b;
let failures = 0;

function fail(msg) {
  console.error('check-casts: FAIL — ' + msg);
  failures++;
}

/** Recursively yield every file path under `dir`, skipping SKIP_DIRS. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walk(path.join(dir, entry.name)));
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// --- 1. No raw ESC byte anywhere -------------------------------------------
for (const file of walk(repoRoot)) {
  if (fs.readFileSync(file).includes(ESC)) {
    fail('raw ESC byte (U+001B) in ' + path.relative(repoRoot, file) + ' — write it as \\u001b');
  }
}

// --- 2. Every example cast parses ------------------------------------------
const examplesDir = path.join(repoRoot, 'examples');
if (fs.existsSync(examplesDir)) {
  for (const name of fs.readdirSync(examplesDir)) {
    if (!name.endsWith('.cast')) continue;
    const p = path.join(examplesDir, name);
    try {
      const events = parseCast(fs.readFileSync(p, 'utf8'));
      if (!events.length) fail('examples/' + name + ' parsed to zero events');
    } catch (e) {
      fail('examples/' + name + ' does not parse: ' + e.message);
    }
  }
}

// --- 3. Every inline cast in index.html parses -----------------------------
const indexPath = path.join(repoRoot, 'index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const re = /<script[^>]*type="text\/cast"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  let count = 0;
  while ((m = re.exec(html))) {
    count++;
    try {
      parseCast(m[1]);
    } catch (e) {
      fail('inline cast #' + count + ' in index.html does not parse: ' + e.message);
    }
  }
}

if (failures) {
  console.error('check-casts: ' + failures + ' failure(s)');
  process.exit(1);
}
console.log('check-casts: OK — no raw ESC bytes; all example and inline casts parse');
