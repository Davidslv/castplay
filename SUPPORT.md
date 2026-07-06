# Support

Thanks for using castplay. Here's where to get help and what to expect.

## Where to ask

- **A question or usage help** → open a [GitHub Discussion](https://github.com/Davidslv/castplay/discussions) if enabled, or a [question issue](https://github.com/Davidslv/castplay/issues/new/choose).
- **A bug** → open a [bug report](https://github.com/Davidslv/castplay/issues/new/choose). A minimal reproducing `.cast` + HTML snippet gets it fixed fastest.
- **A feature idea** → open a [feature request](https://github.com/Davidslv/castplay/issues/new/choose). Note that castplay optimises for _staying tiny_ — see [GOVERNANCE.md](GOVERNANCE.md).
- **A security issue** → **do not** open a public issue; follow [SECURITY.md](SECURITY.md).

## Before you open an issue

- Read the [docs](docs/) — [getting started](docs/getting-started.md), the [how-to recipes](docs/how-to.md), and the [cast-format reference](docs/cast-format.md) cover the common snags (casts that don't animate from `file://`, ANSI encoding, styling the terminal element).
- Check whether your cast parses: `node -e "console.log(require('castplay').parseCast(require('fs').readFileSync('your.cast','utf8')).length)"`.

## What to expect (honest SLA)

castplay is maintained by **one person in their spare time**. There is **no service-level agreement**. Issues and PRs are read and triaged as time allows — usually within a week, sometimes longer. Clear, reproducible reports are handled first. A quiet issue isn't ignored; it's queued.

## Scope

In scope: the castplay library, its docs, and its examples. Out of scope: writing your `.cast` recordings for you, styling your specific site, and general asciinema/terminal questions unrelated to castplay.
