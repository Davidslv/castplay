<!-- Thanks for contributing to castplay! Keep it focused on one concern. -->

## What & why

<!-- What does this change, and what problem does it solve? Link any issue: "Closes #123". -->

## How I verified it

<!-- Tests added/updated? For UI/player changes, what did you check by hand in index.html and in which browser? -->

## Quality gates

- [ ] `npm test` passes locally (Node 18+).
- [ ] `npm run lint` passes (eslint, prettier, markdownlint, docs + cast gates).
- [ ] User-facing changes are noted in `CHANGELOG.md` under `## [Unreleased]`.
- [ ] This change keeps castplay's **runtime** dependency-free, CDN-free, and build-step-free (or I've opened an issue to discuss why it can't).
- [ ] Code style matches the surrounding file; non-obvious lines are commented.
