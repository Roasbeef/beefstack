---
name: arch-doc
description: "Writes an architecture document for a package, subsystem, or pipeline in any codebase: a map of who owns what and how control and data flow, built from mermaid diagrams (component flowchart, startup sequence, state diagrams, per-pipeline flowcharts, ER schema) plus Owns / Does-not-own and goroutine-ownership tables, at a fixed prose weight. Gathers facts with one reader subagent per subsystem, writes the document itself, greps every quoted number against the code, renders every diagram, and opens a docs-only PR. Modeled on lightninglabs/neutrino docs/sync-architecture.md (PR 407). Use when the user wants an architecture overview, a design map, or onboarding docs for existing code, or invoke via /arch-doc."
argument-hint: "<package|subsystem|pipeline> [--repo=<path>] [--range=<rev>..<rev>] [--out=docs/<name>.md]"
allowed-tools:
  - Task
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Skill
  - AskUserQuestion
---

# Architecture document

The deliverable is one Markdown file under `docs/` that lets an engineer who
knows the domain but not this code answer three questions: which component
owns which state, which goroutine (thread, process) touches it, and what
happens, message by message, between a request arriving and a durable result.
The reference example is `docs/sync-architecture.md` in
lightninglabs/neutrino (PR 407). Read its structure in
`references/worked-example.md` before writing.

The document describes the code as it is at one commit. It is not a design
proposal, a changelog, or a tutorial, and it does not restate godoc.

## 1. Scope and anchor

Parse `$ARGUMENTS`. Fix four things before reading code, asking with
`AskUserQuestion` only for what the arguments and the repo do not settle:

- **Subject.** The package, subsystem, or pipeline. If it is a pipeline that
  crosses packages, list the packages.
- **Anchor.** The commit, tag, or PR range the document reflects. Record the
  output of `git rev-parse --short HEAD` now, and say in the intro which
  commit or series the text is true of.
- **Reader.** An engineer new to this code who knows the domain (for
  example, Bitcoin or Lightning, a database engine, a web framework). Do not
  explain the domain; explain this code.
- **Output.** `docs/<subject>-architecture.md` unless `--out` says otherwise.
  Read the repo's existing `docs/`, README, and any CLAUDE.md first, and match
  heading style and link conventions. Link related docs instead of repeating
  them.

Then read the subject's top-level files yourself: the entry constructor, the
main types, the package list. You need this to cut the work into subsystems
and to judge the subagent summaries later.

## 2. Gather raw material in parallel

Cut the subject into three to six subsystems along ownership lines (one
actor, one store, one scheduler), not along directories. Spawn one reader
subagent per subsystem in a single message so they run concurrently. Use
`references/reader-brief.md` as the prompt template; fill in the subsystem,
the files, the anchor commit, and the names of the neighbouring subsystems so
that each reader describes its boundary.

Each reader returns a structured summary with six parts: type
responsibilities (including what each type does not own), flows message by
message, every state machine with exact states and the function or event that
causes each transition, the owner of each piece of mutable state, constants
with values and `file:line`, and open questions. The summaries are inputs.
Do not paste them into the document, and do not accept a claim from one
without a grep: readers paraphrase, and a paraphrased constant is the most
common error in these documents.

When two summaries disagree about a boundary (both claim to own a map, or
neither mentions who closes a channel), resolve it by reading the code
yourself before writing the Components table.

## 3. Write to the skeleton

Write the document yourself, in one pass, from the summaries. The skeleton
below is fixed in order but adapted in content: drop a section the subject
lacks, add one pipeline section per real pipeline. `references/skeleton.md`
has the Mermaid templates and the exact shape of each table.

| Section | Contents |
| --- | --- |
| Title and intro | One paragraph: what the subsystem keeps in step, its scope, the anchor (commit or series), and links to related docs. |
| Components | A flowchart with one subgraph per component and labeled edges, one paragraph of lead-in, then a Responsibilities table with `Owns` and `Does not own` columns. |
| Startup (or lifecycle) | A sequenceDiagram of construction and start, with `alt` and `opt` blocks for configuration branches. One sentence on why the order matters. |
| One section per pipeline | Intro paragraph; a `stateDiagram-v2` where state exists; a flowchart from start to durable result, including failure branches; a numbered list of steps with bold leads. |
| Shared state machines | Peer, connection, or session states used by more than one pipeline, as a `stateDiagram-v2`, then the rule that the diagram cannot show. |
| Storage | A backend comparison table, an `erDiagram` with PK and UK markers and short comments, one paragraph on transactions and caching, and a sequenceDiagram for any migration or import. |
| Concurrency | A table of goroutine against what it owns, then prose rules: what timers may do, and the gotchas a caller must know. |
| Known gaps | What the document does not cover or could not verify. |

Section by section:

- **State diagrams** carry the most value. Transition labels name the real
  function or event, and say what changes on the transition (epoch, lease,
  owner, counter). Include terminal states and failure states. Follow the
  diagram with prose for what the diagram cannot show: terminal transitions
  that bypass the machine, invariants over the whole machine.
- **Flowcharts** run from the trigger to the durable result and show every
  failure branch with where it goes next (retry, ban, replan, abort). One idea
  per diagram: if a flowchart needs two start nodes for unrelated reasons,
  split it.
- **Numbered steps** follow the flowchart and use a bold lead: `1. **Plan.**
  ...`. Each step names the function that performs it and says what it
  decides or changes. Use a numbered list only for a real sequence; use a
  table for an enumeration and bullets for a set of cases.
- **Constants** appear in prose where they change behaviour (a batch size, a
  timeout, a retry count) and always with the exact value from the code.
  Quote a constant once, in the section that explains it.
- **Storage** states what each backend uses per interface in a table, then
  the schema. Explain every missing foreign key and every cache.
