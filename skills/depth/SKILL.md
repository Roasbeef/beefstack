---
name: depth
description: "Rewrites a task so it is done the way a field-leading professional would do it: starting from the rawest material instead of a digested summary, using the field's real instruments (profilers, byte counters, statistical models, fuzzers, model checkers, primary sources) instead of its vocabulary, aiming at an unreasonable but measurable target paired with a must-not-regress guard, reproducing the load-bearing belief from raw data before building on it, and ending at a judge other than the model. The depth axis from Felix Rieseberg's 'How to be more ambitious'. Use when the task is already the right task but must be executed very well, when there is raw data or tooling beneath the stated task, or when a result needs to hold up to an expert. Invoked via /depth or from /ambition."
argument-hint: "[<task text>|@file|#issue] [--target=<number+unit>]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Skill
  - Task
---

# Depth

Depth means a deeper version of the task, not a bigger one. The deliverable
stays the same kind of thing; what changes is the material it starts from,
the instruments used on it, the target it aims at, and who judges it.

The main failure depth fixes: asked to act like a professional, a model
switches vocabulary without switching methods. It writes "statistically
significant" over a markdown table, or "profiled" over a guess. The test for
every step below is whether the transcript would show a different tool
invocation, not different words.

Source: https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/

The output is a proposal. Nothing runs until the user picks a version.

## 1. Capture the task

Parse `$ARGUMENTS`: raw text, an `@file`, or an issue (`gh issue view <n>
--json title,body,comments`). With no arguments, take the most recent task in
the conversation. Name the field the task belongs to; there may be two (a
performance fix is also a measurement problem).

Read the code or data the task names before answering anything. If the task
asserts a fact that turns out false, report that instead of continuing. If
the task is a lookup or a mechanical edit, say depth does not apply and stop.

## 2. Answer the four questions

This is Felix's prompt, answered for this task. Look up the field in
`references/instruments.md`, then make each answer concrete against the
actual repo or data. Every answer names a specific thing (a file, a dataset,
a command, a tool) in one to three lines.

1. **What would a top professional do differently in method?** What they
   would measure, start from, or check against, keeping the deliverable the
   same. A procedure, not an attitude.
2. **What is the rawest material they would start from?** The logs instead
   of the dashboard, the byte stream instead of the bug report, the primary
   source instead of the summary, the full graph snapshot instead of the test
   fixture. Say where it lives and whether Claude can reach it. If it does not
   exist yet, say how to produce it (an instrumentation patch, a fresh run),
   mark any patch as scaffolding to remove before the judge runs, and count
   its cost.
3. **Which instruments would they use?** Name each tool and how it is
   invoked. Replace every judgment word in the task ("faster", "less",
   "robust", "clear") with the instrument that measures it and the number it
   reports. If a tool is not installed, installing it is part of the cost.
4. **What judges the result, other than Claude or the user?** A check whose
   verdict does not depend on either one's opinion: a benchmark, an exact
   count, a fuzzer, a model checker, a compiler, a held-out set, real CI, or
   a fresh-context reviewer (`/advisor-review`). A judge Claude can run
   itself for immediate feedback is best. Use `benchstat` only for noisy
   measurements; a deterministic count is judged by its exact before-and-after
   numbers. If the judge is a test Claude writes, it must be shown failing on
   the old code first, or survive `/mutation-testing`.

## 3. Apply the remaining disciplines

The four answers cover instruments and the judge. Add these three, one to
three lines each, or skip one with a stated reason.

- **An unreasonable target, stated as reasonable.** Where the result is
  measurable, set a target well past the ask: if the user wants 10s down to
  5s, ask for 200ms. Locke and Latham's goal-setting research is the basis:
  specific hard goals beat "do your best". Where the quantity has a
  computable floor (bytes that must cross the wire, work that must be done),
  state the target as a fraction of the gap to that floor instead. Phrase the
  target as achievable and tell Claude to keep going while measurable progress
  remains. Three clauses travel with it:
  - **A guard.** Name the property that must not regress (output
    equivalence, correctness tests, the resulting state) and make it part of
    the judge. Without one, the cheapest way to hit a target is to do less.
  - **A scope wall.** A change that needs a new protocol feature, public API,
    or dependency is reported with its measured payoff, not made.
  - **Honesty.** If Claude stops short, it reports the measured value and the
    constraint that binds it, never a number the judge did not print.
  An explicit `--target` overrides the chosen target.
