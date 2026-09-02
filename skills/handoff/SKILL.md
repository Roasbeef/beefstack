---
name: handoff
description: "Rewrite the repo's session handoff document (docs/next.md) at the end of a body of work: re-baseline every claim against the tree and CI rather than carrying it forward, name where the previous edition was wrong, record the rulings nobody should re-litigate and the gaps deliberately left open, and order what to do next with exit criteria. Also `init` to create the handoff and a starter docs/execution.md (how waves are planned, sub-agents briefed, and gates verified) in a repo that has neither. Use when finishing a milestone, a wave, or a PR series; when a fresh session cannot tell where the tree is; or when next.md and the code disagree. Pairs with `decision-records`."
argument-hint: "[rewrite|audit|init] [--base=<commit>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Task
---

# Handoff

`docs/next.md` is the file a fresh session reads first: where the tree
stands against the plan of record, what to work on next, the rulings
already made so nobody re-litigates them, what is deliberately open, and
how to verify a change. It is worth more than any status comment because
it is the one document that is *rewritten* rather than appended to, so it
never accumulates. Its only failure mode is being carried forward instead
of re-baselined, and this skill exists to prevent that.

`docs/execution.md` is the sibling: how work gets done in the repo. It
changes rarely, by addendum when a hazard costs real time. `init`
scaffolds both; `rewrite` and `audit` touch only `next.md`.

## `rewrite`: re-baseline the handoff

Run at the end of a body of work, after the last commit and before the
PR or the merge. Budget an hour; a handoff rewritten in ten minutes is a
handoff carried forward.

### 1. Pin the baseline

```bash
git rev-parse --short main
gh run list --branch main --limit 3      # is CI actually green, and for what
```

The new edition names the commit it was baselined against and the date.
Every claim below that line must be checked against that tree or that CI
run, not against memory or the previous edition.

### 2. Audit the previous edition claim by claim

Read the current `next.md` top to bottom and, for every factual sentence,
find the evidence or mark it wrong. This is the whole discipline. Use a
sub-agent per section if the file is long, briefed with the section text
and the instruction "for each claim, return the command you ran and
whether the tree agrees". Typical checks:

```bash
grep -rn 'ExtensionZone\|ExtTool' packages/*/src | wc -l   # "phase 4 is at zero"
gh issue view NN --json state,title                        # "#NN is still open"
make check; echo "exit=$?"                                  # "the gate is green"
git log --oneline <old-base>..main -- docs/adr              # rulings added since
```

Collect three lists: **still true**, **now false**, **cannot verify**.
The "now false" list becomes prose in the new edition, named as such:
"The previous edition said CI had never completed a run. That was true
when written and is false now." A handoff that silently drops a wrong
claim teaches the next reader nothing about how the tree moves.

Anything that cannot be verified is stated as unverified in the new
edition, not carried as fact.

### 3. Gather what happened since

```bash
git log --oneline <old-base>..main
gh pr list --state merged --search "merged:>YYYY-MM-DD" --limit 50
gh issue list --state closed --search "closed:>YYYY-MM-DD"
gh issue list --state open --label release-blocker
ls docs/adr protocol-change docs/design-notes docs/review   # new records
```

The handoff is deliberately not a history; the git log and PR bodies
carry how each change was reviewed. What it takes from this list is the
*state change*: a phase that closed, a ruling that was made, a gap that
opened, an issue that turned out to be wrong.

### 4. Write the new edition

Use `assets/next.md` as the skeleton. The sections and what each carries:

- **Preamble.** Two paragraphs: what this file is and when to rewrite it;
  the baseline commit and date, and the sentence that every claim was
  checked rather than carried forward.
- **Where the tree is.** One table, a row per phase or body of work in the
  plan of record, with a "where it stands" cell that is a fact, not an
  adjective. Then one subsection per row for the correction: what the
  previous edition believed, what is true now, and the evidence.
- **What to do next.** A numbered list in the order to do it. The first
  item is the body of work; the rest can be interleaved. Each item has an
  **Exit:** clause, the issue numbers in bold, and a cut list: what it
  does *not* do, so the next session does not widen it.
- **Rulings already made.** Bold-lead paragraphs, each citing where the
  ruling lives (an ADR, a protocol-change, a design note, an issue
  comment). The preamble sentence is fixed: "Each of these is settled.
  Re-open one only with new evidence, and record the reopening where the
  ruling lives." A ruling with no home is a ruling the `decision-records`
  skill should give one before it goes here.
- **Deliberately open.** Bullets, each with an issue number where one
  exists, and the sentence "None of these is unfinished work somebody
  forgot." Distinguish *undesigned* from *unbuilt*; the former is the
  load-bearing kind.
- **How to verify.** The gate commands, then the hazards that have cost
  real time in this repo, one bold sentence each. End by pointing at
  `docs/execution.md` for the rest.

Write in the repo's voice (`roasbeef-prose` sets cadence when loaded).
Facts over adjectives, issue numbers over descriptions, `file.ext:NN`
over "in the broker". Never name an assistant or an authoring tool.

### 5. Gate and commit

If the repo runs a citation checker (`make doc-check`), every
`file.ext:NN` in the new edition must resolve. Then commit the rewrite on
its own:

```
docs: rewrite the handoff from a fresh audit
```

with a body naming the baseline commit and the claims that changed.
The handoff is the last commit of a body of work, so it describes the
tree the next session will check out.

## `audit`: check without rewriting

Step 2 alone, reported and not written. Use it at the *start* of a
session when the handoff and the tree seem to disagree, or before
planning a wave from it. Output is the three lists; the decision to
rewrite is the user's.

## `init`: create the handoff in a repo that has none

1. Confirm neither `docs/next.md` nor `docs/execution.md` exists. If one
   does, edit it rather than replacing it.
2. Find the plan of record: an issue plan, a milestone doc, a roadmap, or
   the open issues with a milestone. If there is none, ask one
   `AskUserQuestion`: the handoff needs something to measure the tree
   against, and a handoff with no plan of record is a status report.
3. Write `docs/next.md` from `assets/next.md`, filling only what can be
   verified today: the baseline commit, the plan of record, and the "what
   to do next" list from the open issues. Leave "Rulings already made"
   with the fixed preamble and no entries rather than inventing rulings.
4. Write `docs/execution.md` from `assets/execution.md`. Its hazards
   section starts empty with the instruction to add one per incident;
   the wave shape, the briefing rules and the verification standard are
   general and stay. Adapt the gate commands to the repo's build
   (`make check`, `cargo test`, `go test ./...`).
5. Add the **Start here** pointer to the root `CLAUDE.md` from
   `assets/claude-md-section.md`.
6. Report what was written, and stop.
