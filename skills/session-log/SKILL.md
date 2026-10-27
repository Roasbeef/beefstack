---
name: session-log
description: "Durable on-disk memory for agent work in a repo, kept in an untracked .notes/ directory at the top of the working tree: an execution plan per body of work (goal, exit criteria, steps with done-when checks, cut list, decisions), an append-only dated notebook of progress, discoveries, blockers, and decisions, a repo-specific execution.md of gates and hazards, and a next.md handoff rewritten at the end of each body of work. Run with no arguments to orient (always the first action after a context compaction or in a fresh session that continues earlier work), `plan` to start or update a plan, `progress|discovery|blocker|decision` to record as work happens, `hazard` when something cost real time, and `handoff` to close out. Modeled on the next.md, notebook.md, and execution.md layout in roasbeef/loom."
argument-hint: "[orient | plan \"<goal>\" | progress|discovery|blocker \"<text>\" | decision \"<choice>\" --rationale=\"<why>\" | hazard \"<text>\" | handoff]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
---

# Session log

Context compacts, sessions end, and worktrees get picked up days later. What
survives is what was written to disk where the next session will look. This
skill keeps that record in `.notes/` at the top of the working tree, out of
git, in four files that each change in one way:

| File | Holds | Changes by |
|------|-------|------------|
| `plans/<slug>.md` | One body of work: goal, exit criteria, steps, cut list, decisions | Edited in place; it is current state |
| `notebook.md` | Dated entries: progress, discoveries, blockers, decisions | Append only, newest entry first |
| `execution.md` | How work gets done in this repo: gates, hazards that cost time | Addendum only |
| `next.md` | The handoff: where the tree is, what to do next, rulings, what is open | Rewritten at the end of a body of work |

The plan says where the work is going, the notebook says what happened, the
execution file says how not to repeat a mistake, and the handoff says where
the next session should start. Keep each fact in one of them.

`scripts/notes.sh` holds the mechanical parts. `notes.sh init` creates the
directory and adds `.notes/` to the repository's `info/exclude`, which every
worktree shares, so no tracked file changes. `notes.sh status` prints the
summary the SessionStart hook shows. Orient first, then run `init` before
the first write in a tree.

```bash
NOTES=$(~/.claude/skills/session-log/scripts/notes.sh init)
```

## Orient (no arguments)

The first action after a compaction, and when a fresh session continues
earlier work.

1. Run `notes.sh status`. If it reports nothing and there is no `.notes/`,
   say there is no record for this tree and suggest `plan`. If it reports
   legacy `.sessions/` files, import them (below) before anything else.
2. Read `next.md` if it exists, every plan with `status: active`, and the
   newest two notebook entries. Read the headings of `execution.md`, and the
   whole of any hazard that touches the next step.
3. Check the record against the tree: current branch and `HEAD` against the
   plan's `branch` and `baseline`, uncommitted changes, and the most recent
   commits since the baseline. A step marked done whose commit is missing,
   or work committed but not ticked, is reported, not silently fixed.
4. Report in at most ten lines: the plan, the next unchecked step, open
   blockers, and any mismatch from step 3. Then continue the work. Do not
   re-derive anything the record already settles.

### Importing a legacy `.sessions/` record

Read `.sessions/active/*.md` and everything under `.sessions/journal/`; the
journal's `progress.md` is often newer than the active file. Treat the
record as a previous edition and sort each claim against the tree: still
true, now false, or cannot verify.

- Steps still open go into a plan named for the work, not the old
  shortname. If none are open, or the old goal was open-ended, build the
  plan from what the tree shows remains.
- Gotchas that cost time become hazards in `execution.md`.
- Today's notebook entry records the now-false claims, so the next reader
  learns how the tree moved.
- Leave `.sessions/` in place. If `git ls-files .sessions` is non-empty,
  say so: removing tracked files is a commit, and that is the user's call.

## `plan "<goal>"`

Start a body of work, or revise the active one.

- If an active plan already covers this goal, edit it in place and bump
  `updated`. If a different plan is active, ask whether the new goal
  replaces it, runs beside it, or waits.
- Otherwise copy `assets/plan.md` to `plans/<slug>.md`, with a short
  kebab-case slug named for the work. Fill the baseline from `git rev-parse
  --short HEAD` and today's date.
- Every exit criterion and every step's done-when clause is a check a fresh
  session can run. "Tests pass" is not a check; `go test ./htlcswitch/...
  exits 0` is.
- The cut list is the highest-value section. Write down what the plan does
  not do.
- If `/ideate` or plan mode already produced a plan, transcribe it here
  instead of planning twice. Before transcribing steps from a design doc or
  spec, read any later decisions that amend it (merge notes, review
  rulings, addenda); the doc is often the stale one.

Revise the plan when the work changes direction: rewrite the steps, and
record why in a `decision` entry. The plan is current state, so it never
carries struck-out history; the notebook does.