- **Concurrency** closes the document. A table of owner against state, then
  the rules that make the table safe: which goroutines may touch which state,
  what timers may do, and the failure semantics a caller can get wrong (for
  example, that an ask timeout does not mean the actor left its state
  unchanged).

## 4. Diagram rules

- Label every node and edge with a real identifier: `Controller.PlanCheckpointRanges`,
  `blockHandler goroutine`, `getheaders(StartHash, StopHash)`. Never an
  abstract box such as "planner" or "storage layer". Use the file name in a
  subgraph title when it helps: `ChainService (neutrino.go)`.
- Show every failure branch the code has. A flowchart with only the happy
  path is wrong.
- One idea per diagram, readable at GitHub's default zoom: roughly 12 nodes
  for a flowchart, 10 participants or fewer for a sequence, 15 states for a
  state diagram. Split rather than shrink.
- Use `<br/>` for line breaks inside labels. Quote labels that contain
  parentheses, commas, or brackets. Do not use `\n`.
- Every diagram is followed by prose that says what to take from it. Do not
  put a diagram directly under a heading with no lead-in.
- Every node must exist in the code. If you cannot point to the function,
  type, or message, the node is invented.

## 5. Prose rules

Load `technical-writing` with the Skill tool and apply it, with these
overrides from `roasbeef-prose` (which wins any conflict):

- No em dashes. Use commas, colons, parentheses, or two sentences.
- The point goes in the first sentence of each paragraph. Six sentences or
  fewer per paragraph.
- No anthropomorphism. Write "peers that sent incorrect headers are banned",
  not "the peer that lied"; write "the timer posts a message", not "the timer
  wakes the handler to tell it".
- Define a term once, at first use, then reuse the same word. If the code
  calls it a range, never call it a segment or a chunk.
- Describe current behaviour. No "previously", "no longer", "we changed", or
  "this series added". The anchor sentence in the intro is the only reference
  to history.
- Neutral, concrete, third person. No marketing words (robust, seamless,
  powerful, elegant) and no metaphors (a dial, a backbone, earns its keep).
- Tables for reference enumerations; bold leads for steps; backticks for every
  identifier, file, and message name.

## 6. Verify before publishing

Verification is a step of its own, after the draft is complete.
`references/verification.md` has the checklist template.

1. **Constants.** Extract every number, duration, size, and name that the
   document quotes. Grep each against the code and record `file:line` in a
   checklist (kept outside the document, or in the PR body). A value that
   cannot be found is removed or fixed.
2. **Identifiers.** Grep every function, type, and message name that appears
   in a diagram or table. `scripts/check_identifiers.sh <doc> <repo>` reports
   backticked names with no match in the tree, as a first pass.
3. **Diagrams.** Run `scripts/check_mermaid.sh <doc>`. It renders each
   mermaid block with mermaid-cli (`mmdc`) and prints the failing block with
   its line number. If `mmdc` is not allowed or installed, push the branch and
   open the rendered file on GitHub in the browser, and look for "Unable to
   render" and iframe errors in each diagram. Do not call a document done
   until each diagram has rendered one of these two ways.
4. **Stranger read.** Re-read each section as the target reader. For every
   diagram node, point to the code. For every paragraph, check that the first
   sentence is the point. Check that no term has two names.
5. **Cross-check with a second reader (optional).** For a large document,
   give the finished text and the code to a fresh subagent and ask it only to
   list statements that the code contradicts.

## 7. Deliver

Write the document under `docs/`, add a link to it from the README (or the
docs index if the repo has one), and open a docs-only PR: no code changes. The
PR body states the anchor commit, lists the diagrams, includes the constants
checklist with `file:line`, and lists known gaps. Follow the repo's commit
message and PR conventions, and load `roasbeef-prose` for the text if the
repo is the user's. Do not add AI attribution.

Known gaps are part of the document and the PR: say which subsystems the
document skips, which claims rest on a reader's summary that you did not
re-derive, and which behaviours you could not confirm without running the
code. Do not paper over a gap with confident prose.

## What not to do

- **Marketing tone.** The document informs; it does not sell the design. No
  adjectives that judge the code.
- **Abstract boxes.** A diagram of "Client", "Service", and "Database" with
  arrows is worthless. Every box is a named type, goroutine, or message.
- **History narration.** No account of how the code got this way, no "legacy"
  as a story. Describe the two backends or paths as they exist now.
- **Duplicating godoc.** Do not list every method or field. Explain how types
  relate, who owns what, and what the compiler cannot show. Link to the file
  for the rest.
- **Inventing numbers.** Every number comes from a grep. If the code derives
  it (a clamp, a multiplier), quote the derivation and its source line.
- **Summaries as the document.** The reader subagents' output is a bag of
  facts. The document has an order, a voice, and a point per paragraph.
- **One giant diagram.** Split by idea. A diagram you have to zoom into is two
  diagrams.
- **Unrendered diagrams.** Mermaid fails silently in the editor and loudly on
  GitHub. Render before pushing.

## Resources

- `references/worked-example.md`: the structure of neutrino's
  `docs/sync-architecture.md`, section by section, and what each section
  does.
- `references/example-hop-architecture.md`: a complete small document
  (lnd `htlcswitch/hop`, 5 diagrams) produced with this skill. Use it as a
  second reference for scale: a three-pipeline package at about 330 lines.
- `references/skeleton.md`: Mermaid and table templates for each section.
- `references/reader-brief.md`: the prompt for the per-subsystem reader
  subagents and the exact return format.
- `references/verification.md`: the constants checklist and stranger-read
  questions.
- `scripts/check_mermaid.sh`: render every mermaid block in a Markdown file.
- `scripts/check_identifiers.sh`: flag backticked identifiers not found in the
  tree.
