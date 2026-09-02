# Per-package CLAUDE.md template

Use this when generating or updating a package's documentation file.

```markdown
# {package}

## Purpose

{1-2 sentences: what this package is, specifically enough that someone who
has never opened it knows what belongs in it and what does not.}

## Key Types

- `module.TypeName` — {one line: what it is, plus any non-obvious wiring}
- `module.fn_name` — {only when a function is the package's real entry point}

## Relationships

- **Depends on**: pkg (reason), pkg (reason)
- **Depended on by**: pkg (reason), pkg (reason)
- **Impurities**: {where this package touches the OS, the network, FFI,
  or global state; "none" is a real fact}

## Traffic

{{TRAFFIC_BULLETS}}

## Invariants

- {A rule that causes a bug when violated, in this package's own vocabulary}

## Deep Docs

- {{ARCH_LINK_EXAMPLE}}
- [README.md](README.md) — {only if the package has one}
- [Root CLAUDE.md](../../CLAUDE.md) — repo ground rules and the doc graph
```

## Guidelines

- **Purpose** — be specific. "The SQLite backend: one database file per
  session" beats "Provides storage functionality." Where a doc comment
  already says it well, borrow its words.

- **Key Types** — top 3-5. Qualify with the module or file
  (`planner.Action`, not `Action`) because the same short name recurs
  across packages. Prefer the types an agent must understand to change
  the package: opaque handles, the ADT the package exists to model, the
  record of injected effects. Skip helpers.

- **Relationships** — real package names, with the reason. Derive them
  from imports, cross-check against the manifest, and note a divergence
  rather than papering over it. Always name the impurities: they are the
  package's complete inventory of side effects, and a pure package having
  none is itself worth stating.

- **Traffic** — this section is the reason the file exists. Concrete
  type names only.
{{TRAFFIC_GUIDELINES}}
  - A package with no traffic says so in one line, and that is a real
    fact about it; do not pad.

- **Invariants** — the load-bearing ones. Mine the doc comments (they
  were written to state invariants) and any gap log the repo keeps. The
  register here is:
{{INVARIANT_REGISTER}}

  "Every transaction opens with `BEGIN IMMEDIATE`" is an invariant.
  "Uses `Result` for errors" is not.

- **Deep Docs** — link the architecture doc for the area the package
  sits in, the package README when one exists, and always the root
  `CLAUDE.md`.

- Never name an assistant, an AI, or an authoring tool in the content.
