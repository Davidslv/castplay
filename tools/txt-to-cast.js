#!/usr/bin/env node
'use strict';

/*
 * txt-to-cast.js — turn a plain-text terminal transcript into an asciinema
 * v2 `.cast` that castplay can play.
 *
 * The workflow this exists for: you already ran something in your terminal and
 * you want a castplay animation of it, but you didn't record it with asciinema.
 * So you select the terminal output, paste it into a `.txt` file, and run this.
 * It synthesises the timing (plain text has none): command lines "type" out
 * character by character, output streams in, with pauses in between — the same
 * feel as a real recording.
 *
 * It is NOT a recorder. Capturing a live session (keystroke timing, colour) is
 * asciinema's job and it does it well. This is an authoring convenience for
 * text you already have.
 *
 * Usage:
 *   node tools/txt-to-cast.js session.txt -o session.cast
 *   pbpaste | node tools/txt-to-cast.js > session.cast          # from stdin
 *   node tools/txt-to-cast.js session.txt --inline demo         # paste-ready HTML
 *
 * Options (all have sensible defaults):
 *   -o, --output <file>   write here instead of stdout
 *       --prompt <str>    the marker that begins a typed command line (default "$ ")
 *       --type-speed <ms> per-character delay while typing a command (default 40)
 *       --line-pause <ms> pause after Enter and between commands (default 500)
 *       --output-speed <ms> per-line delay while output streams (default 30)
 *       --title <str>     cast title (stored in the header)
 *       --width <n>       terminal width in the header (default 80)
 *       --height <n>      terminal height in the header (default 24)
 *       --inline [id]     wrap the result as a paste-ready <pre> + inline
 *                         <script type="text/cast"> block (default id "demo")
 *       --color           colour the prompt marker green (ANSI SGR 32)
 *   -h, --help
 *
 * How lines are classified: a line beginning with the prompt marker (default
 * "$ ") is treated as a typed command — the prompt is shown instantly, then the
 * rest is typed out. Every other line is output and is emitted whole. If your
 * real output contains lines that start with "$ ", pass a more distinctive
 * --prompt to avoid misclassifying them.
 */

const fs = require('fs');

const ESC = '\x1b';

const DEFAULTS = {
  prompt: '$ ',
  typeSpeed: 40,
  linePause: 500,
  outputSpeed: 30,
  width: 80,
  height: 24,
  title: null,
  color: false,
};

/** Round to millisecond precision to keep timestamps tidy and stable. */
function round3(seconds) {
  return Math.round(seconds * 1000) / 1000;
}

/**
 * Convert a plain-text transcript into asciinema v2 `.cast` text.
 *
 * Pure and dependency-free: given the same input and options it always returns
 * the same string, which is what makes it testable and lets its output be piped
 * straight through `parseCast`.
 *
 * @param {string} text            the transcript
 * @param {object} [options]       overrides for the DEFAULTS above
 * @returns {string}               newline-delimited JSON (header + events)
 */
function transcriptToCast(text, options) {
  const opt = Object.assign({}, DEFAULTS, options);

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  // Drop the single empty line produced by a trailing newline.
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  const events = [];
  let t = 0; // seconds
  const push = (s) => events.push([round3(t), 'o', s]);
  const advance = (ms) => {
    t += ms / 1000;
  };

  for (const line of lines) {
    if (line.startsWith(opt.prompt)) {
      // A typed command: pause first (unless this is the very first thing),
      // show the prompt, then type the command out one character at a time.
      if (events.length) advance(opt.linePause);
      push(opt.color ? ESC + '[32m' + opt.prompt + ESC + '[0m' : opt.prompt);
      const command = line.slice(opt.prompt.length);
      for (const ch of command) {
        advance(opt.typeSpeed);
        push(ch);
      }
      advance(opt.typeSpeed);
      push('\r\n');
      advance(opt.linePause); // the "command runs" beat
    } else {
      // An output line: emit it whole, then a short beat before the next line.
      if (events.length) advance(opt.outputSpeed);
      push(line + '\r\n');
    }
  }

  const header = { version: 2, width: opt.width, height: opt.height };
  if (opt.title) header.title = opt.title;

  const out = [JSON.stringify(header)];
  for (const ev of events) out.push(JSON.stringify(ev));
  return out.join('\n') + '\n';
}

