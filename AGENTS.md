# AGENTS.md

Instructions for an AI agent (or any automated contributor) working in this repository. This is the agent equivalent of [CONTRIBUTING.md](CONTRIBUTING.md) — read that too for the human-facing detail.

## What this project is

castplay is a single-file, zero-dependency, no-build asciinema-cast player. The whole library is [`castplay.js`](castplay.js). If you're tempted to add a dependency, a bundler, a transpile step, or a second source file, **stop** — that almost certainly violates the project's defining constraint. Discuss it in an issue first.

## The gates that must stay green

Before proposing any change, run both and make them pass:

```sh
npm test        # node --test — behavioural suite for parseCast + ansiToHtml
npm run gate    # scripts/check-docs.sh — version consistency
```

CI (`.github/workflows/ci.yml`) runs the tests on Node 18, 20, and 22, and runs the gate. A change that reddens either gate is not ready.

## Test discipline

- The pure core (`parseCast`, `ansiToHtml`) is unit-tested in [`test/castplay.test.js`](test/castplay.test.js). **Any change to parsing or ANSI handling needs a test** that fails without your change and passes with it.
- The `Player`/DOM layer is intentionally not unit-tested (mocking the DOM would add dependencies). Verify UI/player changes by hand in [`index.html`](index.html) and state, in the PR, what you checked and in which browser.
- Write the escape byte in casts and docs as the JSON escape ``, never as a raw control character. `parseCast` relies on valid JSON; a raw control byte breaks it. The repo is kept free of raw ESC bytes — don't introduce one.

## Version-bump rule (enforced)

The version appears in **four** files and the gate fails if they disagree: `castplay.js` (the `version:` field), `package.json`, `CHANGELOG.md` (top released heading), and `CITATION.cff`. If you bump one, bump all four and run `npm run gate`.

## Conventions

- **Style:** ES5-flavoured (`var`, `function`, IIFE), no modules, so it runs everywhere untranspiled. Match the surrounding code; don't "modernise" it without a reason tied to a goal.
- **Comments:** explain the *why*. Keep the existing comment density.
- **Whitespace:** governed by [`.editorconfig`](.editorconfig) — 2-space indent, LF, final newline.
- **Commits:** imperative subject under ~72 chars; body explains non-obvious reasoning.
- **PRs:** one concern each; fill in [the PR template](.github/PULL_REQUEST_TEMPLATE.md); note user-facing changes under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md).

## Where the docs live

- User docs: [`docs/`](docs/) — getting-started, how-to, cast-format, architecture.
- The design rationale and the known limits are in [`docs/architecture.md`](docs/architecture.md); read its "where this design strains" section before proposing anything ambitious — the answer to many feature requests is "that belongs in a heavier terminal library, not here."
- Trust boundary and threat model: [`SECURITY.md`](SECURITY.md).
- How decisions are made: [`GOVERNANCE.md`](GOVERNANCE.md).

## The one principle that overrides the rest

**castplay stays tiny and dependency-free.** When a change trades that away for a feature, the default answer is no. Optimise for the drop-in user and for a library small enough to read in one sitting.
