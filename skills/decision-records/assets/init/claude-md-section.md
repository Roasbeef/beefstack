## Where decisions live

A decision is only settled once it is written where the next reader will
look for it. The homes are not interchangeable:

- **`docs/adr/NNN-*.md`** — decisions whose consequences outlive one
  change. Amended by an addendum inside the file, never by a silent edit.
- **`protocol-change/NNN.md`** — the only way to change a frozen
  interface. Never silent drift.
- **`docs/design-notes/`** — explorations and pre-code rulings, each with
  a status line that moves as the work lands.
- **`docs/review/`** — adversarial review waves, one file per reviewer
  and a triage roll-up per wave; historical records, never re-pinned.
- **The issue itself** — when measurement contradicts an issue's
  diagnosis, the correction goes on the issue as a comment.
- **The code** — a rule that can be checked belongs in a lint, a gate
  script or a test, not in prose.

`docs/next.md` is the handoff: where the tree is, what to do next, the
rulings already made, and what is deliberately open. Rewrite it when you
finish a body of work.