- **Challenge the load-bearing belief.** Find the assumption the task rests
  on ("the bottleneck is X", "we fetch redundant data", "this race only
  happens on shutdown"). Make step one of the rewritten prompt reproducing
  that belief from the raw material, with a threshold that says when it has
  failed to reproduce. If it fails, that is the finding, and the plan changes.
- **Produce new knowledge.** For an investigation or a model, ask for one
  thing nobody knows yet (the earliest signal, the unlisted cause, the input
  class no test covers), validated on data it was not fit on: a held-out
  split, a second dataset, a fresh reproduction. For a fix with a
  deterministic judge, skip this and say so.

## 4. Rewrite the prompt

Write the deeper prompt. It carries the detail; the answers above stay short.
Then compare it with the original: if the deliverable changed kind (a fix
became a redesign, a post became a series), the rewrite went bigger instead
of deeper. Cut it back, and suggest `/altitude` if the bigger version is what
the user wants.

Name a skill in the prompt only if it is the instrument or the judge for this
task (for example `fuzz-test` for a parser, `go-debug` for a hang, `dataviz`
for a chart, `advisor-review` as a judge). Naming none is fine.

## 5. Present and ask

Show: what the code or data showed, the four answers, the three disciplines,
the rewritten prompt, and the cost (time, tools to install, raw material to
produce). Then one `AskUserQuestion` with these options:

- run the full version;
- run the version that drops the most expensive raw material or judge, named
  (for example "harness only, skip the live mainnet runs");
- hand back the prompt only;
- adjust the target or the judge.

On a run, execute the rewritten prompt and end with the judge's raw output in
the final report, not a paraphrase of it.

## Worked examples

**Pathfinding latency in lnd.** Task: "make pathfinding faster".

- Shallow version: read `routing/pathfind.go`, change something, say it is
  faster.
- Raw material: a mainnet graph snapshot (`lncli describegraph` from a synced
  node) and a sample of real payment destinations and amounts.
- Instruments: a Go benchmark that runs `findPath` against the snapshot,
  `go test -bench -count=10` with `benchstat` before and after, `pprof` CPU
  and allocation profiles.
- Target: p99 path-finding time down 10x on the snapshot, stated as
  achievable. Guard: identical routes chosen for the sample payments.
- Belief to reproduce: "the cost is in the heap operations". Profile first;
  if the time is in edge-policy lookups or the bandwidth hints, the plan
  changes.
- New knowledge: skipped; this is a fix with a benchmark judge.
- Judge: `benchstat` significance on the fixed snapshot, the route-equality
  guard, and the existing `routing` tests.

**Gossip bandwidth in lnd.** Task: "initial graph sync uses too much
bandwidth; reduce it".

- Raw material: the per-message-type byte stream of a fresh node's sync. It
  does not exist, so produce it: a temporary per-type counter in the peer
  read loop (scaffolding), and an in-process two-syncer harness over a graph
  loaded from a mainnet snapshot.
- Instruments: the harness's byte table by `lnwire` message type, and a
  computed floor (one channel announcement, the latest update per direction,
  and one node announcement per node).
- Target: overhead at or below 1.10x the floor. Guard: the synced graph
  equals the responder's. Scope wall: a fix that needs new query flags is
  reported with its measured savings, not implemented.
- Belief to reproduce: "the syncer fetches redundant data". If overhead is
  under 10% on master, report where the bytes go instead.
- Judge: exact byte counts before and after, the equivalence check, and the
  `discovery` tests.

## What not to do

- Do not let the professional framing become role play. "As a senior
  performance engineer" changes words; `pprof` changes results.
- Do not grow the scope. Deeper, not bigger.
- Do not set a target without a guard.
- Do not let Claude grade its own work as the final check.
- Do not report a target as met without the judge's output.
