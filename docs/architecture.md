# Architecture

This is the document for the person about to change castplay. It explains how the pieces fit, *why* they're built this way, and — the part most projects skip — where this design would strain if pushed.

## Design goals, in priority order

1. **Zero friction for the user.** One file, no dependencies, no CDN, no build step. Dropping a `<script>` tag is the entire integration.
2. **Works from `file://`.** A slide deck should animate when opened straight off disk, with no local server. This forces inline casts to be a first-class path, not an afterthought.
3. **Small enough to read in one sitting.** The whole library is one file — around 300 lines, roughly a third of them explanatory comments, so under 200 lines of actual code. Someone evaluating it can audit it in a few minutes. That is a feature, and it caps the ambition on purpose.
4. **Bring-your-own styling.** castplay owns behaviour, not appearance. It writes text and coloured `<span>`s into an element; you own the CSS.

Everything below follows from these, especially #1 and #3.

## The pipeline

```
[data-cast] element
      │  init() → scan()            find every player on the page
      ▼
   Player                           one per element; holds playback state
      │  load()                     lazy, memoised: read the cast once
      ▼
   parseCast(text)                  NDJSON → [ [t,"o",text], … ]  (header dropped)
      │
      ▼
   _tick()  ──loops──▶  render()    append next event's text, paint, schedule next
      │                    │
      │                    ▼
      │              ansiToHtml(raw)   escape text + turn SGR codes into <span>s
      ▼
 IntersectionObserver               arm/replay on ≥55% visible, reset when gone
```

Two of these stages — `parseCast` and `ansiToHtml` — are **pure functions of a string**. That's deliberate: it's what makes the core unit-testable in Node with no DOM, and it's where all the real logic lives. The rest is DOM plumbing and a small state machine.

## Components

| Piece | Responsibility | Pure? |
|---|---|---|
| `parseCast(text)` | Split newline-delimited JSON, drop the header line, `JSON.parse` each event. | ✅ pure |
| `ansiToHtml(raw)` | HTML-escape text; convert `\x1b[…m` SGR runs into `<span style>` colour/weight. | ✅ pure |
| `palette` | SGR-code → CSS-colour map. Public and overridable, so themes need no code change. | data |
| `Player` | Per-element state machine: idle → playing ⇄ paused → finished → replay. Owns the timer and the accumulated text. | DOM |
| `Player.load` | Resolve `data-cast`: inline `#id` (via `querySelector`) or URL (via `fetch`). Lazy + memoised. | DOM |
| `scan` / `init` | Find `[data-cast]`, wire players, arm autoplay via `IntersectionObserver`. | DOM |

## Key modelling choices (and the rationale)

- **The event `[time, "o", text]`, not a cell grid.** A real terminal emulator maintains a screen buffer and interprets cursor movement, clears, and overwrites. castplay does none of that — it treats the cast as an **append-only stream of text** and relies on the styled element to wrap and scroll. This is why it's a couple hundred lines instead of thousands. The trade is real: cursor-heavy output (progress bars that redraw in place, `clear`, full-screen TUIs) won't look right (see "Where this strains").

- **Timing from consecutive timestamps.** `_tick` waits `next.time − current.time` before the next event, so playback honours the *shape* of the original recording (bursts, pauses) without storing durations. Simple, and good enough for demo-feel.

- **Inline casts are first-class.** `data-cast="#id"` reads from a `<script type="text/cast">` block via `querySelector` — no network. This is what makes goal #2 (`file://`) achievable, because browsers block `fetch()` on `file://`. The URL path exists too, but the docs steer people to inline.

- **HTML-escape first, style from a fixed palette.** Text is escaped (`& < >`), and colour comes only from the in-code `palette` map, never from the cast. So a cast is untrusted *text* that cannot inject markup or CSS. See [SECURITY.md](../SECURITY.md) for the full trust boundary.

- **`palette` is public.** The presentation decks this came from used two different colour themes. Rather than fork the file, the palette is an overridable object: `Castplay.palette[32] = '#3fb968'`. Theming needs data, not a code change.

- **ES5 style, IIFE, no modules.** `var`/`function`, wrapped in an IIFE with a UMD-ish tail that exports for CommonJS (Node/tests) and otherwise attaches `Castplay` to the global and auto-inits. This runs in every browser with no transpile and stays requireable in Node for testing — one file, two homes.

## Testing strategy

The pure core (`parseCast`, `ansiToHtml`) is covered by [`test/castplay.test.js`](../test/castplay.test.js) using Node's built-in `node:test` — **no test framework dependency**, matching the library's own zero-dependency rule. The `Player`/DOM layer is *not* unit-tested: mocking a DOM, `IntersectionObserver`, and `fetch` would pull in dependencies and test the mock more than the code. Instead, [`index.html`](../index.html) is the manual integration check — open it and watch. This is a deliberate coverage boundary, documented so it isn't mistaken for an oversight.

The one convention that silently rots — the version number — is enforced by [`scripts/check-docs.sh`](../scripts/check-docs.sh) as a CI gate, not left to discipline.

## Where this design would strain

Honest limits, so you know before you push it somewhere it doesn't fit:

- **Cursor-addressed / full-screen output.** Because castplay appends text and never interprets cursor moves or screen clears, anything that redraws in place — spinners, `top`/`htop`, `vim`, progress bars using `\r` + overwrite — will accumulate instead of updating. It's built for *linear* terminal sessions (type a command, see output, next command). Genuinely emulating a screen would mean a cell buffer and a state machine for CSI sequences — a different, much larger project.
- **Large casts on low-end devices.** Each `_tick` sets `el.innerHTML` to the full accumulated string and re-parses it through `ansiToHtml`. That's O(n) per event, O(n²) over a whole cast. Fine for the short demos this targets; a multi-thousand-event recording would get sluggish. A fix (append only the new run instead of re-rendering everything) is possible but would complicate the render path — deliberately not done until a real need appears.
- **Timing fidelity.** `setTimeout` is not precise, and long inter-event gaps play back verbatim (a 30-second pause in the recording is a 30-second pause on screen). There's no speed control, idle-capping, or seek. Adding them is feasible but trades against goal #3.
- **One global auto-init.** `init()` scans the whole document once on load and stores players on `window.__castPlayers`. Injecting `[data-cast]` elements later (SPA route changes) means calling `Castplay.init(newRoot)` yourself, and there's no teardown/observer-disconnect API. Fine for static pages and decks; a long-lived SPA would want a lifecycle it doesn't currently offer.
- **SGR subset only.** Only reset, bold, and the eight palette colours are handled. Italics, underline, 256-colour and truecolour (`38;5;n` / `38;2;r;g;b`) are ignored (text still shows, just unstyled). Widening this is easy for a code or two but starts to erode "read it in one sitting."

If a change needs to cross one of these lines, that's the moment to ask whether it belongs in castplay or in a heavier terminal-player library — the answer is often the latter, and that's the point.