## `progress`, `discovery`, `blocker`, `decision`

Record as work happens. The notebook has one heading per day and topic,
newest heading first; bullets under a heading go in the order they happened.
Append under today's heading for the topic, creating it if missing:

```markdown
## 2026-10-27 — <plan slug or topic>

- **Progress.** Step 2 done: the batch path dedupes node announcements
  across batches; `go test ./discovery/...` exits 0 at a1b2c3d.
- **Discovery.** `FetchChanAnns` resets `nodePubsSent` per call
  (`discovery/chan_series.go:280`), so hubs repeat in every batch.
- **Blocker.** Needs a mainnet graph snapshot; asked the user.
- **Decision.** Count bytes after decryption, not with tcpdump. Why: brontide
  traffic is encrypted, so passive capture sees nothing.
```

The kinds, and what each also touches:

- **progress**: a step finished or a milestone passed. Tick the plan's step
  only when its done-when check passed, and cite the evidence (command and
  exit code, commit SHA).
- **discovery**: a fact about the code or system that the next session
  would otherwise have to find again. Cite `file:line`.
- **blocker**: what stops progress and who or what can clear it. Add it to
  the plan's open questions, which is where the status summary reads
  blockers from. When it clears, remove it there and record a progress
  entry that says so.
- **decision**: a choice with its rationale (`--rationale`, or ask for it).
  Add one line to the plan's decisions. If it outlives the plan, it also
  goes in the handoff's rulings, citing this notebook entry as its home. If
  the repo keeps committed decision records (`docs/adr/` or similar), offer
  the `decision-records` skill instead.

Write an entry when something would be lost if the context compacted now: a
step done, a finding that changed the plan, a decision, a blocker. Not every
command. Keep each entry to one to three sentences of facts: commands,
`file:line`, SHAs, numbers. Never rewrite an earlier entry; correct it with a
new one that says what was wrong.

## `hazard "<text>"`

Something cost real time and would again. On first use, create
`execution.md` from `~/.claude/skills/handoff/assets/execution.md`: keep its
hazards section, add a Gates section with the repo's real commands (`make
check`, `go test ./...`, `make lint`), and drop the wave, briefing, and
advisor sections unless the work here uses sub-agents. Then append to the
hazards: one bold sentence stating the rule, what it cost and when, and what
to do instead. A hazard is added only after it has bitten, never
speculatively. Fix a wrong fact in a hazard in place the same day; change a
rule only by addendum.

## `handoff`

Close out a body of work, or pause it so someone else can pick it up. This
replaces checkpointing, pausing, and closing.

1. Bring the plan current: tick only what is verified.
2. Rewrite `next.md` by following the `rewrite` procedure in
   `~/.claude/skills/handoff/SKILL.md`. That procedure assumes committed
   `docs/`, a `main` branch, and CI; these differences override it:
   - The file is `.notes/next.md`, from the skeleton
     `~/.claude/skills/handoff/assets/next.md`. Its first line is
     `Baseline: <short sha> on <branch> (<YYYY-MM-DD>)`, which the status
     summary prints.
   - The baseline is `HEAD` of the current branch, not `main`. Check CI
     only if the branch has runs; otherwise write "CI not checked".
   - The previous edition is the old `next.md`, moved first to
     `archive/next-<YYYY-MM-DD>-before-<slug>.md`. With none, audit the
     newest notebook entries, or an imported legacy record, in its place.
   - The plan of record is the active plans, their open questions, and any
     open sections in the repo's own docs, not the GitHub issue list
     (in a fork, those issues belong to upstream).
   - Point the skeleton's gate and hazard lines at `.notes/execution.md`.
   - Skip the gate-and-commit step entirely; `.notes/` is untracked.
   - For a pause rather than a close, "Where the tree is" and "What to do
     next" are enough; the full audit is for the end of a body of work.
3. After writing, record one progress entry naming the new baseline and
   what is open; the audit usually surfaces facts the earlier entries lack.
4. Set each plan's status: `done` when every exit criterion passed (then
   move it to `archive/`), or leave it `active` with the baseline updated to
   the current `HEAD` when work remains.
5. Report the baseline line, the first item of "What to do next", and the
   "Deliberately open" bullets.

## Rules

- **Check before writing it down.** A step is ticked, a discovery recorded,
  or a handoff claim made only against evidence from this tree. Anything
  unverified is written as unverified.
- **One home per fact.** Current state goes in the plan, chronology in the
  notebook, lessons in `execution.md`, the starting point in `next.md`.
- **Never commit `.notes/`.** It is local by design. If the user wants a
  record shared, that is the `handoff` skill writing `docs/next.md` in a repo
  that already keeps one.
- **Never name an assistant or an authoring tool** in the notes; they read
  like an engineer's notebook.
