---
name: doc-graph
description: "Set up and maintain a per-package documentation graph in any repo: one CLAUDE.md per package (Purpose, Key Types, Relationships, Traffic, Invariants, Deep Docs) with a byte-identical AGENTS.md mirror, a no-toolchain gate script that checks coverage, mirror equality, git-time staleness and file:line citation drift in docs/, and a repo-customized doc-gardening skill that regenerates stale docs from source. Use `init` in a repo that has none of this (it detects the language and layout, asks what the repo's traffic vocabulary is, installs scripts/doc_check.sh, a make target, a CI job, and .claude/skills/doc-gardening/), or `check` and `garden` in a repo that already has it. Pairs with `decision-records` and `handoff`."
argument-hint: "[init|check|garden <package|all>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Task
  - Skill
---

# Doc graph

A per-package documentation graph is a `CLAUDE.md` beside every package
that has source, denser and more current than the root file about that
package, mirrored byte-for-byte to `AGENTS.md` so every agent reads the
same thing. Two mechanisms keep it true: a gate script that costs nothing
to run and says exactly which file is missing, mismatched or stale, and a
gardening skill that reads source and rewrites only what moved. Loom
runs this at `make doc-check`; this skill installs the same arrangement
elsewhere, adapted to the repo rather than copied.

The gate is `scripts/doc_check.sh` in this skill; it is POSIX `sh` and
`awk`, runs no build, and is configured by a block of variables at its
top. `init` rewrites that block. `references/checks.md` explains each
check and why its tier is what it is; read it before changing a tier.

## `init`: install the graph in a repo

Everything below is one pass. Do the detection, ask the one question,
write the files, run the gate, report.

### 1. Detect the layout

Find what a "package" is here and what makes it real:

```bash
ls; ls packages internal pkg cmd crates apps libs 2>/dev/null
find . -name go.mod -o -name Cargo.toml -o -name gleam.toml -o -name package.json -o -name pyproject.toml | grep -v node_modules | head -30
```

Map the result to the config block:

| Repo shape | `PACKAGE_DIRS` | `SOURCE_EXTS` |
|---|---|---|
| Go module with `internal/` and `cmd/` | `internal/* cmd/*` (add `pkg/*` if present) | `go` |
| Go multi-module | the directories holding a `go.mod` | `go` |
| Cargo workspace | `crates/*` | `rs` |
| Gleam / Erlang umbrella | `packages/*` | `gleam erl` |
| JS / TS monorepo | `packages/* apps/*` | `ts tsx js` |
| Python monorepo | `packages/* src/*` | `py` |

A Go module whose packages are one level deep under `internal/` is the
common case and the one Loom's `packages/*` glob does not cover; the
port supports several globs, space-separated. If a directory tree is
deeper than one level, prefer listing the parent globs over a recursive
walk: a package the gate checks is a package that gets a doc, and docs
per leaf directory in a deep tree is noise.

`CITE_EXTS` is the wider set: every file kind a doc under `docs/` may
cite by line. Include `md`, `sh`, `sql`, `toml`, `yml` alongside the
source extensions. `PRUNE_DIRS` defaults to the usual build and vendor
directories; add any repo-specific one.

### 2. Ask what traffic means here

The template's Traffic section is where a per-package doc earns its keep,
and its vocabulary is repo-specific. Loom's three kinds are actor
messages, durable-store commits and wire frames. A Go service might have
gRPC methods, database tables and channels; a Rust crate might have
traits implemented, `Send` boundaries and FFI. Ask one
`AskUserQuestion`, multi-select, seeded from what the detection found
(`grep -rl 'grpc\|chan \|sqlx\|tokio::' | head`), with an "Other" for the
rest. Two or three kinds is right; more than four means the section will
be padded.

Also confirm the doc and mirror names. `CLAUDE.md` plus `AGENTS.md` is
the default; a repo that reads only one can set `MIRROR_NAME` empty and
skip the mirror check.

### 3. Write the files

1. **`scripts/doc_check.sh`** — copy from this skill's `scripts/` and
   rewrite the configuration block's defaults with the detected values.
   Set `GARDEN_HINT` to the command that runs the installed gardening
   skill. `chmod +x`.
2. **`make doc-check`** — append `assets/Makefile-target.mk` to the
   Makefile, or the equivalent `just`/`npm script`/`cargo xtask` entry if
   the repo uses one; match what `make help` or the README says the
   house command runner is.
3. **CI** — add `assets/ci-job.yml`'s step to the workflow that runs on
   `main`. Loom keeps it in the nightly cold gate rather than the
   per-push check, because staleness is a queue, not a failure; follow
   that unless the user says otherwise.
4. **`.claude/skills/doc-gardening/`** — render `assets/doc-gardening/
   SKILL.md` and `template.md` into the repo, replacing every
   `{{PLACEHOLDER}}`. The placeholders and what fills them are listed in
   `assets/doc-gardening/PLACEHOLDERS.md`. The Traffic kinds from step 2
   become the template's Traffic bullets and the SKILL's Phase 3; a
   kind with no grep pattern is a kind the skill cannot trace, so give
   each one a command.
5. **Root `CLAUDE.md`** — add the **Per-package docs** section from
   `assets/claude-md-section.md`. Keep it to that pointer; the detail
   lives in the graph.

### 4. Run the gate and report

```bash
make doc-check; echo "exit=$?"
```

On a fresh install every real package errors as missing its doc. That is
the correct output: the list is the queue. Do not write the docs in the
same pass unless the repo is small (under five packages); for anything
larger, report the queue and let the user run `garden all` as its own
body of work, since each doc wants the source read and that is the
expensive part. Commit the install on its own under `build:` or `ci:`,
and the first docs under `docs:`.

## `check`

Run the installed gate and read it:

```bash
make doc-check; echo "exit=$?"
```

Errors are the fix-now list. Warnings split into staleness (the
gardening queue) and citation drift (a doc names a line the tree has
moved; fix the citation or the sentence). `DOC_CHECK_CITE_LIMIT=0` lists
every warning; `DOC_CHECK_CITE_WINDOW=N` widens the symbol search.

## `garden <package|all>`

Invoke the repo's installed skill (`/doc-gardening <package>`), which
carries the repo's own vocabulary. If the repo has no installed skill but
does have the gate, run `init` step 3.4 first. The phases are the same
everywhere and are in `references/gardening.md`: detect what needs
attention, read the source (never infer from a filename), trace the
traffic with concrete type names, generate or update against the
template changing only what moved, mirror with `cp`, roll up into the
architecture docs, validate with the gate.
