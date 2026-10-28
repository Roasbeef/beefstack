# Worked example: the neutrino header-sync DST

Repository: lightninglabs/neutrino. Harness: PR 415, merged as 79cb41e.
Doc: `docs/deterministic-sync-testing.md`. Production under test:
`blockManager` (`blockmanager.go`), the `headersync` actors and FSM, and the
`querysync` dispatcher.

## Before

The audit found a DST that looked complete and found little:

- A fixed 4-header story with 1,024 decodable behaviours, being fuzzed.
- A transport DST with 3 peers, 12 mined SimNet headers, checkpoint-backed
  ranges only, a 10-op alphabet and a liveness check after heal.
- P models with no `choose`, no monitors and no `send`: one timeline,
  however many schedules were requested.
- No fuzzing or P in CI.
- 0.2 s per run, 54% of CPU in bbolt setup. Fuzz campaigns had run 29 and
  193 inputs.
- 29.3% coverage of production code. Discovery, reorg, the filter-header
  path and RTT handling were at or near 0%.
- No ambiguous-commit or ask-after-apply fault, and the audit's reading of
  `commitHeaderSyncRangeHeaders` predicted a live retry stall from exactly
  that gap.

## Depth plan the user chose

- Raw material: the real `handlePeerMessage`, actors, timers and contextual
  validation; the runner plays `blockHandler`.
- Instruments: `testing/synctest`, swarm seeds, `go test -fuzz`, `rapid`,
  P with `choose` and monitors, gremlins.
- Targets: fuzz throughput by three orders of magnitude; coverage of the sync
  code toward 85%; blind recall of the earlier review's bugs.
- Guard: production unchanged except confirmed fixes; seams nil in
  production.
- Policy answers from the user: quarantine (not ban) unresponsive peers; a
  progress-based timeout for filter-header fetches.

## Harness

- Six modes: `checkpoint_all`, `checkpoint`, `anchor`, `frontier1`,
  `frontier2`, and serial (selected by a low nibble of `0xf`).
- 16 ops: honest replies, duplicate, stall, churn, block, store fault, ask
  fault (six sites), two byzantine ops (ten reply kinds), restart, shutdown,
  RTT, honest on all slots.
- Store modes: OK, Down, AckLost, Torn, over a strict in-memory store with a
  write log.
- Invariants: `durableChain`, `memoryMatchesDisk`, `rangeTable`,
  `commitOnce`, `leases`, `honestImmunity`, and `quiescent` after heal.
- Two counted excuses for policy gaps F12 and F13 (issue 417).

## Bugs fixed

From the earlier review, confirmed and fixed with regression tests: the
stuck commit retry after an ambiguous commit; asks that apply then error;
anchor rejection never cleared by a trusted confirmation; a forward-only
`AdvanceCommittedTip`; one overlapping anchor pair aborting a whole planning
batch; a `QuarantinePeer`/`NewPeer` deadlock between two event loops; an
empty reply leading to a 24 h IP ban of the only peer; panics on store errors
in the filter-header path; asks that held up shutdown.

Found by the swarm: a stale next checkpoint after a failed serial write that
let a fork past three checkpoints (safety); a frontier discovery livelock;
spans planned below the committed tip; the serial writer never telling the
FSM about new tips; rejected headers left in the cache after a checkpoint
mismatch; the tip published after the next request was sent; a sync peer
that left the visible tip behind; a new peer left idle while sync stalled;
no retry after a failed serial write; honest peers punished for a late
reply, an expired lease, or blocks they never had; several serial-path
stalls; reuse of range IDs after a failed ask; timers left running after
shutdown.

Found by the two advisor reviews: the serial timer disarmed on any reply,
which removed the only liveness guard (a regression from the empty-reply ban
fix); the orphaned range released in the manager but not the peer actor;
`nextRangeID` drift after an ask failed after apply.

Found later by a rescan agent building on the harness: a lost write ack on
the filter-header store that left `cfHandler` stalled with 1,000 durable
headers and 0 published. Fixed by reconciling the published tip from the
store.

## After

| Measure | Before | After |
| --- | --- | --- |
| Fuzz throughput | 0.19 exec/s | about 2,800 exec/s (16 workers) |
| Sync-code coverage | 38.6% | about 50% (blockmanager.go 57%, headersync 74%) |
| Blind recall, first review's bugs | not measured | 3 of 7 applicable; misses kept their FSM tests |
| Mutation score, headersync | not measured | 72.6% |
| P timelines explored | 1 | 2, with safety and hot liveness monitors |

The 85% coverage target was missed. The filter-header path and the query
work manager were not driven, and the report said so.

## Mistakes worth not repeating

- **The heal phase reconnected faulted peers.** That ran the done-peer reset
  and hid a stall for 400 s of swarm time. Refill only empty slots.
- **A test asserted the bug.** `TestHeaderSyncEmptyReplyDisarmsTimeout`
  encoded the stall as expected. Search for these during the audit.
- **A new mode selector remapped six regression seeds.** Re-encode byte 0
  and say so in the commit; the checkpoint safety seed changed from `6f53…`
  to `7453…`.
- **Tip publication was duplicated in four places.** Each copy drifted. One
  helper, `publishHeaderTip`, now recomputes the next checkpoint everywhere.
- **A fixture artifact looked like a stall.** A later agent's seed failed
  because of its own fixture, not production. Replay and show the reachable
  path before fixing anything.
- **Two event loops that send to each other synchronously deadlocked.** The
  fix was a non-blocking send; the design follow-up was a single owner per
  cross-store invariant (a chain-store actor).
- **An ask timeout was treated as "nothing happened".** The fail-after-apply
  fault is what made this visible, in four places.
