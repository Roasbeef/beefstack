## Per-package docs

Each package with source carries a `CLAUDE.md`: purpose, key types, real
dependency edges, its traffic with concrete type names, and the
invariants that break things when violated. Read the one for the package
you are about to change; it is denser and more current than this file
about that package.

`AGENTS.md` beside it is a byte-identical mirror, produced by `cp`, never
hand-edited. `make doc-check` enforces coverage and the mirror, checks
every `file.ext:NN` citation under `docs/`, and warns when a package's
source has been committed more recently than its docs. The
`/doc-gardening` skill (`.claude/skills/doc-gardening/`) is what grows
and refreshes the graph; run it for a package after changing its types,
messages, or dependencies.
