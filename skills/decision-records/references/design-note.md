# Design notes

A design note is an exploration or a pre-code ruling: research on a
microVM executor tier, a comparison of orchestration models, the argued
architecture for an extension system before a line of it exists. It is
the place for thinking that is too long for an issue and too provisional
for an ADR. Where an ADR records two sentences of decision, the design
note carries the vocabulary, the manifest, the phased plan and the
argument the ADR compresses.

## Shape

```
# Design note: <topic>

Status: **note, not a work package.** Research only; nothing here is
built, and nothing here changes a frozen interface.

<body, sectioned by the note's own logic>
```

No YAML frontmatter. The status line is the first paragraph and is the
only mandatory element, because it is what tells a reader whether they
are looking at a plan, a ruling, or a record of something built.

## The status lifecycle

The status line is a small vocabulary and it moves. Edit it in place as
the note's standing changes; never delete a note because its work landed.

| Status | Means |
|---|---|
| `note, not a work package.` Research only. | Exploration. Nothing built, nothing frozen changes. |
| `note, not a work package.` Captured while fresh; promote to a numbered work package when ... | A plan with a named promotion condition. |
| `ruling, pre-code.` The decisions that outlive one change are ADR-NNN; this note carries the argument. | Decided, unbuilt. The ADR exists and points here. |
| `built through phase N; issue #NN is the plan of record.` | Partially landed. The note is still the design; the issue tracks the rest. |
| `built.` | Landed. The note stays as the why. |

A note that was consulted with an advisor before code says so up front:
"consulted (read-only advisor) before any code was written, per
`docs/execution.md` §7." A note argued from a specific tree pins the
commit: "argued from the tree as built at `c747fb5` (2026-08-25)".

## Body conventions

- Open by restating the ask, then what the tree already decides. Most
  design questions are half-answered by invariants already in force;
  say which ones bind before proposing anything.
- Number the decisions inside the note (`## Decision 1: ...`) and give
  each a one-line verdict up front when there are several. A reader
  should be able to stop after the verdicts.
- Close with phases and an acceptance test. A note with no stated
  acceptance is a wish.
- Cite code with `file.ext:NN`. If the repo runs a citation gate, these
  are checked; the note is not exempt the way review files are.

## Promotion

When the code lands, the outliving decisions go to an ADR that cites the
note, the mechanics that touched a frozen interface have their
protocol-change number, and the note's status line moves to `built`. The
note's body is not rewritten to match the build; a later reader wants to
see what was planned against what shipped. Where the build departed,
add one italic line at the point of departure naming the ADR or the
issue that explains why.