/**
 * Wrap cast text as a paste-ready HTML fragment: the player element plus the
 * inline cast block. This is castplay's preferred, works-from-`file://` form.
 *
 * @param {string} castText  output of transcriptToCast
 * @param {string} [id]      the element id linking the <pre> to the cast
 * @returns {string}
 */
function toInlineBlock(castText, id) {
  const ident = id || 'demo';
  return (
    '<pre class="term" data-cast="#' +
    ident +
    '"></pre>\n' +
    '<script type="text/cast" id="' +
    ident +
    '">\n' +
    castText.replace(/\n+$/, '') +
    '\n</script>\n'
  );
}

// --- CLI --------------------------------------------------------------------

const HELP = `txt-to-cast — turn a plain-text terminal transcript into an asciinema .cast

Usage:
  node tools/txt-to-cast.js [options] [input.txt]
  <something> | node tools/txt-to-cast.js [options]        # read stdin

Options:
  -o, --output <file>     write to <file> instead of stdout
      --prompt <str>      command-line prompt marker (default "$ ")
      --type-speed <ms>   per-char typing delay (default 40)
      --line-pause <ms>   pause after Enter / between commands (default 500)
      --output-speed <ms> per-line output delay (default 30)
      --title <str>       cast title
      --width <n>         header width (default 80)
      --height <n>        header height (default 24)
      --inline [id]       emit a paste-ready <pre> + inline <script> block
      --color             colour the prompt marker green
  -h, --help              show this help
`;

function parseArgs(argv) {
  const opt = { input: null, output: null, inline: false, inlineId: 'demo' };
  const numeric = {
    '--type-speed': 'typeSpeed',
    '--line-pause': 'linePause',
    '--output-speed': 'outputSpeed',
    '--width': 'width',
    '--height': 'height',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      opt.help = true;
    } else if (a === '-o' || a === '--output') {
      opt.output = argv[++i];
    } else if (a === '--prompt') {
      opt.prompt = argv[++i];
    } else if (a === '--title') {
      opt.title = argv[++i];
    } else if (a === '--color') {
      opt.color = true;
    } else if (a === '--inline') {
      opt.inline = true;
      // Optional id argument (only if the next token isn't another flag).
      if (argv[i + 1] && argv[i + 1][0] !== '-') opt.inlineId = argv[++i];
    } else if (numeric[a]) {
      opt[numeric[a]] = Number(argv[++i]);
    } else if (a[0] === '-') {
      throw new Error('unknown option: ' + a);
    } else {
      opt.input = a;
    }
  }
  return opt;
}

function main() {
  let opt;
  try {
    opt = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(e.message + '\n\n' + HELP);
    process.exit(2);
  }
  if (opt.help) {
    process.stdout.write(HELP);
    return;
  }

  let text;
  try {
    // Read the named file, or stdin (fd 0) when none is given.
    text = fs.readFileSync(opt.input || 0, 'utf8');
  } catch (e) {
    process.stderr.write('txt-to-cast: cannot read input: ' + e.message + '\n');
    process.exit(1);
  }

  let result = transcriptToCast(text, opt);
  if (opt.inline) result = toInlineBlock(result, opt.inlineId);

  if (opt.output) {
    fs.writeFileSync(opt.output, result);
    process.stderr.write('txt-to-cast: wrote ' + opt.output + '\n');
  } else {
    process.stdout.write(result);
  }
}

if (require.main === module) main();

module.exports = { transcriptToCast, toInlineBlock, DEFAULTS };
