# The four checks and their tiers

`scripts/doc_check.sh` runs four checks. Each tier was chosen by a
census that was zero, decidable and argued; change a tier only with the
same evidence.

## 1. Coverage (error)

Every directory matching `PACKAGE_DIRS` that holds a file with one of
`SOURCE_EXTS`, outside `PRUNE_DIRS`, must have `DOC_NAME`. A directory
with no such file prints `skip` and is a scaffold: writing a doc for it
from its manifest alone is the failure mode this exists to prevent.

## 2. Mirror (error)

`MIRROR_NAME` must exist beside `DOC_NAME` and be byte-identical
(`cmp -s`). The mirror exists so that tools reading `AGENTS.md` and tools
reading `CLAUDE.md` see one file; the byte check exists because a
hand-edited mirror drifts in the first week. Produce it with `cp`. Set
`MIRROR_NAME` empty to disable in a repo that reads only one name.

## 3. Staleness (warning)

The last commit touching the package's source (`<dir>/src` if it exists,
else `<dir>`) is later than the last commit touching `DOC_NAME`. It is a
warning by design: source moves faster than prose, and the warning list
is the queue the gardening skill works from. It uses `git log -1
--format=%ct` rather than mtimes because git does not restore mtimes on
checkout, so a fresh CI clone would report everything stale. A package
whose doc is untracked, or a tree with no history, skips the check.

## 4. Citations (error, with three exemptions)

Every `path.ext:NN` or `path.ext:NN-MM` in `DOCS_DIR/**/*.md` whose
extension is in `CITE_EXTS` is checked:

- **Resolution.** The path is suffix-matched against the tracked tree
  (dot-dirs and `PRUNE_DIRS` excluded, so a vendored copy cannot make a
  bare name ambiguous). No match or several matches is a finding.
- **Range.** The last cited line must exist in the file.
- **Symbol drift.** The backticked span nearest before the citation, or
  the parenthesised one after it (`` `pool.go:554` (`take_limit`) ``),
  yields identifiers; keywords in `KEYWORDS`, tokens under three
  characters, and module qualifiers are dropped. One of them must appear
  within `DOC_CHECK_CITE_WINDOW` lines (default 5) of the cited span. If
  the symbol is elsewhere in the file, the finding names the line to
  cite instead.

A finding is an error only when all three hold: the doc is not under
`REVIEW_PREFIX`; the citation is backticked; and the finding is
decidable. Review files are records of what a reviewer saw at a commit
and would be falsified by re-pinning. Bare prose includes rhetorical
examples (`auth.go:42` illustrating ghost state) that are not claims
about the tree. And "the symbol is nowhere in this file" is the one
shape a mis-attributed span and a genuinely deleted symbol share, so it
warns; a drifted line number cannot hide there, because a symbol still
in the file is always decidable.

The census lines at the end say how much of the corpus the strong check
covers (`symbol-checked` versus `resolution-only`), and why each warning
is not an error. `DOC_CHECK_CITE_LIMIT=0` prints every warning.

## Exit code

`1` on any error, `0` otherwise regardless of warnings. Capture it
directly (`make doc-check; echo "exit=$?"`), never via a pipe to `tail`.
