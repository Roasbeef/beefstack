# Instruments by field

For each field: the shallow move a model makes by default, the instrument a
field-leading professional uses instead, the raw material they start from,
and an outside judge. Use these as starting points, then make them concrete
against the actual repo or data.

## Go performance

- Shallow: read the code, reason about complexity, claim a speedup.
- Instruments: `go test -bench -benchmem -count=10` plus `benchstat`; `pprof`
  CPU, allocation, block, and mutex profiles; `go tool trace` for scheduler
  and GC behavior; escape analysis with `-gcflags=-m`.
- Raw material: production-shaped inputs (a mainnet graph snapshot, a real
  channel database, captured peer traffic), not toy fixtures.
- Judge: `benchstat` with a significance test on fixed inputs; a regression
  benchmark checked into the repo.

## Network and wire bandwidth

- Shallow: reason about message sizes, or reach for `pprof` (which measures
  CPU, not bytes).
- Instruments: per-message-type byte counters at the transport (encrypted
  transports such as brontide rule out passive capture, so count after
  decryption); an in-process two-node harness that serializes real messages;
  a computed floor (the minimal message set that produces the end state);
  interop runs against other implementations, since the responder often
  decides most of the bytes.
- Raw material: the per-type byte log of a real run.
- Judge: exact byte counts before and after, plus an equivalence check on the
  resulting state.

## Concurrency and races

- Shallow: add a mutex where the bug report points.
- Instruments: `-race` under stress (`-count=1000`, `-cpu=1,4,16`), goroutine
  dumps, `go-debug` and Delve for live inspection, a lock-ordering audit, a
  model of the state machine (TLA+ or a `rapid` state-machine test).
- Raw material: the goroutine dump from the hang, the CI log of the failure,
  the interleaving that reproduces it.
- Judge: a test that reproduces the race on the old code and passes on the
  new code under the stress settings.

## Protocol and state machines

- Shallow: read the spec, compare it with the code by eye.
- Instruments: a TLA+ or Alloy model with invariants checked by TLC; a
  `rapid` state-machine test that drives random message sequences; test
  vectors shared with other implementations; differential testing against a
  second implementation (eclair, CLN, LDK).
- Raw material: the spec text, the message traces from a failing interop
  run, the state transitions as coded.
- Judge: the model checker, the shared vectors, an interop run.

## Security

- Shallow: list the vulnerabilities that sound plausible.
- Instruments: native Go fuzzing with a seed corpus from real inputs;
  `variant-analysis` after the first finding; a proof-of-concept exploit on
  regtest; resource accounting under adversarial load.
- Raw material: the wire parsers, the peer message handlers, the resource
  limits as coded, real malformed inputs from the network.
- Judge: a working PoC or a crashing fuzz input; after the fix, the same
  input fails to reproduce.

## Testing

- Shallow: add example-based tests for the happy path and report coverage.
- Instruments: `property-based-testing` with `rapid`, `mutation-testing`
  with gremlins, branch coverage for the changed lines, fuzzing for parsers.
- Raw material: the invariants the code is meant to hold, the bugs that
  escaped before.
- Judge: mutation score on the changed code; a test shown failing on a
  reverted fix.

## Debugging

- Shallow: guess a cause from the error text and patch it.
- Instruments: a minimal reproduction first; `git bisect` for regressions;
  Delve breakpoints; structured log correlation across nodes by timestamp
  and channel point.
- Raw material: the full logs from every node involved, not the excerpt in
  the issue.
- Judge: the reproduction fails before the fix and passes after, repeated.

## Claims about users, nodes, or the network

- Shallow: a markdown table of averages and a confident sentence.
- Instruments: load the raw data into a database (SQLite or DuckDB), query
  it, fit a model (regression, survival analysis for churn or channel
  lifetime), report confidence intervals, check for confounders.
- Raw material: event-level logs or the raw graph and channel history, not a
  pre-aggregated dashboard.
- Judge: the model predicts a held-out period or a second dataset it was not
  fit on.

## Database and migrations

- Shallow: write the migration, run it on an empty database.
- Instruments: run the migration on a copy of a large real database, time
  it, verify row counts and checksums before and after, test interrupt and
  resume, compare query plans with `EXPLAIN`.
- Raw material: a production-sized database (bbolt and postgres/sqlite
  backends for lnd).
- Judge: a before-and-after integrity check and a timing bound.

## Writing and documentation

- Shallow: produce fluent paragraphs from a summary.
- Instruments: primary sources, a reverse outline, a line edit that cuts
  length, one diagram for the main mechanism, the `technical-writing` and
  `roasbeef-prose` skills.
- Raw material: the spec, the code, the PR thread, measured numbers.
- Judge: a fresh-context reader who restates the thesis and claims without
  seeing the outline; a reader who tries the documented steps and reports
  where they failed.

## Frontend and UI

- Shallow: build the screen and describe it as polished.
- Instruments: screenshots at several widths, `agent-browser` to click
  through the flows, Lighthouse for performance and accessibility, a contrast
  checker, the `design-iterator` agent for screenshot-driven passes.
- Raw material: the real data the UI will show, including empty, huge, and
  error cases.
- Judge: automated accessibility checks and a task completed end to end in a
  real browser.

## Operations and incidents

- Shallow: restart the thing and write "resolved".
- Instruments: a timeline built from logs and metrics, a five-whys that ends
  at a design cause, a check that would have fired before the incident.
- Raw material: the full logs and metrics across the incident window.
- Judge: the new alert or test fires when the incident is replayed.

## Research and literature

- Shallow: summarize what the model remembers.
- Instruments: the papers themselves, their citations forward and backward,
  the datasets or code they released, a reproduction of the key result.
- Raw material: the primary papers and their artifacts.
- Judge: the reproduced number matches the paper's, or the discrepancy is
  explained.
