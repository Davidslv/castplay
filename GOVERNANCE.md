# Governance

castplay uses a **single-maintainer (BDFL) model**, stated honestly rather than dressed up as a committee.

## Who decides

[David Silva (@Davidslv)](https://github.com/Davidslv) is the maintainer and has final say on what ships. See [MAINTAINERS.md](MAINTAINERS.md).

## How decisions are made

1. **Anyone can propose.** Open an issue for a bug, feature, or change. For anything larger than a small fix, propose it as an issue _before_ writing code.
2. **Discussion is public.** Trade-offs are weighed in the open on the issue or PR.
3. **The maintainer decides**, guided by one overriding principle:

   > **castplay stays tiny and dependency-free.** One file, no runtime dependencies, no CDN, no required build step. A change that erodes that bar starts from behind, however useful — it needs to justify the cost.

   Beyond that, decisions favour: clarity over cleverness, the drop-in use case over niche configurability, and documentation that lets a stranger self-serve.

## Scope

castplay is a _display component_ for asciinema casts. Recording tooling, a general terminal emulator, or a plugin system are out of scope by design — the point is that it's small enough to read in one sitting.

## How this model can evolve

If the project grows enough to need more hands, additional maintainers may be added (see the path in [MAINTAINERS.md](MAINTAINERS.md)) and this document updated to describe whatever shared model replaces the solo one. Until then, one maintainer, looking to grow, is the honest description.
