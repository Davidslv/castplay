# Contributing to castplay

Thanks for considering a contribution. castplay is deliberately small — one file, zero dependencies — and the goal is to keep it that way. This guide covers the dev loop, the quality gates a change must pass, and how to propose larger changes.

## The prime directive: stay tiny and dependency-free

The single most important property of this project is that a user drops in **one file with no dependencies, no CDN, and no build step**. A change that adds a runtime dependency, a build tool, or a required bundler will almost certainly be declined. If you think castplay genuinely needs one, open an issue to discuss it *before* writing code (see "Proposing a larger change" below).

## Dev setup

You need [Node.js](https://nodejs.org) 18 or newer. That's it — there is nothing to install, because there are no dependencies.

```sh
git clone https://github.com/Davidslv/castplay.git
cd castplay
node --test        # run the test suite
```

To see the player actually run, open `index.html` in a browser — it works straight from disk (`file://`), no server required.

## The quality gates

Every pull request must pass both gates. CI runs them on Node 18, 20, and 22; run them locally first:

```sh
npm test           # node --test — the behavioural suite
npm run gate       # scripts/check-docs.sh — version-consistency check
```

1. **Tests (`npm test`).** The suite covers the pure core — `parseCast` and `ansiToHtml`. If you change parsing or ANSI handling, add or update a test. New behaviour needs a test that fails without your change.
2. **Docs gate (`npm run gate`).** The version must agree across `castplay.js`, `package.json`, `CHANGELOG.md`, and `CITATION.cff`. If you bump one, bump them all — the gate will fail otherwise.

The `Player`/DOM layer isn't unit-tested (it would need a headless browser and that conflicts with "zero dependencies"); verify UI changes by hand in `index.html` and describe what you checked in the PR.

## Coding conventions

- **Match the existing style.** The source is ES5-flavoured (`var`, `function`, IIFE) on purpose: it runs everywhere with no transpile. Keep it that way unless a change is specifically about raising the baseline.
- **Comment the *why*.** The code already explains its intent; keep that up. A non-obvious line deserves a sentence.
- Whitespace is governed by [`.editorconfig`](.editorconfig) — 2-space indent, LF, final newline. Most editors apply it automatically.

## Commit and PR conventions

- Write commit subjects in the imperative mood ("Add replay on finished-click"), under ~72 characters, with a body explaining the reasoning when it isn't obvious.
- Keep a PR focused on one concern. If you catch yourself writing "and also…", it's probably two PRs.
- Fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) — it lists the gates above as a checklist.
- Note any user-facing change in the `## [Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md).

## Proposing a larger change

For anything beyond a bug fix or a small, obvious improvement — a new feature, an API change, anything touching the "tiny and dependency-free" promise — **open an issue first** and describe the problem you're solving. It saves you building something that doesn't fit the project's scope. See [GOVERNANCE.md](GOVERNANCE.md) for how decisions are made.

## Code of Conduct

Participation is governed by the [Contributor Covenant](CODE_OF_CONDUCT.md). By contributing you agree to uphold it.
