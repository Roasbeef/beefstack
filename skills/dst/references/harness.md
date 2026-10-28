# Building the harness

This file is Go-specific where it has to be (`testing/synctest`,
`pgregory.net/rapid`), and the structure carries to any language with a
virtual clock or a deterministic scheduler.

## Shape

```
synctest bubble
  runner goroutine  (plays the subsystem's event loop)
    -> production handler for each message
    -> invariant checker after each message
  production actors, timers, validation      (real)
  drain goroutines for notification channels (harness)
outside the bubble
  fixtures built once per process (sync.Once)
  seed decoder, generator
```

Write down a table of what runs for real and what is simulated, per
component. It goes in the architecture doc later and keeps the harness
honest: any row where the subsystem itself is simulated is a mock, not a DST.

## The runner plays the event loop

Most subsystems have one goroutine that receives messages and calls
handlers (`blockHandler` in the worked case). Do not start it. The runner:

1. calls the production constructor, but not `Start`;
2. delivers each scripted event (peer connect, reply, disconnect) by calling
   the same handler the loop would call;
3. drains the channel that production timers post to, and handles those
   messages too;
4. after each message, waits for the bubble to settle (`synctest.Wait`),
   applies any side effects production requested (disconnects), and runs the
   invariant checker.

All handler state then stays on one goroutine, as in production, and the
seed controls the interleaving.

## Seams

A seam is an unexported field or hook that production leaves nil. A nil hook
means the production call happens directly, so production behaviour is
unchanged. Typical seams:

| Boundary | Seam | What the harness does |
| --- | --- | --- |
| Outbound network | an interface for sends (`headerTransport.SendGetHeaders`) | records the request and returns; can block a peer's sends |
| Inbound network | the production queue entry point (`QueueHeaders`) | encodes and decodes a wire message, then queues it |
| Store | the store interface | an in-memory store wrapped by a fault layer |
| Actor asks | a wrapper around each ask (`headerSyncAsk`, `RuntimeConfig.AskFault`) | one-shot fail-before or fail-after |
| Lifecycle | constructor, `Stop`, new-peer and done-peer handlers | restart over the same stores, shutdown, churn |
| Peer quality | RTT updates | varies RTT so ranking and timeouts are exercised |

Every seam is checked by a test that runs with it unset.

## Stores

Write in-memory stores that implement the full production contract,
including the strict parts: contiguous writes only, rollback below the tip,
the error a duplicate write returns. A lenient fake lets a retry that
rewrites a durable height pass silently, which is exactly the bug the
ambiguous-commit fault exists to find.

Wrap the store in a fault layer with modes (see `faults-and-oracles.md`) and
a write log: the height (or key) of every record that became durable. The
invariant checker reads the log.

Do not run the real database under the DST. It costs orders of magnitude in
throughput. Cover the real stores' rollback and ambiguous-commit behaviour in
their own tests against the same contract, and say so in the doc.

## Fixtures

Build every chain, key and snapshot once per process behind `sync.Once`:
the honest history, a heavier reorg branch, and one faulty variant per start
height and fault kind (a valid fork, a bad timestamp, a bad difficulty).
Panic if two fixture records collide (same hash), because a collision makes a
faulty reply look honest.

## Ordering

Inside the bubble, `synctest.Wait` makes the set of ready messages
deterministic but not their arrival order. After each wait, drain all ready
messages, sort them by a stable key (request ID, peer address, message type),
then shuffle with the run's generator. The seed now chooses the interleaving,
and the double-run detects any order the harness failed to control.

## Seed format

```
byte 0       mode        (byte % N selects a mode; reserve a nibble pattern
                          for a mode added later, so old seeds keep theirs)
bytes 1..2   fault mask  (one bit per fault class, little-endian uint16)
bytes 3..    ops         (truncated to a step limit, e.g. 32)
op = value % 16, arg = value / 16; slot = arg % nslots, sub = arg / nslots
```

- The order seed is a hash of the op bytes, and it seeds the run's PCG.
- A seed shorter than the header runs with every fault class on.
- An op whose class is masked off performs an honest action.
- Modes are configurations of production, not different harnesses:
  checkpoint-backed, discovery under each confirmation policy, the serial or
  fallback path, each network type that changes the code path.

The swarm generator derives each seed from a PCG seeded by a flag:
`seed := make([]byte, 3+rng.IntN(maxSteps))`, random bytes. On failure, print
the seed in hex and the run index, then stop.

When a new mode selector changes what existing seeds decode to, re-encode
byte 0 of each regression seed so it keeps its mode, and run the corpus.

## Run phases

1. **Setup.** Fresh stores, production constructor, peers connected. Some
   modes pre-plan work before peers connect.
2. **Scripted.** One op per step, pump, handle, check. Restart rebuilds the
   component over the same stores and keeps the checker's view of the
   durable state. Shutdown stops it, sleeps past every timer, and checks that
   nothing fired and nothing is armed.
3. **Heal.** Faults off; refill only empty slots; honest replies each round;
   sleep longer while idle, and past the cooldown after several idle rounds.
   Bounded rounds.
4. **Tip phase**, when the reorg class is on: extend the history, then
   announce a heavier branch, so the extension, rollback and notification
   paths run.
5. **Settle.** Quiescence check (see `faults-and-oracles.md`).
6. **Snapshot.** Events, steps, durable writes, bans, timeouts,
   notifications, and the final range and peer tables, compared across two
   runs.

## Entry points

```sh
go test . -run '^TestXDST$'                                 # corpus, twice each
go test . -run '^TestXDSTSwarm$' -x.swarm=50000 -x.seed=7   # campaign
go test . -run '^TestXDSTReplay$' -x.replay=<hex> -x.log    # one seed, logs
go test . -run '^$' -fuzz '^FuzzXDST$' -fuzztime=10m        # coverage-guided
```

The fuzz body runs every input once, and a deterministic sample (keyed by a
hash of the input) twice, so saved inputs replay identically.

Nightly: fuzz with a cached corpus, plus several swarm campaigns with
generator seed `run_number * 16 + n`, so each night explores new seeds and a
failure is reproducible from the run number.
