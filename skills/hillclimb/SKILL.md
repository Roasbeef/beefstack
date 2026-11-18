---
name: hillclimb
description: "Runs a coding agent in a measured improvement loop against a judge program: make one change, run the guards and the judge, keep the change (commit) only if the score beats the best kept round by more than the noise floor without regressing the held-out cases, otherwise revert, and repeat until the score plateaus or the budget runs out. Built for long work with a mechanical yes or no: SQL translation, kv-to-SQL migrations, ports, performance work, optimizations, rewrites, and conformance against spec vectors. Covers finding or building the judge, proving it can be climbed (noise floor, a planted bug turns it red, ground truth out of the agent's reach), a hashed judge the loop cannot edit, a held-out split, one hypothesis per round, a de-hack pass on every change, stall triage, and a final report on the held-out delta. Adapted from Anthropic's eval-hillclimb guide for code instead of prompts. Use when a task has, or could have, a judge that runs unattended in minutes and prints per-case results. Invoked via /hillclimb."
argument-hint: "[<task text>|@file|#issue] [--flow=<name>] [--rounds=N]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Edit
  - Write
  - AskUserQuestion
  - Skill
  - Task
---

# Hillclimb

A hillclimb points a coding agent at a number it can compute itself and lets
it loop: change the code, run the judge, keep the change only if the number
improved, revert it otherwise. Git is the ratchet, so the score never goes
backwards, and the loop can run overnight because nobody has to say whether a
round worked.

The loop is the easy part. What decides whether a climb ships anything:

- **The judge.** It has to measure the outcome, not a proxy the agent can
  satisfy without doing the work. Most of a good hillclimb is building it.
- **The wall.** The agent must not be able to edit the judge, read its
  answers, or see the held-out cases. Instructions don't enforce this;
  file layout and hashes do.
- **One hypothesis per round.** Otherwise a gain can't be attributed and a
  loss can't be reverted cleanly.
- **The held-out delta.** The result is the held-out score at the winning
  round against the baseline. Gains on the cases the agent read are the
  process, not the result.

Source: Anthropic's eval-hillclimb guide
(`anthropics/skills`, `skills/claude-api/shared/evals/eval-hillclimb.md`, commit
`e4bb5d9`). That guide tunes a Claude app's prompts against a model-graded
eval. This one tunes code against a program, which changes three things:
most judges here are deterministic, so the noise floor is often zero or a
flake rate instead of a confidence interval; the cheat to block is the agent
editing tests, fixtures, or the oracle instead of a judge being flattered; and
every kept round is a commit a reviewer will read, so the diff has to stand on
its own.

`scripts/hc.py` holds the bookkeeping that must not depend on the agent's
judgment: the split, the judge hash, the scoring, and the keep-or-revert
verdict. `references/recipes.md` has a judge recipe per task type. Set
`HC="python3 ~/.claude/skills/hillclimb/scripts/hc.py"` in commands below.

## 0. Capture the task and find the judge

Parse `$ARGUMENTS` (text, `@file`, or `gh issue view <n> --json
title,body,comments`). Read the code it names. Then find the task type in
`references/recipes.md` and look in the repo for a judge that already exists:
a differential test, a conformance vector suite, a benchmark on real data, an
integration harness.

A judge must:

1. **Run from one command, unattended**, and print one JSON row per case
   (`hc.py from-gotest` and `from-bench` adapt Go output).
2. **Score per case**, not just in aggregate, so a round can be read case by
   case and the split works.
3. **Finish in minutes.** The number of rounds is the budget divided by the
   time per round. A 40-minute judge gets a dozen rounds a night; trim it to
   the discriminating cases for the loop and run the full set at the end.
4. **Measure the outcome.** For a migration, the migrated data read back
   equal, not "the migration ran". For a port, the same outputs as the
   original, not "it compiles".

If no judge exists, stop and say so: climbing without one is editing and
hoping. Propose building it as the first piece of work. `/dst`,
`/property-based-testing`, `/fuzz-test`, and `/mutation-testing` are the usual
tools. Building the judge is often worth more than the climb, because it
stays in the repo.

## 1. Prove the judge can be climbed

Do all of these before round one. Each has wrecked a climb.

- **Noise floor.** Run the judge twice on unchanged code (`baseline` and
  `baseline2`) and set `hc.py noise <flow> baseline baseline2`. For a count
  judge that is the flip rate; nonzero means flaky cases, and they get fixed
  or excluded before the loop (a flaky case moves the score on its own). For
  a value judge it is the median per-case log ratio; benchmarks need
  `-count=10` or more, one machine, nothing else running. Show the user the
  noise floor, the headroom (ceiling minus baseline), and the smallest gain
  they would act on. If the noise beats either, the climb can't show a win:
  say so now and offer more samples, more cases, or a finer metric.
