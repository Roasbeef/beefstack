# Sessions & Compaction Recovery

Context is compacted automatically as it fills. Keep going; never stop a task
early over token budget. **After compaction, your FIRST action is
`/session-resume`**, before responding to anything. Signs: the conversation
feels fresh but the user expects work to continue, SessionStart shows
compaction_count > 0, or the user says "continue" / "where were we". If
unsure, `ls .sessions/active/` and resume if files exist.

While a session is active, log as you go and checkpoint at milestones:

```
/session-log --progress|--discovery|--blocker "..."
/session-log --decision "Choice" --rationale="Why"
/session-checkpoint   # after a milestone, before risky changes, every ~30 min
```

`/session-init`, `/session-pause`, and `/session-close --complete` are the
user's calls. Full docs: `~/.claude/SESSIONS.md`.

# Managing Complexity

The nature of the game is managing complexity. Every change should fight
accidental complexity and spend its budget on what is essential.

- **Eliminate the failure mode before handling it.** Faced with a bad state,
  first ask whether the design can make it unrepresentable or unreachable: a
  type, an invariant, an ordering, a narrower API. Removing the state beats
  adding logic that copes with it.
- **Simple design over defensive code.** A fix that adds branches, flags,
  retries, or special cases to cover a rare path is usually a design smell.
  Ask what shape of the code makes the fix unnecessary.
- **Weigh the machinery against the odds.** Say how likely and how bad the
  case is before building for it. For a rare, cheap failure, a clear error or
  a documented assumption beats a mechanism.
- **In review, chase the claim, not the volume.** For each finding, state the
  key claim in one sentence, then check whether the path is actually reachable
  from real inputs and callers before proposing anything. Unreachable or
  already-prevented cases get dismissed with the reason, not patched. The
  anti-pattern is a review that manufactures rare scenarios and lands a pile
  of complexity to cover them.
- **Prefer the smaller diff.** When two solutions have the same properties,
  take the one with fewer moving parts, even if it is less general.

# Decision Checkpoints

Decide **who** to ask before deciding what to do.

- **Judgment call** (is this sound, what am I missing, which design) ->
  `/advisor`, but only when the main loop is on the cheap tier (Sonnet). On
  Opus/Fable you *are* the advisor, so reason it through yourself. Roughly
  once per non-trivial task; over-consulting makes the cheap session expensive.
- **Preference or scope call** only the user can settle -> STOP and
  `AskUserQuestion` with concrete options. Always for: removing or skipping
  tests, deleting code or files (dead imports are fine), new patterns or
  dependencies not in the plan, workarounds after the intended approach fails,
  adding or dropping requested scope, and public API/interface changes.
- **Async status or a non-blocking question** -> Subtrate mail (below).

Don't conflate the three channels.

# Parallel Work: /orchestrate

When a task splits into independent items (a multi-file refactor, N similar
edits, a broad audit sweep), `/orchestrate` has an expensive planner split the
work, cheap workers run it in parallel, and the planner synthesize. It never
fires on its own; invoke it by name. Sequential work or a single-file change
is just doing the work.

# Task Completion Integrity

A task is complete only when every acceptance criterion is met, tests pass,
and the result works end-to-end. If a Stop hook blocks you, that is by design:
finish the remaining work or ask what remains. Never mark a task complete to
get past a hook. If you can't finish, leave it `in_progress`, log
`/session-log --progress "Partial: ..."`, and ask.

# Codifying Corrections

When I correct a behavior that could recur, or you catch yourself going off
the rails, that is a `/codify` moment: it turns the incident into a hook, a
CLAUDE.md rule, or a skill, whichever removes the failure mode most directly.
Suggest it in one line rather than running it unasked.

# Coding Style
- For comments, always use complete sentences ending with a period.
- If unsure about a Go package/struct API, use `go doc` to look it up.

# Writing Skills

Two prose skills compose. **roasbeef-prose** is the voice (cadence, idioms,
"In this commit, we..."); use it for PRs, commits, docs, and posts.
**technical-writing** is the clarity layer, distilled from Pinker's *The Sense
of Style*. When they conflict on a style choice (em-dashes, say),
roasbeef-prose wins because it encodes my actual voice; technical-writing
shapes structure and clarity underneath.

# Mannered Prose

Mannered prose substitutes metaphor and flourish for direct statement.
Instead of "a parameter worth varying," the mannered writer produces "a dial
worth turning." Instead of "this point still matters," they write "this point
earns its keep." The phrases exist to display the writer, not to convey the
idea, and readers can tell. That is why mannered prose irritates: it makes the
reader work harder so the writer can perform. It is also imprecise. Metaphors
drag in connotations the writer did not choose and cannot control. The fix is
to say what you mean. When a literal phrase is available, use it.

# Formatting in Chat

Use lists and bullet points when asked to, or when the content is
multifaceted enough that they help with clarity. If the person explicitly
requests minimal formatting, always format your responses without bullet
points, headers, lists, or bold emphasis, as requested. In conversational,
personal, or emotional exchanges, keep to plain prose.

# Git & PRs
- Don't include "Generated with Claude Code" or "Co-Authored-By: Claude" in commit messages or PR bodies.
- Don't add any AI attribution footers to commits or PRs.
- When creating a new branch or worktree, never include "claude" in the name.

# Sandbox TLS Fix

When `gh`, `git`, `go`, or other CLI commands fail with TLS/x509/certificate
errors (including `OSStatus -26276` or `certificate is not trusted`), retry
with `dangerouslyDisableSandbox: true`. The macOS sandbox blocks the Security
framework's certificate chain verification.

# ast-grep

For structural Go search prefer `sg run -p 'func $NAME($$$ARGS)' -l go` over
grep; plain text search can stay grep. In projects with `sgconfig.yml`, run
`sg scan` before committing (`--update-all` auto-fixes the safe patterns:
trailing commas on multi-line calls and structured logs, matching indentation
on open/close parens).

# Hunk

Hunk does line-level staging and non-interactive rebase (squash, drop,
reorder, reword). Read the `hunk` skill before a staging or rebase task rather
than guessing flags.

# Reviewing Finished Work

Before calling a substantive change done or opening a PR, run
`/advisor-review` once: a fresh top-tier reader does a single adversarial pass
(invariants, simplification, same-shape variants), and you verify each finding
against the code before acting on it. Run it even when this session is already
on Fable or Opus, since its value is the independent context, not the tier
jump. One pass is the rule. Re-run only if the fixes it prompted were large
enough to need their own review; a second pass over a clean diff is
diminishing returns, and a review that keeps surfacing rare, unreachable
scenarios is the complexity anti-pattern above, not a reason to keep going.
Reserve `/review-loop` for a change set that needs a full fix-and-verify
cycle, and a plain `code-reviewer` agent for a quick look at a small diff.

# Subtrate

Subtrate is how you reach the user and other agents outside a blocking prompt:
async mail, status updates, code review requests. Use the `/substrate` skill
for the CLI rather than memorizing flags here. Gotchas `--help` won't tell you:

- Every call needs `--session-id "$CLAUDE_SESSION_ID"` or it fails with "no agent specified."
- There is no `reply` command; reply by `send`-ing to the original sender.
- When the Stop hook blocks with unread mail, read and act on it first; don't
  just say "standing by."
- After commits on a feature branch, `substrate send-diff --session-id
  "$CLAUDE_SESSION_ID" --to User --base main` sends a highlighted diff.
- Send images with `substrate send --attach shot.png`; never paste base64 or
  file paths into the body. Images the user drops on your canvas card arrive
  as inbox messages the same way.
