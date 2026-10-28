# Reader subagent brief

Spawn one subagent per subsystem, all in one message. Use a read-only
agent type (`Explore`, or `general-purpose` if it needs to run `go doc` or
similar). Fill in the bracketed parts. Do not tell the reader what the answer
should be; hand it the files and the questions.

## Prompt template

```
You are reading one subsystem of <repo> to produce raw material for an
architecture document. Do not write the document. Return the structured
summary below, and nothing else.

Subsystem: <name>
Files: <paths or globs>
Anchor: commit <sha> (read the working tree as it is; do not read history)
Neighbouring subsystems (describe the boundary with each, do not describe
their insides): <list>
Reader of the final document: an engineer who knows <domain> but not this
code.

Rules:
- Every claim cites file:line. If you are inferring, say "inferred".
- Report what the code does, not what comments say it does. If they differ,
  report both.
- Quote constants as written (name, value, file:line). If a value is derived
  (a multiplier, a clamp), give the derivation.
- Name functions and types exactly. Do not rename or paraphrase.
- If you cannot determine something, list it under Open questions.

Return, in this order:

1. Types. For each exported or load-bearing type: one-sentence
   responsibility; what it owns (state, resources); what it explicitly does
   not own, and who does.
2. Flows. For each flow that crosses a type boundary: a numbered list of
   messages or calls, "A -> B: what, with which function". Include failure
   and timeout paths and where each one ends.
3. State machines. For each: the exact state names; the transitions as
   "From -> To: function or event, side effects (epoch, counter, owner)";
   initial and terminal states; transitions that bypass the machine.
4. Ownership. For each piece of mutable state (maps, queues, counters,
   caches): the goroutine, thread, process, or lock that owns it, and which
   other goroutines may read it and how.
5. Constants. Name, value, file:line, and one phrase on what it governs.
   Include sizes, timeouts, retry counts, intervals, cache sizes, and
   feature flags that change behaviour.
6. Open questions. Anything surprising, inconsistent, or unverified.
```

## After the summaries arrive

- Check that every subsystem returned all six parts. Re-ask for a missing part
  with a narrow prompt via SendMessage rather than filling it in from memory.
- Spot-check three claims per summary against the code, preferring constants
  and ownership claims. If one fails, treat the whole summary as unreliable
  and re-derive the parts you rely on.
- Build a single list of names (types, functions, messages) with their
  `file:line`. The verification step greps against this list and the tree.
- Keep summaries in a scratch file, not in the repo.

## Code against comment

Readers often find places where the code and its comment disagree, or where a
likely bug sits. Those are not material for the document's body. Collect them
under Known gaps as neutral statements of what the code does, and mention
them to the user separately.
