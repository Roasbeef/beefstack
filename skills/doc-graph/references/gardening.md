# The gardening phases

The installed `doc-gardening` skill is rendered per repo, but the phases
are fixed. This is the reference for rendering it and for running it in a
repo whose installed copy has drifted.

1. **Detect.** Scoped: one package, decide new versus stale. Full: list
   packages with source but no doc, and packages touched on the branch.
   Classify new / stale / scaffold. A scaffold gets nothing or a marked
   two-line stub, never a description inferred from its manifest.
2. **Read the source.** Doc comments first (they were written to state
   contracts), then public declarations, then imports as the real
   dependency edges, then the impurity inventory (FFI, syscalls, network,
   globals). Cross-check declared against actual edges and report
   divergence. Never infer from a filename.
3. **Trace the traffic.** Per traffic kind, a grep that finds the edges
   and a rule for what to record: both ends, by qualified name, and
   whether the edge is synchronous (a call with a reply) or not. This is
   the section the doc exists for.
4. **Generate or update.** Against the template. New: from scratch.
   Stale: diff against source and change only what moved; stability is
   what makes the file's history readable. No tool names in content.
5. **Mirror.** `cp CLAUDE.md AGENTS.md`. Never hand-edit.
6. **Roll up.** A new or renamed module goes into the architecture doc's
   "Where the code lives" table. A spec interpretation goes to the gap
   log; a frozen-interface change goes to a protocol-change; never a
   silent edit to a package doc.
7. **Validate.** Run the gate, capture its exit code, fix every error,
   report created / updated / still warning.

Two rules that hold across every phase: accuracy beats coverage, because
a wrong edge or an invented invariant is worse than a missing section;
and invariants are things that break when violated, not properties of
the code style.