- **The judge catches a planted bug.** Break the code in a way the judge
  should see (revert a known fix, flip a comparison, drop a column in the
  migration) and confirm the score drops. A judge that stays green on a
  planted bug is measuring something else.
- **The mechanism is real.** The benchmark exercises the production path,
  not a mock. The SQL judge runs on Postgres as well as SQLite. The
  conformance vectors are the spec's, not ones written to match the code.
- **Recompute the headline from the rows.** Check the score `hc.py compare`
  prints against a hand count of a few rows. A number too good to be true is
  a measurement bug until a hand check says otherwise.
- **Ground truth out of reach.** Expected outputs, golden files, the oracle
  implementation, and the held-out fixtures live where the agent's edits
  can't change them. List every file the judge depends on as a
  `--judge-path`; `hc.py run` refuses to run when any of them changed since
  the user ran `hc.py approve`. Never run `approve` from an unattended round.
  It is the user's to run, after reading the diff.

## 2. Agree on the goal, the scope, and the stop

Ask with one `AskUserQuestion` call, a recommended default first:

- **Target.** The metric and its direction, from what the judge records.
  Everything else the judge or guards record is held: it must not regress
  beyond noise.
- **Guards.** Commands that must exit 0 before the judge runs: the package
  tests, `-race`, the linter, `make check`. A guard failure is a reverted
  round, not a judge row.
- **Scope.** A two-column table, "will change" and "won't touch". Won't touch
  always includes the judge, the tests and fixtures it reads, and anything
  released: wire formats, applied migrations, public APIs, on-disk formats.
  A change that needs one of those is a scope wall: report it with its
  measured payoff instead of making it.
- **Stop.** Until plateau (the target fails to beat the best kept round for
  three rounds in a row; recommended), N rounds, or one at a time.
- **Who applies.** By default the agent applies and commits kept rounds on a
  branch and the user reviews in the morning. Offer per-round approval for
  consensus, key handling, or fund-moving code.

Show the plan (scope table, guards, stop, cadence, estimated time per round)
and get a yes before touching code.

## 3. Set up and take the baseline

1. Branch from the current tip (never with "claude" in the name). Work in a
   worktree if the user is also working in this checkout.
2. `$HC init <flow> --kind count|value --metric "<what>" --judge "<cmd>"
   --judge-path <file> ... --guard "<cmd>" ... --held-pct 30`. Add
   `.hillclimb/` to `.git/info/exclude`; the flow directory is local state.
   Then have the user read the judge and run `$HC approve <flow>`.
3. **The held-out split.** `hc.py` assigns each case to train or held by
   hash, so the split is fixed and needs no list. Where the task has a
   natural second corpus (a second fixture DB, a fresh fuzz seed range, a
   real node's snapshot, another implementation's vectors), use that as the
   held-out set instead and give it its own flow or case prefix. The agent
   reads failures from train only.
4. `$HC run <flow> baseline`, then `baseline2`, then `noise`. Record the
   fingerprint in `narrative.md`: commit, toolchain version, machine, and
   for perf the CPU governor and what else was running.

## 4. The loop

Each round is analyze, de-hack, apply, run, decide, record.

**Analyze.** If the next change is clear (the user named it, or the last
round points at it), write `rounds/<rid>/change.md` directly. Otherwise spawn
one fresh analyzer subagent with: the train rows of the last round's
`results.jsonl` and `scores.tsv`, the failing output for those cases (test
logs, diffs between expected and actual, a profile), the code in scope, the
off-limits list, and the target. Tell it to name the one behavior that costs
the most cases, count how many cases show it, and propose one change that
fixes it at the root. It must cite the cases it read and must not open
held-out output. The outer session reads scores, not failure output, so
nothing held-out can leak into a change.

**De-hack.** Before applying, reject any change that wins without doing the
work. The agent is under pressure to move a number and will find these:

- editing, skipping, or loosening a test, fixture, golden file, or the
  oracle (the hash catches judge files; read the diff for the rest);
- special-casing the judge's inputs: matching test names, fixture values,
  benchmark sizes, or a known seed;
- swallowing an error so a case "passes", or returning early on the path
  the judge measures;
- caching across benchmark iterations, moving work outside the timed
  region, or dropping durability (`fsync`, transactions) to go faster;
- changing behavior a guard doesn't cover: wire format, ordering, defaults.

Also cut anything that is not the change: drive-by refactors, comments
restating the code, new flags nobody asked for.

**Apply.** Edit the code, save `git diff` to `rounds/<rid>/change.patch`.

**Run.** `$HC run <flow> <rid>` in the background (`run_in_background`,
with a `timeout` that covers the judge) and stay available. It refuses if the
judge changed, then runs the guards, then the judge. Verify the row count on
disk before trusting the notification.

