# Cast-format reference

castplay reads a subset of the [asciinema v2 asciicast format](https://docs.asciinema.org/manual/asciicast/v2/). This page is the authoritative statement of *exactly* what it supports, so you know what will and won't render.

## File shape

A `.cast` file is **newline-delimited JSON** (one JSON value per line):

```
{"version":2,"width":80,"height":24}        ← line 1: the header (a JSON object)
[0.3,"o","$ "]                              ← an event  [time, code, data]
[0.9,"o","ls\r\n"]                          ← another event
```

- **Line 1 — header.** A JSON object. asciinema puts fields like `version`, `width`, `height`, `timestamp`, `title`, and `env` here. **castplay parses this line only to discard it** — it does not use any header field (it doesn't size a grid; the styled element handles wrapping and scrolling). It must still be valid JSON.
- **Lines 2+ — events.** Each is a JSON array `[time, code, data]`.

Blank lines and a trailing newline are tolerated.

## Events

| Position | Field | Type | castplay uses it? |
|---|---|---|---|
| `[0]` | time | number (seconds since start) | ✅ — the delay before the *next* event is `next.time − this.time` |
| `[1]` | code | string (`"o"` output, `"i"` input, …) | ❌ — ignored; every event's data is appended as output |
| `[2]` | data | string (the text, possibly with ANSI) | ✅ — appended to the terminal |

Because the code field is ignored, castplay effectively treats **every event as output**. For normal recordings (which are almost entirely `"o"` events) this is exactly right. If a cast contains `"i"` (input) or other event types and you don't want them shown, strip them before loading.

## Timing

Playback waits `next.time − current.time` (in seconds) between events, so the recording's rhythm — bursts and pauses — is preserved. The final event has no successor, so it renders with no trailing delay and playback ends. Times are read verbatim: a long pause in the recording is a long pause on screen (there's no idle-capping or speed control).

## Encoding the escape byte

ANSI colour sequences begin with the ESC control byte (`U+001B`). JSON **cannot contain a raw control byte in a string**, so in a `.cast` it must be written as the JSON escape ``:

```
[0.9,"o","echo [32mhello[0m\r\n"]
        └──────┬─────┘
          = ESC, then [32m … [0m
```

If you see colour codes printed literally (`[32m`) instead of colour, the escape byte is missing — you have `[32m` where you need `[32m`.

## Supported ANSI-SGR codes

castplay handles the `\x1b[…m` (Select Graphic Rendition) sequences below. Multiple codes may be combined with `;` in one sequence, e.g. `[1;32m`.

| SGR code | Effect | Default colour |
|---|---|---|
| `0` | reset all attributes | — |
| `1` | bold | — |
| `32` | green | `#7fd1a0` |
| `90` | grey (dim) | `#8b857a` |
| `37` | off-white (default fg) | `#cfc7b6` |
| `92` | bright green | `#8fe3a8` |
| `91` | red | `#ff8a76` |
| `33` | yellow | `#f4bf4f` |
| `36` | cyan | `#79c7d6` |
| `97` | bright white | `#ffffff` |

The colours are the overridable `Castplay.palette` — see [how-to → theme every player](how-to.md#theme-every-player-at-once).

**Anything else is ignored** — the text still renders, just without that attribute. That includes italics/underline (`3`, `4`), background colours (`40`–`47`), 256-colour and truecolour (`38;5;n`, `38;2;r;g;b`), and the other foreground colours not in the table. See [architecture → where this strains](architecture.md#where-this-design-would-strain) for why the subset is intentional.

## What is NOT interpreted

castplay is not a terminal emulator. It **appends** text and does not act on:

- cursor movement (`\x1b[A`, `\x1b[H`, etc.)
- screen or line clears (`\x1b[2J`, `\x1b[K`)
- carriage-return overwrites (`\r` moves nothing; it's normalised with the following `\n`)

So progress bars, spinners, and full-screen TUIs will accumulate rather than update in place. Record **linear** sessions for castplay.
