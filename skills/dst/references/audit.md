# Auditing an existing DST

The audit decides what to build. It is report-only: nothing in the repo is
edited. Every claim in it comes from a command whose output is kept (a
coverage profile, a CPU profile, a grep), not from test names or comments.

## Measurements

Run these first and keep the artifacts in the scratchpad.

```sh
# Coverage of production code under the DST tests only. List the production
# packages explicitly; the default only covers the test's own package.
go test . -run 'DST|Transport|Sim' -count=1 \
  -coverpkg=./,./<pkg1>/...,./<pkg2>/... -coverprofile=dst.cov
go tool cover -func=dst.cov | sort -k3 -n | head -60

# Throughput and where one run spends its time.
go test . -run '^TestXDST$' -count=1 -cpuprofile=cpu.prof -v 2>&1 | tail
go tool pprof -top -cum cpu.prof | head -30

# Fuzz throughput, as the fuzzer reports it.
go test . -run '^$' -fuzz '^FuzzXDST$' -fuzztime=30s 2>&1 | tail -3
```

Record, for the report:

- executions per second, and the share of CPU spent in setup (store creation,
  mmap, fixtures) versus the run itself;
- coverage of each production file, and the functions at or near 0% grouped
  by path (discovery, reorg, the filter path, RTT handling, shutdown);
- the number of distinct behaviours the decoder can produce (flag bits times
  value ranges). If it is small, an exhaustive table beats a fuzzer;
- whether each model-checker file contains `choose`, `$`, `spec`, `hot` or
  `cold` monitors, and `send` between machines. If none, the model explores
  one timeline and its schedule count is meaningless;
- what CI runs: the fixed corpus only, or fuzzing, swarm and model checking.

## The four false-pass shapes

Read the oracle, the fault generator and the heal or liveness phase, looking
for each shape.

1. **A property never checked.** List the properties a reviewer would expect
   (durable state monotonic, memory matches disk, honest peers never
   punished, no leaked timers or requests, quiescence at the end, staged
   content matches the honest history). Mark each one checked or not.
2. **A fault class never generated.** List the failure modes of each boundary
   (section "Fault classes" in `faults-and-oracles.md`) and mark which ones
   the op alphabet can produce. In the worked case, the ambiguous commit and
   the ask that applies then errors were both absent, and both turned out to
   hide live bugs.
3. **A heal step that hides the bug.** If the heal phase reconnects faulted
   peers, restarts components or resets state, it runs the recovery path that
   production would need and may never get. A stall that depends on the peer
   staying connected becomes invisible.
4. **A test that asserts the bug.** Search the tests near each recent fix for
   assertions that encode a stall or a punishment as the expected outcome
   (for example "the timer is disarmed after an empty reply"). These look
   like coverage and block the fix.

Also check determinism handling: map iteration in selection loops (each
comparator must end in a strict total order), which same-instant messages the
seed can reorder, and whether the double-run compares the final state tables
or only the event log.

## Likely live bugs

For each fault class that no op generates, read the production code at that
boundary and write down what would happen. A plausible bug found this way is
a hypothesis, labelled unverified, with the probe that would confirm it. The
probe becomes the first test of the new fault class.

## Output

A ranked list of proposals, each with:

- the gap it closes (one of the measurements or false-pass shapes above);
- the change to the harness, in a few lines;
- the bug classes it should expose, and any likely live bug it would confirm;
- its cost.

Rank by expected bug yield per unit of effort. In the worked case the top
three were storage-ambiguity and ask faults, byzantine replies with stronger
per-event invariants, and making fuzzing fast enough to matter.
