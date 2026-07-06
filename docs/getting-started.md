# Getting started

This takes you from nothing to a playing terminal demo on a page. No build tools, no server, no prior castplay knowledge assumed.

## 1. Get the file

Download [`castplay.js`](../castplay.js) into your project folder. It's one file with no dependencies — that's the entire library.

(If you're in a bundled app instead of a static page, `npm install castplay` also works; see [the README](../README.md#install). This guide uses the drop-in file, which is the common case.)

## 2. Make a page

Create `demo.html` next to `castplay.js`:

```html
<!doctype html>
<meta charset="utf-8">
<title>My castplay demo</title>

<style>
  .term {
    display: block;
    background: #010409; color: #c9d1d9;
    border: 1px solid #30363d; border-radius: 8px;
    padding: 1rem; max-height: 12rem; overflow-y: auto;
    white-space: pre-wrap; word-break: break-word;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: .9rem; line-height: 1.5;
  }
</style>

<!-- 1. The player element. data-cast points at the inline cast below. -->
<pre class="term" data-cast="#hello"></pre>

<!-- 2. The cast, inline, so this page works even opened from disk. -->
<script type="text/cast" id="hello">
{"version":2,"width":80,"height":10}
[0.3,"o","$ "]
[0.9,"o","echo hello from castplay\r\n"]
[1.4,"o","hello from castplay\r\n"]
[1.8,"o","$ "]
</script>

<!-- 3. The library. Loads last; it wires everything up on its own. -->
<script src="castplay.js"></script>
```

## 3. Open it

Double-click `demo.html` to open it in a browser — **straight from disk, no server needed**. Scroll it into view and the terminal types itself out. Click it to pause; click again while paused to resume; click once finished to replay.

That's the whole thing. Three parts: a **player element** (`[data-cast]`), a **cast** (inline or a URL), and the **script**.

## 4. Add colour

Casts carry ANSI colour via escape sequences. In a `.cast`, the escape byte is written as the JSON escape `\u001b`. So a green word is `\u001b[32mword\u001b[0m`:

```html
<script type="text/cast" id="hello">
{"version":2,"width":80,"height":10}
[0.3,"o","$ "]
[0.9,"o","echo \u001b[32mhello\u001b[0m from \u001b[36mcastplay\u001b[0m\r\n"]
</script>
```

`32` is green, `36` is cyan, `0` resets. The full list of supported codes is in the [cast-format reference](cast-format.md), and [how-to](how-to.md) shows how to record real sessions and recolour them.

## What next

- **[How-to recipes](how-to.md)** — record a cast from a real terminal, fetch a cast from a URL instead of inlining it, theme the colours, run several players on one page, and fix the common snags.
- **[Cast-format reference](cast-format.md)** — exactly what castplay reads from a `.cast`.
- **[Architecture](architecture.md)** — how it works inside, and why it's built this way.

### If it didn't animate

- **Blank forever, opened from disk, using a URL cast?** Browsers block `fetch()` on `file://`. Inline the cast (as above) or serve the page over http. See [how-to → troubleshooting](how-to.md#troubleshooting).
- **Colours show as literal `[32m` text?** The escape byte is missing — write it as `\u001b` in the JSON (step 4).
- **Plays immediately instead of on scroll?** That browser lacks `IntersectionObserver`; castplay falls back to playing on load. This is expected.