**Decide.** `$HC compare <flow> <rid>` scores the round against the best
kept round and prints a verdict:

- `KEEP`: train beat the best by more than noise and held-out didn't regress.
  Commit with a message that says what changed and why (no assistant
  attribution), then `$HC record <flow> <rid> --change "<one line>" --kept
  --commit <sha>`.
- `REVERT`: restore the tree to the last kept commit (`git restore
  --staged --worktree .`, and delete any files the round added; the patch
  is saved), then `record --reverted`. A train gain with a held-out loss is overfitting; try a
  different angle, not a smaller version of the same one.
- `NOISE`: held-out up, train flat. Rerun once; keep only if it repeats.

Cases are scored over the baseline's case set, so a deleted test or a renamed
benchmark counts as a failure, not a smaller denominator.

**Record.** `$HC status <flow>` prints the round table and writes
`scores.tsv`. Rewrite `narrative.md` with the table on top and one paragraph
on what is winning and why. Log a `/session-log progress` entry every few
rounds, so a compaction can pick the loop back up from disk. Report one line
in chat per round: `r04 kept, held 0.81 -> 0.86: decode NULL timestamps as
zero time`.

**Spend a round only on a change the judge can see.** A change whose best
case sits inside the noise floor is kept or reverted by chance. On a
deterministic count judge any fixed case is visible; on a benchmark the gain
has to clear the noise.

## 5. When it stalls, triage before grinding

Two or three rounds without a keep means the remaining failures may not be
code gaps. Spawn an analyzer to bucket every remaining train failure:

| Bucket | Tell | Do instead |
|---|---|---|
| Code gap | The code doesn't handle the case yet | Keep looping |
| Judge disagreement | The output is right but the oracle says no: SQLite and Postgres legitimately differ, the reference has a bug, the vector is stale | Bring it to the user. Fixing the judge is their call, then `approve` and re-baseline |
| Harness or flake | Timeouts, ports in use, ordering in a map, wall clock | Fix the harness or exclude the case, then re-baseline |
| Structural | Every fix needs the same thing behind the scope wall: a schema change, a new index, an API change | Report it with its measured payoff; stop the climb or move the wall with the user |
| Variance | Identical code flips as much as the rounds move | At the noise floor. Report best so far, offer more samples |

When triage shows many small independent gaps, each worth a case or two, one
breadth round that fixes them all at once covers more than ten serial rounds.
It breaks one-hypothesis-per-round on purpose; say so in `change.md`.

When the target plateaus, offer to switch to a held metric with headroom
(allocations after latency, migration time after correctness) under the
constraint of not regressing what's won. Ask first.

## 6. Report

Leave the branch at the best kept round. Then report:

- **Headline:** held-out score, baseline to winner, and the noise floor. If
  the delta is inside the noise, say so and recommend not merging.
- **The round table** from `hc.py status`, train and held side by side. If
  they diverge round over round, say so.
- **The kept commits**, each with its one-line why, tagged **[FIX]** (a
  correctness gap closed) or **[TUNE]** (a measured gain the reviewer could
  decline).
- **What was tried and reverted**, and the scope walls hit, with payoffs.
- **What to try next.**

Then run `/advisor-review` on the branch diff: the loop optimized for the
judge, and a fresh reader checks for what the judge can't see. Keep the judge
in the repo; it is half the value, because the next climb starts from it.
Pushing and opening a PR wait for the user.

## Under /auto

A climb is the natural shape of an `/auto` goal stated as a number, and
`/auto`'s rule that a change cannot modify the check that judges it is this
skill's judge wall. When the two run together:

- Step 2's questions are asked once, at `/auto`'s section 1, the one point
  where questions are cheap. If the user is gone, take the recommended
  defaults (until plateau, agent applies) and record them as provisional
  decisions.
- `hc.py approve` is the user's. The one exception: when the session built
  the judge itself in step 0, it may approve that judge once, before the
  baseline, after the planted-bug check passes. Record it as a provisional
  decision and list the judge files in the final report. After the baseline,
  a judge change stops the loop as usual.
- The loop's stop rule is `/auto`'s exit criterion. A judge change, a guard
  that needs editing, or a scope wall is a blocker on the climb: record it,
  and continue with steps that don't depend on it.
- Kept rounds are local commits, which `/auto` allows. Pushing waits for the
  user.

## What not to do

- Don't climb without a judge, or on one that stayed green on a planted bug.
- Don't let the agent read held-out failures or reach expected outputs.
- Don't run `hc.py approve` yourself after the baseline.
- Don't bundle unrelated changes in one round, outside a declared breadth
  round.
- Don't keep a change you can't explain. If the score moved and no case's
  behavior did, it is noise or a harness artifact.
- Don't report a number `hc.py` didn't print.
