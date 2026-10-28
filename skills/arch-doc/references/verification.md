# Verification

Run after the draft is complete and before the PR is opened.

## Constants checklist

Keep this table in the PR body or in the scratchpad. One row per number,
duration, size, count, or default quoted in the document.

```markdown
| Claim in doc | Section | Source | Verified |
| --- | --- | --- | --- |
| Ranges hold up to 2,000 headers | Block header sync | `blockmanager.go:123` (`maxHeadersPerRange`) | yes |
| Eight times the last RTT, clamped 2 to 32 s | On-demand queries | `querysync/workmanager/worker.go:88` | yes |
```

Procedure: list quoted values with `grep -nE '[0-9]' <doc>`, then for each,
`grep -rn '<constant or literal>' <repo>` and read the line. Record the
exact form (a named constant, a literal, a config default). A value computed
from others is checked by evaluating it. A value that appears only in a test
is not a production value.

## Identifier check

`scripts/check_identifiers.sh <doc> <repo>` lists backticked tokens that are
not found in the tree. Treat the list as questions, not errors: SQL table
names, wire message names, and config keys may live outside the language
sources. Each hit is either fixed, justified in a note, or removed.

## Diagram check

`scripts/check_mermaid.sh <doc>` renders every block. Then, for each diagram,
answer:

- Does every node name an existing function, type, goroutine, or message?
- Does every edge correspond to a call or message you can point to?
- Does every failure branch in the code appear (retry, ban, abort, replan)?
- Does every state have an incoming and an outgoing transition, or is it
  initial or terminal on purpose?
- Is it readable without zooming at GitHub's default width?

GitHub's renderer is stricter than a local one in a few ways. If any diagram
is borderline, view the pushed file on GitHub and check for the text "Unable
to render" and for iframe errors before declaring success.

## Stranger read

Read the document top to bottom as the target reader, one section at a time.

- Is the first sentence of each paragraph the point?
- Is any paragraph longer than six sentences?
- Is any term used under two names?
- Is there an em dash, a metaphor, a marketing adjective, or a "previously"?
- Does any sentence describe what a reader could learn from godoc alone?
- Could a reader answer "who owns this state, and which goroutine touches it"
  for every mutable item the document mentions?

## Optional second reader

For a large document, spawn a fresh subagent with the finished text and the
repo, and ask only: "List every statement the code contradicts, with
`file:line` evidence. Do not suggest improvements." Verify each reported
contradiction yourself before editing.
