---
name: doc-gardening
description: >
  Maintain the per-package documentation graph (CLAUDE.md/AGENTS.md) and the
  architecture roll-up after code changes. Use when a new package was
  created, types/messages/dependencies changed significantly, after a large
  refactor, or when {{GATE_COMMAND}} fails.
argument-hint: "[package or 'all']"
allowed-tools: Read, Grep, Glob, Bash({{GATE_COMMAND}}), Bash(git diff *), Bash(git log *), Bash(find *), Bash(cp *), Bash(ls *), Bash(awk *)
---

# Doc Gardening

Maintain {{REPO}}'s per-package documentation graph after code changes.
This skill handles both **generating docs for a new package** and
**updating stale docs** for an existing one.

`$ARGUMENTS` is a package name ({{PACKAGE_EXAMPLES}}) or `all` / empty
for a whole-repo sweep. Packages live at {{PACKAGE_DIRS}}.
{{SOURCE_LAYOUT}}

Accuracy beats coverage. These files are read by humans and by agents
mid-task, so a wrong dependency edge or an invented invariant is worse
than a missing section. Read the actual source; never infer from a file
name.

## Phase 1: Detect what needs attention

**Scoped run** — read the package's sources and its existing
`CLAUDE.md`, and decide new versus stale.

**Full run** (`all` or no argument):

```bash
# Packages with source but no CLAUDE.md
{{DETECT_MISSING}}

# Packages touched on this branch
{{DETECT_TOUCHED}}
```

Classify each package:

- **New** — has source but no `CLAUDE.md`.
- **Stale** — has `CLAUDE.md`, but source has a newer last commit
  (`{{GATE_COMMAND}}` prints these as warnings; see Phase 7).
- **Scaffold** — the directory exists but holds no source. Write
  nothing, or a two-line stub explicitly marked as scaffold. Do not
  describe a package from its manifest alone.

## Phase 2: Read the package's sources

Reading source is primary. For each package gather:

{{SOURCE_INPUTS}}

A fast sweep that gets the doc comments, imports and public surface at
once:

```bash
{{SWEEP_COMMAND}}
```

Then read whole modules for anything the sweep leaves unclear.

Dependency edges come from the imports. {{DEPENDENCY_SOURCE}} Report a
divergence between declared and actual edges; do not silently "fix" it.

## Phase 3: Trace the traffic

The template's traffic section is where a per-package doc earns its
keep. {{REPO}} has these kinds, and each wants **concrete type names**,
not prose:

{{TRAFFIC_KINDS}}

Name both ends of every edge: the sender and the receiver, the writer
and the reader, by qualified type or function name. "Sends commits to
the writer" is prose; `runtime/writer.Commit(tx, reply)` sent by
`runtime/api` is a fact.

## Phase 4: Generate or update CLAUDE.md

Follow [template.md](template.md).

- **New package** — write from scratch against the template.
- **Stale package** — read the existing file, diff it against current
  source, and change only what actually moved. Do not rewrite prose that
  is still true; the file's stability is what makes its history readable.

Never name an assistant, an AI, or an authoring tool in generated
content. The file is documentation of the package, nothing else.

## Phase 5: Mirror to AGENTS.md

Every `CLAUDE.md` has a byte-identical `AGENTS.md` beside it:

```bash
cp <package>/CLAUDE.md <package>/AGENTS.md
```

Copy, never hand-edit the mirror; `{{GATE_COMMAND}}` compares them byte
for byte.

## Phase 6: Architecture roll-up

Check whether the change belongs in the as-built docs:

- {{ARCH_DOCS}} A new or renamed module belongs in the right one.
- {{DECISION_HOMES}} Never a silent edit to a per-package doc.
- Root `CLAUDE.md` keeps only the one **Per-package docs** pointer; the
  detail lives in the graph.

## Phase 7: Validate

```bash
{{GATE_COMMAND}}
```

`scripts/doc_check.sh` enforces four things:

1. **Coverage** — every package with source has a `CLAUDE.md`. Failure.
2. **Mirror** — `AGENTS.md` exists and is byte-identical. Failure.
3. **Staleness** — the last commit touching the package's source is
   newer than the last commit touching `CLAUDE.md`. **Warning, not
   failure**: source moves faster than prose by design, and the warning
   list is the queue this skill works from. Mtimes are meaningless in a
   fresh checkout, so the comparison uses `git log -1 --format=%ct`.
4. **Citations** — every `file.ext:NN` under `docs/` resolves to one
   file, is within its length, and still holds the backticked symbol
   named beside it. Decidable drift in a backticked citation outside
   the review directory fails; the rest warns.

The script runs no builds and needs no toolchain, so it stays usable
while other work is compiling.

Fix every error before finishing, and report what was created, updated,
and left warning.

## Notes

- {{PRUNE_NOTE}}
- Prefer a doc comment's own words for an invariant; they were written
  to state one.
- Invariants are things that break if violated. "Every transaction opens
  with `BEGIN IMMEDIATE`" is an invariant. "Uses `Result` for errors" is
  not.
- For CI: `{{GATE_COMMAND}}` is the check-mode gate; the staleness
  warnings are the work queue for a `/doc-gardening all` pass, which
  commits its updates under a `docs:` prefix.
