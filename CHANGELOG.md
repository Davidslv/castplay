# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `parseCast` now skips whitespace-only lines (for example, the indentation
  before a nested `</script>`), so inline casts read from an indented
  `<script type="text/cast">` block parse reliably.

### Changed

- Development tooling only (nothing in what ships changes; the library stays
  runtime dependency-free): ESLint, Prettier, markdownlint, and yamllint, plus
  two dependency-free gates — `check-casts` (no raw ESC bytes; every example and
  inline cast parses) and `check-docs` (version consistency) — all run in CI.

## [1.0.0] - 2026-07-06

First public release. Extracted from the presentation decks on
[davidslv.uk](https://davidslv.uk) where it had been in use, then documented and
tested for standalone use.

### Added

- `castplay.js` — the whole player in one dependency-free file: parses an
  asciinema v2 `.cast`, types it into a styled element with ANSI-SGR colour,
  autoplays on scroll into view via `IntersectionObserver`, and auto-scrolls.
- Inline cast support: `data-cast="#id"` reads from an inline
  `<script type="text/cast">` block, so a page animates even from `file://`.
- URL cast support: `data-cast="path.cast"` fetches over http(s).
- Click interaction: pause / resume while playing, replay once finished.
- Public API on the `Castplay` global (and CommonJS export): `ansiToHtml`,
  `parseCast`, `Player`, `init`, an overridable `palette`, and `version`.
- Dependency-free test suite (`node:test`) covering `parseCast` and `ansiToHtml`.
- Documentation: getting-started, architecture (with design rationale and a
  "where this design strains" section), how-to recipes, and a cast-format
  reference.

[Unreleased]: https://github.com/Davidslv/castplay/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Davidslv/castplay/releases/tag/v1.0.0
