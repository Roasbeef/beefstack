---
name: dst
description: "Builds or deepens a deterministic simulation test (DST) for a concurrent subsystem (actors, event loops, peers, storage) so that it finds real bugs and can prove it. Audits the existing harness first, applies the /depth method (raw production paths instead of mocks, real instruments, an unreasonable measured target with a guard, a judge other than the model), then builds a seeded swarm harness: production code inside a virtual-time bubble, faults only at production boundaries (ambiguous commits, asks that apply then error, byzantine replies, churn, restart), an invariant checker after every event, a heal phase that cannot mask stalls, and a double-run determinism check. Judges the harness by blind recall (revert a known fix, see whether the generic swarm finds it), mutation testing, coverage and a fresh-context review, then triages every failing seed into production bug, harness artifact or policy gap. Modeled on the neutrino header-sync DST (lightninglabs/neutrino PR 415). Use when the user wants a DST built, extended, audited or made to catch more bugs, or invoke via /dst."
argument-hint: "<package|subsystem> [--audit-only] [--target=<exec/s|coverage%|recall>] [--repo=<path>]"
allowed-tools:
  - Task
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Skill
---

# Deterministic simulation testing

A DST runs the production code of a concurrent subsystem against a simulated
world (network, storage, clock) that is driven by a seed. The same seed always
produces the same run, so any failure is a reproducible bug report. Nearly
every failure mode of a DST makes the bug invisible instead of producing a
false alarm. A harness can be slow, never reach the fault that matters, check
the wrong property, heal away the stall it caused, or encode the bug as the
expected outcome. This skill exists to stop each of those, and to measure the
harness instead of trusting it.

The method composes three things that were used on the neutrino header-sync
DST, which found a checkpoint safety bug, deadlocks, livelocks and a dozen
stalls in code that already had a DST and P models:

1. An adversarial audit of what exists, with coverage and a CPU profile, not
   a reading of the test names.
2. The `/depth` disciplines applied to the harness itself: start from the
   real production paths, use the field's instruments, set an unreasonable
   target with a guard, and let something other than the model judge.
3. A triage loop for each failing seed that refuses to patch a harness
   artifact or an unreachable path as if it were a production bug.

`references/neutrino-case.md` is the worked example: the numbers before and
after, the fault alphabet, the invariants, every bug found, the recall table,
and the mistakes made along the way. Read it before building anything.

## 1. Scope and premise

Parse `$ARGUMENTS`. Name the subsystem, its goroutines or actors, its stores,
and its peers. Record `git rev-parse --short HEAD`.

Then check the premise. Read the subsystem's entry points and list:

- every goroutine or actor that owns mutable state, and what it owns;
- every boundary where the outside world enters (network sends and receives,
  store reads and writes, timers, actor asks, lifecycle calls);
- every existing test that calls itself a DST, simulation, fuzz or model
  check.

If the subsystem has one goroutine and no I/O, a DST is the wrong tool; say
so and suggest `/property-based-testing` instead.

## 2. Audit what exists

Follow `references/audit.md`. Measure before judging:

- coverage of the production packages under the DST tests only
  (`-coverpkg`), listing the functions at 0%;
- throughput (executions per second) and a CPU profile of one run;
- the size of the input space the decoder can actually reach;
- for each model checker, whether it explores any nondeterminism at all;
- whether CI runs any of it beyond a fixed corpus.

Then read the oracle and the heal or liveness phase, looking for the four
false-pass shapes in `references/audit.md` (a property never checked, a fault
class never generated, a heal step that resets the state that would show the
bug, a test that asserts the buggy outcome). Write the audit as a ranked list
of proposals, each with its expected bug yield per unit of effort. With
`--audit-only`, stop here and present it.

## 3. Apply depth to the harness

Answer the `/depth` questions for the harness, one to three lines each, with
concrete names from this repo. Read `~/.claude/skills/depth/SKILL.md` if it is
not in context.

