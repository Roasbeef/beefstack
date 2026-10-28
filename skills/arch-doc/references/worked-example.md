# Worked example: neutrino `docs/sync-architecture.md`

Source: https://github.com/lightninglabs/neutrino/pull/407 (544 lines, nine
diagrams). It documents the SQL and actor-based sync stack in about eight
sections. This file records what each section does, so that a new document can
copy the function and not the content.

## Section map

| Section | Diagram | What it does | Weight |
| --- | --- | --- | --- |
| Intro | none | Names the three kinds of data kept in step, the scope, the anchor ("the code after the SQL and actor-based sync series (#397 through #403)"), and links the testing doc. | One paragraph, one link sentence. |
| Components | flowchart TB, five subgraphs (`ChainService`, `blockManager`, `headersync.Runtime`, `querysync/workmanager`, Stores), labeled edges such as "headers, inv" and "ordered commit" | Shows who calls whom. Subgraph titles carry file names. | One lead-in paragraph, the diagram, one paragraph on the two storage backends, then an 11-row Responsibilities table. |
| Startup | sequenceDiagram with `autonumber`, `alt cfg.SQLConfig set / else walletdb backend`, `opt cfg.HeadersImport set`, and `Note over` | Shows construction order. | One sentence on why the order matters (the block manager reads durable tips while it builds the runtime). |
| Block header sync | stateDiagram-v2 (range lifecycle), flowchart LR (plan to commit), stateDiagram-v2 (peer states, in "Peer scheduling states") | The core pipeline. States: Queued, Owned, Active, Staged, Committed, Failed, Stale. Every transition label names a function and any epoch change. | Intro paragraph, fallback bullets, "Anchors and ranges" and "Leases" subsections, seven numbered bold-lead steps, one paragraph on failure handling. |
| On-demand queries | sequenceDiagram with an `alt success / else timeout` block | Message-by-message path of one request through dispatcher, actor, worker, peer. | Intro, diagram, then three paragraphs of scheduling rules with the real numbers (four jobs per peer, eight times RTT clamped to 2 to 32 seconds, 30-second cooldown, ten-minute quarantine). |
| Filter header sync | flowchart TB with failure loops (`detectBadPeers` back to `getCheckpts`, mismatch back to batch) | A second pipeline, same format: flowchart, then numbered bold-lead steps. | Three steps and a short Notifications subsection. |
| Storage | erDiagram (five tables, PK and UK markers, short comments), sequenceDiagram (legacy import) | Backend comparison table first, then schema, then transaction and cache behaviour, then the import. | Table, diagram, two paragraphs, diagram, two sentences. |
| Concurrency | none | Eight-row table of goroutine against owned state, then two rules. | Table and two short paragraphs: timers only post messages; an actor ask error does not mean the FSM is unchanged. |

## Features worth copying

- **Headings say what the section is about**, not "Overview" or "Details":
  "Anchors and ranges", "Leases", "From plan to durable commit", "Peer
  scheduling states", "Importing legacy data".
- **Definitions come before use.** "An anchor is a height and hash that the
  scheduler can use as a range boundary." appears before any diagram uses the
  word, and "range" is then used everywhere without a synonym.
- **State diagram labels carry the mechanism.** `Queued --> Owned:
  AssignRange<br/>(epoch + 1)` names the function and the lease change in one
  label. A diagram of this kind lets a reader predict the code.
- **Prose after the diagram says what the diagram cannot.** After the range
  states: "`AdvanceCommittedTip` also moves ranges into terminal states..."
  covers transitions that bypass the machine.
- **Failure handling is spelled out**: `InvalidateRange` marks the range
  Failed, deletes untrusted anchors up to the next trusted one, marks
  dependent ranges Stale, and says what is unaffected.
- **Tables enumerate, prose explains.** Responsibilities and goroutine
  ownership are tables; scheduling rules are paragraphs.
- **Constants come with their reason.** "Waiting for all peers keeps a fast
  majority from hiding a timely conflicting reply."
- **The schema section explains absences**: why there is no foreign key
  between the two header chains, and why each write updates `chain_tips` in the
  same transaction.
- **Gotchas close the document**: timers only post messages; an ask timeout
  does not imply unchanged state.

## Facts that had to be verified (so the checklist exists)

Examples of what the verification step caught or must catch: the range size
(2,000 headers), peers asked in parallel (four), jobs per peer (four), the
timeout multiplier and clamp, cooldown and quarantine durations, batch sizes
for inserts, cache size and prefetch width, the commit retry delay, the
actor ask deadline. All come from named constants or literals in the code;
none was taken from a reader's summary unchecked.

## How to use it

Read the neutrino document once for tone, then write for the new subject
from its own summaries. Do not copy sentences or section names that do not
apply. A subject with no persistent storage has no Storage section; a
single-threaded subject has a short Concurrency section or none; a subject
with three pipelines has three pipeline sections.
