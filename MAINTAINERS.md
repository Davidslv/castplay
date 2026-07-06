# Maintainers

| Maintainer  | GitHub                                   | Area                                           |
| ----------- | ---------------------------------------- | ---------------------------------------------- |
| David Silva | [@Davidslv](https://github.com/Davidslv) | Everything — library, docs, releases, security |

castplay is currently maintained by one person. See [GOVERNANCE.md](GOVERNANCE.md) for how decisions are made.

## Becoming a maintainer

There's a real path, not a closed door:

1. Contribute a few well-scoped PRs that pass the gates and land cleanly.
2. Help triage — reproduce bugs, review others' PRs, improve docs.
3. Once there's a track record of sound judgement about the project's "stay tiny" priorities, the maintainer may invite you, add you here and to [`CODEOWNERS`](.github/CODEOWNERS), and update [GOVERNANCE.md](GOVERNANCE.md) to reflect a shared model.

## Releasing (maintainer reference)

1. Move `## [Unreleased]` changes into a new `## [x.y.z] - YYYY-MM-DD` section in [`CHANGELOG.md`](CHANGELOG.md).
2. Bump the version in **all four** places the gate checks: `castplay.js`, `package.json`, `CHANGELOG.md`, `CITATION.cff`. Run `npm run gate` to confirm they agree.
3. Ensure `npm test` and the docs gate pass in CI.
4. Tag the release `vX.Y.Z` and create a GitHub release with the changelog entry.
5. If publishing to npm: `npm publish`.
