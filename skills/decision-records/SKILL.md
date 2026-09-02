---
name: decision-records
description: "Where a decision goes and how it is written down so the next reader finds it: architecture decision records (ADRs, amended by addendum and never by silent edit), protocol-change proposals for frozen interfaces, design notes with a status lifecycle, adversarial review waves with a triage roll-up, and corrections filed on the issue rather than only in a commit. Use when a decision was just made and needs a home, when an existing ruling needs revisiting, when a review wave is being filed, or with `init` to scaffold the whole decision layout in a repo that has none. Pairs with `handoff` (the next.md rewrite) and `doc-graph` (per-package docs)."
argument-hint: "[adr|protocol-change|design-note|review|correction|init] [<topic or issue>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
---

# Decision records

A decision is only settled once it is written where the next reader will
look for it. This skill carries the layout distilled from the Loom
repository, where five homes exist and are not interchangeable, and the
writing forms that make each one useful a month later. It is not a
documentation system; it is the answer to "I just decided something, where
does it go, and what does it have to say."

Templates live in `assets/` and the worked conventions in `references/`.
Load a reference only for the record kind being written.

## 1. Route the decision

Decide the home before writing a word. Ask what the decision touches and
how long it outlives the change that prompted it:

| The decision... | Home | Form |
|---|---|---|
| Has consequences that outlive one change: a storage binding, a wire format, a pooling granularity, a security boundary | `docs/adr/NNN-<slug>.md` | `references/adr.md` |
| Changes an interface the repo has declared frozen (a spec Part 1 type, a wire frame, a public protocol) | `protocol-change/NNN-<slug>.md` | `references/protocol-change.md` |
| Is an exploration, a ruling made before code, or a plan that may become a work package | `docs/design-notes/<slug>.md` | `references/design-note.md` |
| Came out of an adversarial review of a surface at a commit | `docs/review/<wave>-<surface>.md` and one `<wave>-triage.md` | `references/review-wave.md` |
| Contradicts an issue's own diagnosis, or closes an issue with a ruling | A comment **on the issue**, then the commit | `references/corrections.md` |
| Can be checked by a machine | A lint rule, a gate script, or a test, not prose | see `doc-graph` |
| Is about what to do next, or a ruling nobody should re-litigate | `docs/next.md` | the `handoff` skill |

Two rules cut across every row:

- **A gate beats prose.** If the rule can be checked, check it. Prose that
  a gate could enforce will drift; a gate will not. Write the record for
  the *why*, and put the *what* in `make lint`, `make doc-check` or a
  test.
- **Never silent drift.** An ADR is amended by an addendum inside it. A
  frozen interface moves only through a numbered proposal. A design note
  changes status by editing its status line, not by being deleted. The
  git log is a history of edits; these files are a history of decisions,
  and a reader must be able to tell which decision was in force when.

If the routing is genuinely ambiguous (an ADR-sized ruling that also
changes a frozen interface, say), write both and cross-link: the
protocol-change carries the mechanics, the ADR carries the argument.

## 2. Number and name

ADRs and protocol-changes are numbered in one monotonic sequence each,
zero-padded to three digits. Find the next number with:

```bash
ls docs/adr protocol-change 2>/dev/null | grep -o '^[0-9]\{3\}' | sort -n | tail -1
```

The slug is the ruling as a phrase, not the topic: `005-budget-pooling-
granularity`, `006-exec-exit-cancelled`, `007-extension-tiers-and-brokered-
egress`. A reader scanning the directory should see the decisions, not the
subjects. Design notes and review files are unnumbered and named for the
surface.

## 3. Write it

Copy the template from `assets/` and follow its reference. Every form
shares four habits, and a record missing any of them is unfinished:

1. **State the question with evidence.** A measured count, a `file:line`,
   a failing interleaving. "In 3 of 3 measured runs the cancelled
   execution reported `code=0`" beats "cancellation was not observable."
2. **Rule in one bold sentence.** The reader who only skims must still
   leave with the decision. Protocol-changes open their Decision section
   with **Accepted.**; ADR addenda bold the new reading.
