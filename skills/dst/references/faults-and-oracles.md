# Faults and oracles

## Fault classes

Each class gets one bit in the seed's fault mask. Every fault enters through
a production boundary.

| Class | Boundary | Variants | Bugs it exposes |
| --- | --- | --- | --- |
| store | store write | down (nothing written, error); ack lost (all written, error); torn (prefix written, error) | retries that rewrite durable rows, memory that drifts from disk, stalls after a failed commit, wrong next-checkpoint after a reset |
| ask | actor ask | fail before apply; fail after apply, at each call site | caller state that assumes "timeout means unchanged", orphaned leases, reused IDs, ranges staged without payload |
| byzantine | inbound reply | corrupt, partial, empty, overlong, reordered, fork, stale timestamp, wrong difficulty, gapped, unsolicited | validation gaps, bans of the wrong peer, checkpoint safety, a liar blocking a height |
| duplicate | inbound reply | re-deliver the last reply | double commits, lost requests, wrong timer disarm |
| stall | inbound timing | one peer replies, others stall past the timeout | steal and failover, timeout punishment of honest peers |
| churn | lifecycle | disconnect a peer; connect a new one | orphaned work, idle new peers, done-peer resets |
| block | outbound send | toggle a peer's sends | requests that never leave, leases with no request |
| restart | lifecycle | rebuild over the same stores | recovery from durable state, not from scratch |
| shutdown | lifecycle | stop at an arbitrary step | timers firing after stop, asks that hold up shutdown, leaked goroutines |
| rtt | peer quality | vary RTT | ranking, RTT-scaled timeouts |
| reorg | history | extend the tip, then a heavier branch | rollback, notifications, tip publication order |

The two classes that found the most in the worked case were the ambiguous
store write and the ask that applies then errors. Add them first if absent.

Ask faults are one-shot and armed for a specific call site. The fail-after
variant applies the request in the actor and then returns the deadline
error to the caller, which is the case production must handle.

## Safety invariants

Run after every handled message, every op, and at each phase boundary. Skip
once the component is stopped. One named method per property, so a failure
names what broke.

| Invariant | Asserts |
| --- | --- |
| durable history | The durable tip never decreases except through a documented rollback. Every durable record is on the honest history (or the reorg branch after a reorg). The write log has no gaps, and no height is written twice unless a rollback removed it. |
| memory matches disk | The in-memory tip and caches agree with each other and with the history. They trail the store only while a retry is armed to reconcile them. Derived pointers (the next checkpoint) are consistent with the visible tip. |
| ownership | Each unit of work has one owner; lease epochs never decrease; owned or active work belongs to a live peer; committed work ends at or below the durable tip. |
| commit once | No unit of work is committed twice. |
| leases | A peer holding a lease has a request outstanding, and active work owned by a ready peer has a tracked request. |
| honest immunity | A peer that never misbehaved or stalled is never quarantined, banned or disconnected, and no peer is IP-banned for being unresponsive. |

## Liveness

After heal (and the tip phase), check quiescence: the durable tip reached
the target and the visible tip equals it; no request or discovery is
active; no retry is armed; nothing is staged; every unit of work is
committed, failed or stale, or starts at or above the target.

The heal phase must not mask stalls:

- turn every fault off and clear blocked sends and pending ask faults;
- refill only empty slots, and leave faulted but connected peers in place;
- keep time moving: honest replies each round, a short sleep after progress,
  a longer sleep while idle, and a sleep past the peer cooldown after several
  idle rounds so a quarantined peer can return;
- bound the rounds.

In the worked case, an earlier heal that reconnected every faulted peer hid
a serial-path stall for 400 seconds of swarm time. With the fix, the swarm
found it in 1,227 runs.

## Excuses

A known policy gap would fail most seeds and stop the swarm from finding
anything else. Count it instead of failing, under three rules:

1. The excuse matches one exact state (for example, a run stuck exactly at
   the start of a range that ends at a liar's anchor). Anything outside it
   still fails.
2. Each excuse names its issue, and the report gives its count.
3. Excuses are decisions for the user, not for the harness author. Ask.

## Determinism

The double-run compares a snapshot of events, steps, durable writes, bans,
timeouts, notifications, and the final state tables. A mismatch is a bug in
the harness's control of order or in production's use of unordered
iteration. Fix the cause, never relax the snapshot.
