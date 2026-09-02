# Placeholders in the doc-gardening templates

Replace every `{{NAME}}` in `SKILL.md` and `template.md` when rendering
into a repo. Nothing may be left unrendered; grep for `{{` afterwards.

| Placeholder | Fills with | Loom's value |
|---|---|---|
| `{{REPO}}` | The project name | Loom |
| `{{PACKAGE_DIRS}}` | Where packages live, in prose | `packages/<name>/` |
| `{{PACKAGE_EXAMPLES}}` | Two or three real package names | `core`, `broker`, `sandbox` |
| `{{SOURCE_LAYOUT}}` | One sentence: what a package's source looks like | Gleam ones have `src/<name>/*.gleam`; `sandbox` and `tui` are Go modules |
| `{{DETECT_MISSING}}` | Shell that lists packages with source but no doc | the two `find` loops in Loom's SKILL |
| `{{DETECT_TOUCHED}}` | Shell that lists packages touched on this branch | `git diff --name-only main...HEAD -- '*.gleam' '*.go' \| sed ... \| sort -u` |
| `{{SOURCE_INPUTS}}` | Numbered list: what to read per package (module docs, public decls, imports, impurity inventory, ...) | module `////` docs, `pub` decls, imports, `internal/ffi_*`, Go `// Package` |
| `{{SWEEP_COMMAND}}` | One command that dumps module doc + imports + public surface per file | the `awk '/^\/\/\/\//...'` sweep |
| `{{DEPENDENCY_SOURCE}}` | Where declared dependency edges live, and the DAG to cross-check | `gleam.toml` `[dependencies]`; spec §0.1 |
| `{{TRAFFIC_KINDS}}` | Phase 3 body: one bold paragraph per traffic kind with its grep and what to record | actor messages / durable-store / wire boundaries |
| `{{TRAFFIC_BULLETS}}` | The template's Traffic bullets, one per kind | `**Actor messages**`, `**Commits**`, `**Registers**`, `**Wire**` |
| `{{TRAFFIC_GUIDELINES}}` | The per-kind guidance under the template's Guidelines | the four italic sub-bullets |
| `{{INVARIANT_REGISTER}}` | The kinds of invariant this repo cares about | total-decoder boundaries, replay, CAS, purity, fail-closed |
| `{{ARCH_DOCS}}` | The as-built roll-up files and what each ends with | `docs/architecture/{...}.md`, each with a Where the code lives table |
| `{{DECISION_HOMES}}` | Where a spec interpretation or frozen-interface change goes | `docs/spec-gaps.md`, `protocol-change/NNN.md` |
| `{{ARCH_LINK_EXAMPLE}}` | One Deep Docs link line | `[docs/architecture/x.md](../../docs/architecture/x.md) — which plane` |
| `{{GATE_COMMAND}}` | The house command that runs the gate | `make doc-check` |
| `{{PRUNE_NOTE}}` | Directories to skip and why | `build/` holds vendored dependency sources |
