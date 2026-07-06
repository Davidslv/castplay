/*!
 * castplay.js — a tiny, self-contained asciinema-cast player.
 *
 * No dependencies, no CDN, no build step. Parses an asciinema v2 `.cast`
 * (a JSON header line followed by `[time, "o", text]` output events), types it
 * into a styled terminal element with ANSI-SGR colour, autoplays when its slide
 * scrolls into view, and auto-scrolls like a real terminal. Click to pause /
 * resume; click again once it has finished to replay.
 *
 * Drop-in usage (browser):
 *
 *     <pre class="term" data-cast="#demo"></pre>
 *     <script type="text/cast" id="demo">
 *     {"version":2,"width":80,"height":20}
 *     [0.4,"o","$ echo \u001b[32mhello\u001b[0m\r\n"]
 *     </script>
 *     <script src="castplay.js"></script>
 *
 * `data-cast` may be EITHER:
 *   - a `#id` pointing at an inline `<script type="text/cast" id="...">` block
 *     holding the raw `.cast` text (preferred — the page is then fully
 *     self-contained and animates even from `file://`, where `fetch()` is
 *     blocked), OR
 *   - a URL to a `.cast` file (fetched — needs to be served over http(s)).
 *
 * Programmatic access (browser global `Castplay`, or `require('castplay')` in
 * Node) exposes the pure helpers `ansiToHtml` and `parseCast`, the `Player`
 * class, the overridable `palette`, `init`, and `version`. The DOM auto-init
 * only runs in a browser; requiring the module in Node is side-effect free,
 * which is what makes the pure logic unit-testable.
 *
 * @license MIT
 * @see https://github.com/Davidslv/castplay
 * @see https://docs.asciinema.org/manual/asciicast/v2/  (the file format)
 */