3. **Name the rejected alternative and why.** A decision with no named
   alternative reads as an assertion and gets re-litigated. One sentence
   suffices: "inferring cancellation broker-side from ordering was
   considered and dismissed because ...".
4. **Say what it costs.** Blast radius by file or package, an operational
   consequence (rebuild the helper binary, regenerate a file), or the
   constraint it places on future work.

Metadata goes on one line under the title, dot-separated in bold:
`**Status**: accepted · **Date**: YYYY-MM-DD · **Supersedes**: nothing ·
**Relates to**: issue #NN`. No YAML frontmatter; these are read by people
and by `grep`.

Write in the repo's voice. When the `roasbeef-prose` skill is loaded it
sets cadence; `technical-writing` shapes clarity underneath. Never name an
assistant, an AI, or an authoring tool in a record.

## 4. Amend, do not edit

When a settled decision meets a case it did not name, or the build departed
from it:

- **ADR** — append `## Addendum — <what the case is> (issue #NN)` with an
  italic first line dating it and saying whether the decision above is
  unchanged. Rule on the new case in bold. If the original guessed wrong
  somewhere, say so in the addendum *and* drop a one-line forward pointer
  at the place in the main body that was wrong: `*(The build departs
  from this; the addendum says why.)*` Never rewrite the original ruling.
- **Protocol-change** — a PROPOSED entry becomes ACCEPTED by editing its
  status line and adding the Decision section. An accepted one is never
  reopened; a further change is a new number that names the one it
  supersedes.
- **Design note** — change the status line as the note moves through its
  lifecycle (`note, not a work package` → `ruling, pre-code` → `built
  through phase N` → `built`). Promote to a work package or an ADR when
  the code lands; the note keeps carrying the argument and the vocabulary.
- **Issue** — when measurement contradicts the diagnosis, the correction
  goes on the issue as a comment. The next reader finds the filing before
  the commit.

Reopening a ruling recorded in `docs/next.md` requires new evidence, and
the reopening is recorded where the ruling lives.

## 5. Link it into the graph

A record nobody can find was not written. After saving:

- Cite it from `docs/next.md`'s **Rulings already made** if the decision
  is one a future session might re-litigate.
- Cite it from the per-package doc (`CLAUDE.md`) of every package whose
  invariants it changes.
- Cite it from the issue that raised it, and close the issue with a
  comment saying what was decided and why.
- If the repo runs a citation checker (`doc-graph`'s `doc_check.sh`),
  every `file.ext:NN` in the record must resolve; run the gate before
  committing.

Commit the record on its own under a `docs:` prefix with a message about
the why.

## `init`: scaffold the layout in a new repo

`/decision-records init` sets up the five homes in a repo that has none.
Do this once, and adapt the vocabulary to the repo rather than copying
Loom's:

1. Inspect what exists: `ls docs docs/adr docs/design-notes docs/review
   protocol-change 2>/dev/null`. Reuse any directory already present; do
   not create a parallel one.
2. Ask one `AskUserQuestion` for the two things the repo must decide and
   the skill cannot: whether the project has a **frozen interface layer**
   that warrants `protocol-change/` at all (most libraries do not; wire
   protocols and specs with numbered parts do), and what the **plan of
   record** is (an issue plan, a milestone doc, a roadmap) so the
   templates can point at it.
3. Create the directories chosen, each with a `README.md` from
   `assets/init/` that states in three sentences what belongs there, the
   numbering rule, and the amend-not-edit rule. A directory with no README
   is a directory that fills with the wrong things.
4. Add a **Where decisions live** section to the repo's root `CLAUDE.md`
   from `assets/init/claude-md-section.md`, listing only the homes that
   were created. Keep it to one bullet per home; the detail is in the
   directory READMEs.
5. If the repo has no `docs/next.md`, hand off to the `handoff` skill's
   own `init`; do not scaffold it here.
6. Report what was created and what was reused, and stop. Do not write a
   first ADR unless there is a decision to record.
