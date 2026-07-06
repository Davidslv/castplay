'use strict';

/*
 * Behavioural tests for castplay's pure, DOM-free core: parseCast() and
 * ansiToHtml(). These are the two functions that decide whether a recorded
 * session renders correctly, so they are the ones worth pinning down. The
 * Player/scan DOM layer is exercised by opening index.html in a browser (see
 * docs/architecture.md — "Testing strategy"); it is deliberately not mocked
 * here, to keep the test suite dependency-free like the library itself.
 *
 * Run with:  npm test   (i.e. `node --test`)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const castplay = require('..');
const { parseCast, ansiToHtml, palette, version, Player, init } = castplay;

const ESC = '\x1b'; // the escape byte that opens every ANSI-SGR sequence

test('public API surface is present', () => {
  assert.equal(typeof parseCast, 'function');
  assert.equal(typeof ansiToHtml, 'function');
  assert.equal(typeof init, 'function');
  assert.equal(typeof Player, 'function');
  assert.equal(typeof palette, 'object');
  assert.match(version, /^\d+\.\d+\.\d+$/, 'version is semver');
});

test('version matches package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(version, pkg.version);
});

test('parseCast drops the header and returns output events', () => {
  const cast = ['{"version":2,"width":80,"height":24}', '[0.1,"o","a"]', '[0.2,"o","b"]'].join(
    '\n',
  );
  const events = parseCast(cast);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], [0.1, 'o', 'a']);
  assert.deepEqual(events[1], [0.2, 'o', 'b']);
});

test('parseCast tolerates blank lines and a trailing newline', () => {
  const cast = '{"version":2}\n[0,"o","x"]\n\n';
  const events = parseCast(cast);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], [0, 'o', 'x']);
});

test('parseCast tolerates whitespace-only lines (e.g. an indented </script>)', () => {
  // Inline casts read from a <script> element's textContent carry the page's
  // indentation, so the last line before a nested </script> is often "  ".
  const cast = '  {"version":2}\n  [0,"o","x"]\n  ';
  const events = parseCast(cast);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], [0, 'o', 'x']);
});

test('parseCast throws SyntaxError on a malformed event line', () => {
  const cast = '{"version":2}\n[0,"o", not-json]';
  assert.throws(() => parseCast(cast), SyntaxError);
});

test('the bundled example cast parses', () => {
  const cast = fs.readFileSync(path.join(__dirname, '..', 'examples', 'hello.cast'), 'utf8');
  const events = parseCast(cast);
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => Array.isArray(e) && e.length === 3));
});

test('ansiToHtml escapes HTML-significant characters in text', () => {
  const html = ansiToHtml('a < b & c > d');
  assert.match(html, /a &lt; b &amp; c &gt; d/);
  assert.doesNotMatch(html, /<(?!\/?span)/, 'no stray tags leak through');
});

test('ansiToHtml maps a palette colour code to its CSS colour', () => {
  const html = ansiToHtml(ESC + '[32mhello' + ESC + '[0m');
  assert.match(html, new RegExp('color:' + palette[32].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, />hello</);
});

test('ansiToHtml renders bold for SGR 1 and resets on SGR 0', () => {
  const html = ansiToHtml(ESC + '[1mbold' + ESC + '[0mplain');
  assert.match(html, /font-weight:700;[^>]*>bold/);
  // After reset, "plain" is in a span with no styling.
  assert.match(html, /<span>plain<\/span>/);
});

test('ansiToHtml handles combined codes in one sequence (1;32)', () => {
  const html = ansiToHtml(ESC + '[1;32mx' + ESC + '[0m');
  assert.match(html, /color:/);
  assert.match(html, /font-weight:700;/);
});

test('ansiToHtml ignores unmapped SGR codes without dropping text', () => {
  const html = ansiToHtml(ESC + '[45mtext' + ESC + '[0m'); // 45 = bg magenta, unmapped
  assert.match(html, />text</);
  assert.doesNotMatch(html, /color:/, 'unmapped code adds no colour');
});

test('ansiToHtml normalises CRLF to LF', () => {
  const html = ansiToHtml('line1\r\nline2');
  assert.doesNotMatch(html, /\r/);
  assert.match(html, /line1\nline2/);
});

test('init() is a no-op outside a browser (no document)', () => {
  assert.equal(typeof globalThis.document, 'undefined');
  assert.doesNotThrow(() => init());
});

test('palette is overridable and ansiToHtml reflects the change', () => {
  const original = palette[36];
  try {
    palette[36] = '#123456';
    const html = ansiToHtml(ESC + '[36mx' + ESC + '[0m');
    assert.match(html, /color:#123456/);
  } finally {
    palette[36] = original; // restore, so test order can't leak
  }
});