(function (global, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api; // Node / test — no DOM side effects
  } else {
    global.Castplay = api; // browser global
    api.init(); // zero-config: scan the DOM for [data-cast]
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Default ANSI-SGR colour map: SGR code → CSS colour.
   *
   * Only the eight codes the decks actually emit are mapped; any other SGR is
   * ignored (the text still renders, just without that attribute). Override the
   * whole map — or individual entries — before the players start to re-theme:
   *
   *     Castplay.palette[32] = '#3fb968';   // a greener "success" green
   *
   * @type {Object.<number, string>}
   */
  var palette = {
    32: '#7fd1a0', // green   — success, prompts
    90: '#8b857a', // grey    — dim / secondary
    37: '#cfc7b6', // white-ish — default foreground
    92: '#8fe3a8', // bright green
    91: '#ff8a76', // red     — errors
    33: '#f4bf4f', // yellow  — warnings
    36: '#79c7d6', // cyan    — paths, links
    97: '#ffffff', // bright white — emphasis
  };

  /**
   * HTML-escape the three characters that would otherwise break out of text
   * content. Ampersand first, so we never double-escape an entity we just made.
   * @param {string} s
   * @returns {string}
   */
  function esc(s) {
    return s.replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  /**
   * Convert a string containing ANSI-SGR escape sequences (`\x1b[...m`) into
   * escaped HTML with `<span style>` colour/weight runs.
   *
   * Supported SGR codes: `0` (reset), `1` (bold), and any colour code present
   * in `palette`. Everything else is skipped. All literal text is HTML-escaped,
   * so a `.cast` cannot inject markup through its *text* — see SECURITY.md for
   * the trust boundary (a `.cast` is executable input; only load ones you trust).
   *
   * @param {string} raw  text with embedded SGR sequences
   * @returns {string}    HTML-safe string with styled spans
   */
  function ansiToHtml(raw) {
    var out = '',
      open = false,
      color = null,
      bold = false;
    // eslint-disable-next-line no-control-regex -- matching the ESC control byte is the point
    var re = /\x1b\[([0-9;]*)m/g,
      last = 0,
      m;

    function span() {
      var css = '';
      if (color) css += 'color:' + color + ';';
      if (bold) css += 'font-weight:700;';
      return css ? '<span style="' + css + '">' : '<span>';
    }
    function chunk(text) {
      if (!text) return;
      if (!open) {
        out += span();
        open = true;
      }
      out += esc(text);
    }

    while ((m = re.exec(raw))) {
      chunk(raw.slice(last, m.index));
      last = re.lastIndex;
      if (open) {
        out += '</span>';
        open = false;
      }
      // A single sequence may carry several `;`-separated codes, e.g. `\x1b[1;32m`.
      m[1].split(';').forEach(function (code) {
        code = parseInt(code || '0', 10); // an empty code means reset
        if (code === 0) {
          color = null;
          bold = false;
        } else if (code === 1) {
          bold = true;
        } else if (palette[code]) {
          color = palette[code];
        }
      });
    }
    chunk(raw.slice(last));
    if (open) out += '</span>';
    return out.replace(/\r\n/g, '\n');
  }

  /**
   * Parse raw asciinema v2 `.cast` text into its output events.
   *
   * The format is newline-delimited JSON: the first line is a header object
   * (dropped here — castplay only animates output), and each subsequent line is
   * an event array `[time, code, data]`. We keep every event as-parsed; the
   * player reads `[0]` (timestamp, seconds) and `[2]` (text) and ignores the
   * `"o"`/`"i"` code, which is fine for the output-only decks this targets.
   *
   * @param {string} text  the full `.cast` file contents
   * @returns {Array.<Array>} parsed event tuples, header excluded
   * @throws {SyntaxError} if any event line is not valid JSON
   */
  function parseCast(text) {
    return text
      .split('\n')
      .filter(function (l) {
        return l.trim() !== '';
      }) // skip blank / whitespace-only lines
      .slice(1) // (e.g. an indented </script>), drop the header
      .map(function (line) {
        return JSON.parse(line);
      });
  }

  /**
   * A single player bound to one element carrying `data-cast`.
   *
   * State machine: idle → playing ⇄ paused → finished → (replay) → playing.
   * Clicking the element pauses/resumes while playing, and replays once
   * finished. `load()` is lazy and memoised, so re-arming on scroll is cheap.
   *
   * @constructor
   * @param {Element} el  the terminal element (its text content is replaced)
   */
  function Player(el) {
    this.el = el;
    this.src = el.getAttribute('data-cast');
    this.events = null;
    this.timer = null;
    this.i = 0;
    this.raw = '';
    this.playing = false;
    this.paused = false;
    this.finished = false;

    var self = this;
    el.style.cursor = 'pointer';
    el.addEventListener('click', function () {
      if (self.finished) self.replay();
      else if (self.playing) self.pause();
      else if (self.paused) self.resume();
      else self.play();
    });
  }

  /** Load and parse the cast (once), then invoke `cb`. Errors render inline. */
  Player.prototype.load = function (cb) {
    if (this.events) return cb();
    var self = this,
      src = this.src || '';

    if (src.charAt(0) === '#') {
      // inline <script type="text/cast">
      var node = document.querySelector(src);
      if (!node) {
        this.el.textContent = '(cast not found: ' + src + ')';
        return;
      }
      try {
        this.events = parseCast(node.textContent);
        cb();
      } catch (e) {
        this.el.textContent = '(cast failed to parse)';
      }
      return;
    }

    fetch(src) // URL: needs http(s), not file://
      .then(function (r) {
        return r.text();
      })
      .then(function (txt) {
        try {
          self.events = parseCast(txt);
          cb();
        } catch (e) {
          self.el.textContent = '(cast failed to parse)';
        }
      })
      .catch(function () {
        self.el.textContent = '(cast failed to load — serve over http, or inline it)';
      });
  };

  /** Paint the accumulated text and keep the viewport pinned to the bottom. */
  Player.prototype.render = function (raw) {
    this.el.innerHTML = ansiToHtml(raw);
    this.el.scrollTop = this.el.scrollHeight;
  };

  /** Emit one event, then schedule the next after its real inter-event delay. */
  Player.prototype._tick = function () {
    var self = this,
      ev = this.events;
    if (this.i >= ev.length) {
      this.playing = false;
      this.finished = true;
      return;
    }
    this.raw += ev[this.i][2];
    this.render(this.raw);
    var cur = ev[this.i][0];
    var nxt = this.i + 1 < ev.length ? ev[this.i + 1][0] : cur;
    this.i++;
    this.timer = setTimeout(
      function () {
        self._tick();
      },
      Math.max(0, (nxt - cur) * 1000),
    );
  };

  Player.prototype.play = function () {
    var self = this;
    if (this.playing) return;
    this.load(function () {
      self.playing = true;
      self.paused = false;
      self.finished = false;
      self._tick();
    });
  };
  Player.prototype.pause = function () {
    clearTimeout(this.timer);
    this.playing = false;
    this.paused = true;
  };
  Player.prototype.resume = function () {
    if (this.playing) return;
    this.playing = true;
    this.paused = false;
    this._tick();
  };
  Player.prototype.reset = function () {
    clearTimeout(this.timer);
    this.i = 0;
    this.raw = '';
    this.playing = false;
    this.paused = false;
    this.finished = false;
    this.render('');
  };
  Player.prototype.replay = function () {
    this.reset();
    this.play();
  };

  /**
   * Find every `[data-cast]` element under `root`, wire up a Player, and arm
   * autoplay. With IntersectionObserver, a player replays when ≥55% visible and
   * resets when it scrolls away (so revisiting a slide restarts the demo);
   * without it, every player just plays immediately. Idempotent-ish: safe to
   * call once after the DOM is ready.
   *
   * @param {ParentNode} [root=document]  scope to search within
   * @returns {Player[]}  the players created (also stored on `window.__castPlayers`)
   */
  function scan(root) {
    root = root || document;
    var players = [].slice.call(root.querySelectorAll('[data-cast]')).map(function (n) {
      return new Player(n);
    });

    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            var p = e.target.__cp;
            if (!p) return;
            if (e.isIntersecting) {
              if (!p.armed) {
                p.armed = true;
                p.replay();
              }
            } else {
              p.armed = false;
              p.reset();
            }
          });
        },
        { threshold: 0.55 },
      );
      players.forEach(function (p) {
        p.el.__cp = p;
        io.observe(p.el);
      });
    } else {
      players.forEach(function (p) {
        p.play();
      });
    }

    global.__castPlayers = players;
    return players;
  }

  /**
   * Public entry point. In the browser it defers to DOMContentLoaded when the
   * document is still parsing, then scans. Called automatically by the drop-in
   * script tag; call it yourself after injecting `[data-cast]` elements later.
   * @param {ParentNode} [root]
   */
  function init(root) {
    if (typeof document === 'undefined') return; // no-op outside a browser
    if (document.readyState !== 'loading') return scan(root);
    document.addEventListener('DOMContentLoaded', function () {
      scan(root);
    });
  }

  return {
    version: '1.0.0',
    palette: palette,
    ansiToHtml: ansiToHtml,
    parseCast: parseCast,
    Player: Player,
    init: init,
  };
});
