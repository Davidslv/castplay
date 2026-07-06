# castplay

A tiny, self-contained [asciinema](https://asciinema.org)-cast player. **No dependencies, no CDN, no build step** — a single small JavaScript file you drop into a page.

castplay parses an asciinema v2 `.cast` (a recorded terminal session) and _types_ it into a styled element with ANSI-SGR colour, autoplaying when it scrolls into view and auto-scrolling like a real terminal. Click to pause / resume; click again once it finishes to replay. It was built to embed animated terminal demos in HTML slide decks, and works anywhere you can put a `<pre>` and a `<script>` tag.

- **Zero dependencies.** No npm install for your users, no framework, no bundler.
- **Works from `file://`.** Inline your cast and the page animates when opened straight off disk — no server needed.
- **Bring-your-own styling.** castplay only writes text and `<span>` colour runs into an element you style however you like.

```html
<pre class="term" data-cast="#demo"></pre>

<script type="text/cast" id="demo">
  {"version":2,"width":80,"height":12}
  [0.4,"o","$ echo \u001b[32mhello\u001b[0m from castplay\r\n"]
</script>

<script src="castplay.js"></script>
```

That is the whole integration. Style `.term` as a terminal, and the demo plays when it scrolls into view.

> **Live demo:** [davidslv.uk/castplay](https://davidslv.uk/castplay/) — or open [`index.html`](index.html) straight from disk, no server needed.

## Install

castplay is one file — pick whichever suits you:

**Vendor the file (recommended for a static site or slide deck).**
Download [`castplay.js`](castplay.js) into your project and add `<script src="castplay.js"></script>`.

**npm** (for bundled apps, or to pin a version):

```sh
npm install castplay
```

```js
// In Node or a bundler you can use the pure helpers directly:
const { parseCast, ansiToHtml } = require('castplay');
```

There is nothing to build and nothing to configure.

## How it works, in one breath

Every element with a `data-cast` attribute becomes a player. `data-cast` is either:

- `#some-id` — read the cast from an inline `<script type="text/cast" id="some-id">` block (**preferred**: the page is self-contained and works from `file://`), or
- `path/to/file.cast` — fetch the cast over http(s).

On load, castplay finds every `[data-cast]`, and (where `IntersectionObserver` exists) plays each one when it is ≥55% visible, resetting it when it scrolls away. See [How it works](docs/architecture.md) for the full pipeline.

## Documentation

| Doc                                          | For                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| [Getting started](docs/getting-started.md)   | Install → your first playing demo, from scratch.                                  |
| [How-to recipes](docs/how-to.md)             | Record a cast, theme the colours, drive players from your own code, common fixes. |
| [Cast format reference](docs/cast-format.md) | Exactly which slice of the asciinema v2 format castplay supports.                 |
| [Architecture](docs/architecture.md)         | The pipeline, the design rationale, and where this design strains.                |

## Compatibility

Runs in any browser with `IntersectionObserver` (all current evergreen browsers). Without it, every player simply plays immediately on load — the content still shows, it just doesn't wait to scroll into view.

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup (no build step; `npm test` plus `npm run lint` are the whole loop) and the quality gates. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

- Report a bug or request a feature → [open an issue](https://github.com/Davidslv/castplay/issues/new/choose)
- Report a vulnerability → see [SECURITY.md](SECURITY.md)
- Getting help → see [SUPPORT.md](SUPPORT.md)
- How decisions are made → see [GOVERNANCE.md](GOVERNANCE.md)

## License

[MIT](LICENSE) © 2026 David Silva