- **Raw material.** The production paths that matter, run for real: the
  handler functions, the actors, the timers, the validation. Replace only the
  network, the stores and the clock. A harness that drives a mock of the
  subsystem is testing the mock.
- **Instruments.** A virtual-time bubble (`testing/synctest` in Go), a seeded
  generator, coverage-guided fuzzing over the same runner, a property test at
  the state-machine level (`rapid`), a model checker that explores choices
  (P with `choose`), and mutation testing (`gremlins`).
- **Target.** State it as achievable and well past the ask. Examples from the
  worked case: throughput from 0.2 to over 1,000 executions per second; the
  generic swarm finding a majority of the recorded bugs blind; coverage of
  the subsystem's production code past 85%. Pair it with a **guard**:
  production behaviour is unchanged except for confirmed bug fixes, and every
  production seam is a no-op when unset.
- **Judge.** Blind recall (section 7), the mutation score, the coverage
  numbers, and `/advisor-review` on the harness. Not the model's opinion that
  the harness is good.

Present the audit, the depth answers and the plan with one `AskUserQuestion`:
full plan, a cheaper plan that names what it drops (for example "no P work,
no nightly job"), audit only, or adjust the target. Ask the policy questions
the plan raises in the same call (for example: should an unresponsive peer be
banned or only quarantined; should a timeout be fixed or progress-based).

## 4. Build the harness

Follow `references/harness.md`. The rules that matter most:

1. **Run production code inside the bubble, and let the runner play the event
   loop.** Do not start the subsystem's main goroutine; the runner calls its
   handler for each message, so handler state stays on one goroutine and the
   order is the seed's.
2. **Enter every fault through a production boundary.** Add unexported,
   nil-by-default hooks (a transport interface, an ask wrapper, a store
   wrapper). Never write to production state from the harness.
3. **Make the stores fast and as strict as the real ones.** In-memory stores
   that enforce the same contract (contiguous writes, rollback rules), so a
   retry that rewrites a durable row fails instead of passing. A slow real
   store is the most common reason a fuzzer cannot explore.
4. **Build fixtures once per process** (mined chains, keys, snapshots).
5. **Order same-instant messages by the seed.** The bubble makes the set of
   ready messages deterministic but not their order: sort by a stable key,
   then shuffle with the run's generator.
6. **Encode seeds for swarm testing.** A mode byte, a fault-mask, then ops.
   Each seed enables a random subset of fault classes, which finds bugs that
   need several fault types to stay away. An op whose class is disabled
   performs an honest action, so every seed keeps making progress.
7. **Run every corpus seed twice and compare a full snapshot**, including the
   final state tables, not only the events.

## 5. Faults and oracles

`references/faults-and-oracles.md` has the catalogue. The two fault classes
that found the most bugs were missing from the original harness:

- **Ambiguous commit.** The write lands (fully or in part) and the store
  returns an error. Production must reconcile from the store, not from its
  own memory of what it tried to write.
- **Ask that applies and then errors.** An actor call times out after the
  actor already changed its state. An ask timeout does not mean the actor's
  state is unchanged.

The oracle has three parts:

- **Safety invariants after every event**, each a named method: durable
  state monotonic and on the honest history, memory matches disk, single
  ownership with monotonic epochs, commit at most once, every lease backed by
  an outstanding request, and honest peers never punished.
- **Liveness after a heal phase.** The heal phase turns faults off and keeps
  time moving, but it only refills empty peer slots. It must never reconnect
  or reset a faulted peer that is still connected, because the reset is what
  production would need and not get.
- **Narrow, counted excuses** for known policy gaps, so the swarm keeps
  finding other bugs. Each excuse matches one exact state; anything outside
  it still fails. Track each gap in an issue.

## 6. Campaigns

Give the harness four entry points: the fixed corpus plus regression seeds
(double-run), a reproducible swarm campaign (`-<pkg>.seed`, `-<pkg>.swarm`)
that prints the failing seed and its run index, a replay of one seed with
production logs, and a fuzz target over the same runner. Add a nightly
workflow with a time-boxed fuzz run, a cached corpus, and several swarm
campaigns whose generator seed is derived from the run number.

Then run campaigns. Start with tens of thousands of swarm seeds on generator
seed 1, then other generator seeds and the fuzzer. Measure throughput and
coverage again and record both.

## 7. Judge the harness

`references/judges.md` has the procedures. In order:

1. **Blind recall.** For each recorded bug fix, revert only the fix in a
   scratch worktree and run the generic swarm with generator seed 1 until it
   fails or a fixed budget runs out. Record runs-to-find. Nothing in the
   harness may be specific to the bug. `scripts/recall.sh` automates this.
   A bug the swarm misses keeps its unit test, and the miss is a harness gap
   worth a sentence in the report. A harness change that stops finding a
   recorded bug is a harness regression.
2. **Mutation testing** of the state-machine packages, with `/mutation-testing`.
3. **Coverage** of the subsystem's production code under the DST.
4. **A fresh-context review** of the harness with `/advisor-review`, asking
   specifically for false passes: what can the heal phase hide, which
   invariant is never violated by any fault, which test asserts the bug.

Report the judge's raw numbers, not a paraphrase.

## 8. Triage each failing seed

For each failure, replay it with logs and classify it before touching code:

- **Production bug.** The path is reachable from real inputs and callers.
  Fix it in production with its own regression test that fails on the old
  code, add the seed to the regression corpus, and run the recall check for
  it. Prefer the fix that removes the failure mode (a single owner, an
  ordering, reconciling from the store, one helper that publishes state) over
  a branch that copes with it.
- **Harness artifact.** The fixture, the decoder or the heal phase produced a
  state production cannot reach. Fix the harness, and record which recall
  numbers the change moved. Never patch production for an artifact.
- **Policy gap.** The behaviour is a design choice (which peer to punish,
  what to trust). Add a narrow excuse, open an issue, and ask the user.

Before calling anything a production bug, chase the claim: state it in one
sentence and show the reachable path. When a selector or decoder change moves
what existing seeds decode to, re-encode the regression seeds so each keeps
its mode, and say so in the commit.

## 9. Other layers

The DST is one layer. Add the others when the audit shows they are missing
or hollow, using `references/judges.md`:

- a property test that drives the state machine directly with the same
  oracle (`rapid` state-machine actions);
- a model checker that explores real nondeterminism: concurrent peer
  machines, `choose` or `$` for events, a safety monitor and a hot liveness
  monitor. A model with no choice points is a second copy of the unit tests;
- an exhaustive table test for any decoder whose input space is small enough
  to enumerate (a fuzzer over 1,024 behaviours is wasted).

## 10. Deliver

Commit in slices: harness infrastructure, each fault class, the oracle, each
production fix with its regression test, campaigns and CI. Production fixes
go in their own commits so they can be reviewed apart from the harness.

Write or update the harness's architecture doc with `/arch-doc` conventions:
what runs for real against what is simulated, the seed format, the op table,
the run phases, the fault injection points, the invariants, and the replay
and recall workflow. List known gaps, including layers the DST does not
drive.

The PR body states the before-and-after numbers (throughput, coverage,
recall, mutation score), the recall table, every bug fixed with its replay
seed, and the known gaps. Run `/advisor-review` once before calling the work
done.

## What not to do

- Do not mock the subsystem under test. Simulate only its world.
- Do not inject a fault by writing production state. If no boundary exists,
  add a nil-by-default seam.
- Do not let the heal phase reset, reconnect or restart anything production
  would not.
- Do not widen an excuse to make a seed pass.
- Do not treat a failing seed as a production bug before replaying it and
  showing the path is reachable.
- Do not report a recall, coverage or throughput number the tools did not
  print.
- Do not add a seed-specific branch to the harness to find a known bug; that
  makes the recall check meaningless.
