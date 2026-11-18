# Judge recipes by task type

Each recipe names the judge, the metric, where the held-out cases come from,
the guards, and the cheats to look for in the de-hack pass. The examples use
lnd and btcwallet, but the shapes carry to any repo.

## SQL translation

Moving a store from a key-value backend (bbolt via kvdb) to SQL queries
(sqlc), one store at a time.

- **Judge:** differential. Generate operation sequences (rapid, or recorded
  from a real node), apply each to the kv store and the SQL store, and
  compare everything observable after every step: return values, errors, and
  a full read-back of the store. One case is one sequence.
- **Metric:** count of equal sequences.
- **Held-out:** a different seed range, plus sequences recorded from a real
  node. Run both SQLite and Postgres; a case passes only if both match.
- **Guards:** the store's unit tests, `-race`, `sqlc generate` leaves no diff.
- **Watch for:** result order without `ORDER BY`; timestamp precision and time
  zones; NULL against empty string or empty blob; uint64 values in a signed
  BIGINT; collation; error types that differ (`ErrNotFound` against
  `sql.ErrNoRows`). Several of these are judge disagreements, not code gaps:
  decide with the user what "equal" means before the climb.

## Migrations

Moving existing data, for example channel state from bbolt to SQL.

- **Judge:** migrate a set of fixture databases, then read every record
  through the old reader and the new one and compare. Also run the migration
  twice (it must be idempotent) and kill it partway, restart, and compare
  (it must resume).
- **Metric:** count of fixture DBs that migrate equal. Once correctness is
  flat at the ceiling, switch the target to migration time or peak memory on
  the largest fixture, with correctness held.
- **Held-out:** fixtures from a different generator seed and, best, an
  anonymized real node's DB the agent never sees the contents of.
- **Guards:** the migration's tests, down migrations drop what the up
  migration created.
- **Watch for:** skipping records the reader doesn't hit; a "fix" that
  changes the old reader; batching that drops the last partial batch.

## Porting

The same behavior in a new place: another language, a new library, a new
backend.

- **Judge:** differential against the original. Same inputs to both, compare
  outputs; the original's test suite, translated once by a person and then
  frozen; spec or BIP test vectors where they exist.
- **Metric:** count of ported tests and vectors passing, then divergences
  found by a fixed-length differential fuzz run (target zero).
- **Held-out:** vectors from another implementation, fuzz seeds outside the
  loop's range.
- **Guards:** the new code builds and lints clean; the original is untouched.
- **Watch for:** porting the test to match the new code instead of the code
  to match the test. The translated tests are judge paths and are hashed.

## Performance

Making a path faster, for example pathfinding.

- **Judge:** a benchmark on real data (a mainnet graph snapshot, real payment
  amounts), `go test -bench -count=10 | hc.py from-bench`, on one quiet
  machine. One case is one benchmark.
- **Metric:** ns/op as a ratio to baseline, combined by geometric mean.
- **Guard:** output equivalence (the same routes for the same requests),
  checked as its own judge or guard, plus the package tests.
- **Held-out:** a second snapshot or a second set of requests.
- **Noise:** set it from two baseline runs; benchmarks drift with the
  machine. Re-baseline if the machine changes.
- **Watch for:** caching across iterations; moving setup outside the timer
  only for the benchmark; a faster path that returns a different answer
  (that's what the equivalence guard is for).

## Optimization (memory, bytes, size)

Allocations, bytes on the wire, DB size, startup time.

- **Judge:** an exact count where possible (allocs/op, bytes per message
  type through a counting writer, file size after a fixed workload). Exact
  counts are deterministic, so the noise floor is zero.
- **Target:** state it against the floor when one exists: the bytes that
  must cross the wire, the records that must be stored.
- **Guard:** the resulting state equals the old one (the synced graph, the
  stored records).
- **Watch for:** compression or batching that changes a wire format, which
  is a scope wall.

## Rewrites and refactors

Same behavior, new structure.

- **Judge:** behavior equivalence on recorded traffic or golden outputs,
  plus the existing tests unchanged. Mutation score (`/mutation-testing`) on
  the rewritten package is a good second judge: a rewrite that keeps the
  tests green but drops what they checked shows up as surviving mutants.
- **Metric:** count of equivalent cases; for a staged rewrite, the share of
  call sites moved to the new structure with every judge green.
- **Watch for:** deleting a test because "the new design doesn't need it".

## Conformance

Matching a spec: BOLTs, BIPs, a protocol shared with other implementations.

- **Judge:** the spec's test vectors, plus interop runs against the other
  implementations (CLN, eclair, LDK) in a fixed harness.
- **Metric:** count of vectors and interop scenarios passing.
- **Held-out:** vectors from another implementation's suite, or a spec
  section the agent's train failures don't cover.
- **Watch for:** vectors edited to match the code. When the code and a
  vector disagree, the spec text decides, and a real spec bug goes to the
  user, not into the vector file.

## Flaky tests

Making a suite reliable.

- **Judge:** `go test -count=50 -race -run <set>` per test; a case passes
  only if all 50 do.
- **Metric:** count of tests with zero failures.
- **Watch for:** longer timeouts and sleeps that hide the race. A fix
  should remove the race, not wait it out.
