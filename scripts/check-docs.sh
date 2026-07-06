#!/bin/sh
# check-docs.sh — the documentation gate.
#
# #117's hardest-won lesson: "consistency across files is the real work" and
# "verify claims against the code, not against memory". This script encodes the
# one claim that silently drifts — the version number — as a build gate rather
# than a sentence a human forgets. It asserts that the version agrees across
# every file that states it: the library source, package.json, the CHANGELOG's
# top released entry, and CITATION.cff.
#
# Run locally with `npm run gate`; CI runs it on every push and PR.
# Exits non-zero (failing the build) on any mismatch or missing value.

set -eu
cd "$(dirname "$0")/.."

fail() { printf 'check-docs: FAIL — %s\n' "$1" >&2; exit 1; }

# --- Extract the version each file claims -------------------------------------

# package.json:  "version": "1.0.0"
pkg=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([0-9][^"]*\)".*/\1/p' package.json | head -1)

# castplay.js:   version: '1.0.0'
src=$(sed -n "s/.*version:[[:space:]]*'\([0-9][^']*\)'.*/\1/p" castplay.js | head -1)

# CHANGELOG.md:  first "## [x.y.z]" heading that is not Unreleased
log=$(sed -n 's/^##[[:space:]]*\[\([0-9][^]]*\)\].*/\1/p' CHANGELOG.md | head -1)

# CITATION.cff:  version: 1.0.0
cff=$(sed -n 's/^version:[[:space:]]*\([0-9].*\)$/\1/p' CITATION.cff | head -1)

# --- Assert all present and equal ---------------------------------------------

[ -n "$pkg" ] || fail "no version found in package.json"
[ -n "$src" ] || fail "no version found in castplay.js"
[ -n "$log" ] || fail "no released version heading found in CHANGELOG.md"
[ -n "$cff" ] || fail "no version found in CITATION.cff"

for v in "$src" "$log" "$cff"; do
  [ "$v" = "$pkg" ] || fail "version drift: package.json=$pkg src=$src changelog=$log citation=$cff"
done

printf 'check-docs: OK — version %s consistent across package.json, castplay.js, CHANGELOG.md, CITATION.cff\n' "$pkg"
