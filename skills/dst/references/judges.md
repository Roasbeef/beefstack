# Judging the harness

A harness is judged by what it finds when nobody tells it where to look.
Each judge below prints a number; the report quotes that number.

## Blind recall

The question: if one of the bugs we already fixed came back, would the
generic swarm catch it?

1. List every recorded fix: the commit, a one-line description, and the
   regression test that came with it.
2. For each fix, in a scratch worktree at the branch tip, revert only the fix
   (`git revert --no-commit <sha>`, or a hand edit when the revert conflicts;
   keep the edit in a file so it can be re-applied). Leave the harness as it
   is. A fix commit that also changed the harness must be split: revert the
   production half only.
3. Run the generic campaign with a fixed generator seed (`-x.seed=1`) and no
   bug-specific flags, until the first failure or a fixed budget (600 s in
   the worked case). Record runs-to-find and the first failure message.
   Runs-to-find is the stable measure; wall time depends on the machine's
   load.
4. Record misses honestly. A miss keeps its unit or FSM-level regression
   test, and the report says why the swarm cannot reach it (the path is
   outside the harness, or it needs a state the generator rarely produces).

`scripts/recall.sh` runs steps 2 and 3 for a list of commits.

Do not use the regression corpus for recall: it contains the bug's own seed.
Do not add a mode, op or excuse aimed at one bug to improve its recall.

Track recall across harness changes. A change that stops finding a recorded
bug, or makes runs-to-find jump by an order of magnitude, is a harness
regression and needs a reason.

The worked case scored 3 of 7 applicable bugs on the first pass. After the
heal change and the serial mode it found the no-progress stall in 1,227
runs, the cooldown stall in 6,040 runs, and the checkpoint safety bug in 91
runs, once the next-checkpoint invariant existed.

## Mutation testing

Run `/mutation-testing` (gremlins) on the state-machine packages, with the
DST and the property test in the test set. The surviving mutants show which
decisions no oracle checks. Record the score per file before and after the
work. The worked case reached 72.6% on the headersync package.

## Coverage

Re-run the audit's coverage command and compare per file. Name the paths
still at 0% in the report, since they bound what the DST can claim. A target
like 85% of the subsystem's production code is reasonable to state and
honest to miss; say which path holds the number down.

## Fresh-context review

Run `/advisor-review` on the harness and the fixes, with these questions in
the prompt:

- What can the heal phase hide? Which recovery does it perform that
  production would not?
- Which invariant is never violated by any fault the generator produces?
- Which existing test asserts a stall or a punishment as expected behaviour?
- Do any seams change production behaviour when unset?
- Do the production fixes introduce new deadlocks between event loops?

The first review of the worked case found that the heal phase masked a stall
and that a test encoded the stall as expected. The second found an orphaned
range released in the wrong owner and a decoder change that silently
remapped six regression seeds.

## Property test at the state-machine level

Drive the state machine directly with `rapid` state-machine actions: peers
join, leave and change state; work is planned, assigned, started, stolen,
completed (validly, invalidly, with a stale epoch), committed, requeued and
invalidated. After every action, check the same ownership, epoch, ordering
and counter invariants as the DST. This runs orders of magnitude faster than
the DST and reaches FSM states the transport rarely does.

## Model checking

A model is only useful if it explores choices. Give it concurrent peer
machines that send bounded valid, invalid and stale replies, an explorer that
picks scheduler and peer events with `choose`, a safety monitor (monotonic
tip, single ownership, ordered commits) and a hot liveness monitor that is
hot from the start of exploration until sync completes. The first run of the
reworked model in the worked case found drift between the model and the Go
code in work stealing.

Run the checker in the nightly workflow with a fixed schedule count, and
report how many distinct timelines it explored. One timeline means the model
has no real choice points.

## Throughput

Report executions per second for the fuzzer and runs per second for the
swarm, before and after, with the worker count. The worked case went from
0.19 to about 2,800 executions per second across 16 workers, almost all of
it from replacing the real store with a strict in-memory one and building
fixtures once.
