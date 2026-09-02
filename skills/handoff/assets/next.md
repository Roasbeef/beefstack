# Next

**Read this first.** This is the handoff between sessions: where the tree
stands against the plan of record, what to work on next, the rulings
already made so nobody re-litigates them, what is deliberately left open,
and how to verify a change. Rewrite it when you finish a body of work.

It is deliberately not a history; the git log and the PR bodies carry how
each change was reviewed. Re-baselined YYYY-MM-DD against `main` at
`abc1234`, with every claim below checked against the tree or against a
CI run rather than carried forward, and the places where the previous
edition was wrong named as such.

---

## Where the tree is

The plan of record is `<docs/issue-plan.md | milestone | roadmap>`.

| Phase | Body of work | Where it stands |
|---|---|---|
| 1 | <name>, #N–#M | <a fact: "code done and CI green; #N still open"> |

### Phase 1: <what changed since the previous edition>

<What the previous edition believed, what is true now, and the evidence.>

## What to do next

In this order. The first item is a body of work; the rest are smaller and
can be interleaved by whoever is not on it.

### 1. <The body of work>

<What it is and why it is first.> **#NN**, **#MM**.

Exit: <the observable condition that closes it>.

Note what this does *not* do: <the cut list>.

### 2. <Next item>

Exit: <...>.

## Rulings already made

Each of these is settled. Re-open one only with new evidence, and record
the reopening where the ruling lives.

- **<The ruling as a sentence>** (`docs/adr/NNN-*.md`).

## Deliberately open

Named, with an issue where one exists. None of these is unfinished work
somebody forgot.

- **<The gap>** (#NN). <Undesigned or unbuilt, and which matters.>

## How to verify

`make check` is the full gate and is exactly what CI runs. <Other gates.>

Hazards, each of which has cost real time here:

- **Verify a gate by its own exit code.** Capture the status of the
  command you care about, not of the `tail` after it.

`docs/execution.md` is the rest: how a wave is planned, how sub-agents
are briefed and monitored, the standard of proof, and why a correction
goes on the issue rather than only in a commit.
