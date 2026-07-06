'use strict';

/*
 * Tests for the txt-to-cast authoring tool. The key guarantee is that whatever
 * the tool emits is a valid cast — so most assertions round-trip its output
 * back through the library's own parseCast(), the same function the player uses.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { transcriptToCast, toInlineBlock } = require('../tools/txt-to-cast.js');
const { parseCast } = require('..');

const ESC = '\x1b'; // raw escape byte — must never appear in the tool's output

test('output round-trips through parseCast', () => {
  const cast = transcriptToCast('$ echo hi\nhi\n');
  const events = parseCast(cast);
  assert.ok(events.length > 0);
  assert.ok(events.every((e) => Array.isArray(e) && e.length === 3));
});

test('the first line is a valid asciinema v2 header', () => {
  const cast = transcriptToCast('$ ls\n', { width: 100, height: 30, title: 'demo' });
  const header = JSON.parse(cast.split('\n')[0]);
  assert.equal(header.version, 2);
  assert.equal(header.width, 100);
  assert.equal(header.height, 30);
  assert.equal(header.title, 'demo');
});

test('a command is typed out one character at a time', () => {
  const cast = transcriptToCast('$ ab\n', { prompt: '$ ' });
  const events = parseCast(cast);
  // prompt, then "a", then "b", then newline
  const texts = events.map((e) => e[2]);
  assert.deepEqual(texts, ['$ ', 'a', 'b', '\r\n']);
});

test('output lines are emitted whole, not typed', () => {
  const cast = transcriptToCast('$ echo hello\nhello world\n');
  const texts = parseCast(cast).map((e) => e[2]);
  assert.ok(texts.includes('hello world\r\n'), 'output line kept intact');
});

test('timestamps are monotonically non-decreasing', () => {
  const cast = transcriptToCast('$ one\nout\n$ two\nmore\n');
  const times = parseCast(cast).map((e) => e[0]);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] >= times[i - 1], `t[${i}]=${times[i]} >= t[${i - 1}]=${times[i - 1]}`);
  }
});

test('timing knobs change the timeline', () => {
  const slow = parseCast(transcriptToCast('$ abcd\n', { typeSpeed: 100 }));
  const fast = parseCast(transcriptToCast('$ abcd\n', { typeSpeed: 10 }));
  const last = (evs) => evs[evs.length - 1][0];
  assert.ok(last(slow) > last(fast), 'a slower type-speed yields later timestamps');
});

test('output never contains a raw ESC byte, even with --color', () => {
  const cast = transcriptToCast('$ x\n', { color: true });
  assert.ok(!cast.includes(ESC), 'no raw control byte in the file text');
  assert.ok(cast.includes('\\u001b'), 'the escape is written as the JSON escape');
  // …and it still parses and yields a real ESC once JSON-decoded.
  const firstEventText = parseCast(cast)[0][2];
  assert.ok(firstEventText.includes(ESC), 'decodes back to a real ESC for the renderer');
});

test('a custom prompt avoids misclassifying output as commands', () => {
  // Output happens to contain "$ " but the real prompt is "❯ ".
  const cast = transcriptToCast('❯ run\ncost is $ 5\n', { prompt: '❯ ' });
  const texts = parseCast(cast).map((e) => e[2]);
  assert.ok(texts.includes('cost is $ 5\r\n'), 'the "$ " output line stays intact');
});

test('toInlineBlock wraps a paste-ready, parseable block', () => {
  const cast = transcriptToCast('$ hi\n');
  const block = toInlineBlock(cast, 'session');
  assert.match(block, /<pre class="term" data-cast="#session"><\/pre>/);
  assert.match(block, /<script type="text\/cast" id="session">/);
  // The cast inside the block still parses (mirrors how the player reads it).
  const inner = block.match(/id="session">\n([\s\S]*?)\n<\/script>/)[1];
  assert.ok(parseCast(inner).length > 0);
});

test('the bundled example transcript converts and parses', () => {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'examples', 'demo-session.txt'), 'utf8');
  const events = parseCast(transcriptToCast(txt));
  assert.ok(events.length > 0);
});
