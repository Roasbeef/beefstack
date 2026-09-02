---
name: codify
description: "Turns an observed agent misbehavior, or a correction the user just gave, into a durable fix: a hook that makes the behavior impossible, a CLAUDE.md rule, a change to the skill that was running, or a new reusable skill. Picks the narrowest home that removes the failure mode, checks for an existing rule to tighten before adding one, and keeps CLAUDE.md from bloating. Invoked via /codify when an agent goes off the rails on something the user does not want repeated."
argument-hint: "[<what went wrong, or the rule to encode>] [--home=hook|claude|skill:<name>|new-skill|memory] [--scope=global|project]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Task
  - Skill
---

# Codify

An agent did something the user does not want repeated, or the user gave a
correction mid-task. This skill turns that one incident into something that
holds across sessions. The output is a small, well-placed change to the
harness config, to `CLAUDE.md`, or to a skill, plus a one-paragraph report.

The skill's own failure mode is the thing it exists to fight: piling rules
into `CLAUDE.md` until none of them land. Every addition must earn its place,
and tightening or moving an existing rule beats adding a new one.

## 1. Capture the incident

Get three things down before touching any file:

- **What happened.** The concrete behavior, quoted from the transcript or the
  user's words. If `/codify` came with no arguments, read the last few turns
  for the correction; the trigger is usually the user's most recent message.
- **What was wanted instead.** The behavior the user expected.
- **Why it matters.** The cost of the behavior: wasted tokens, a wrong diff,
  a broken invariant, a preference violated. A rule the agent understands is
  one it follows, so the why is part of the deliverable.

If any of the three is unclear and guessing would produce a different rule,
ask one `AskUserQuestion` with the candidate readings as options. Otherwise
proceed and state the reading you chose.

## 2. Distill the rule

Generalize to the smallest rule that covers the incident without over-fitting.
"Never add a retry loop in `foo.go`" is a diff, not a rule; "don't add
retries or special cases for a failure the design could eliminate" is a rule.
Write it as one sentence a fresh agent can apply, then one line of why. Ask:

- Would a fresh agent, reading only this sentence, avoid the observed
  behavior? If not, sharpen it.
- Does it forbid something the user actually wants in other situations? If
  so, narrow it or state the boundary.
- Is it already the harness's default? Then the agent ignored a rule, which
  means step 3 is about placement, not wording.

## 3. Check for existing coverage

Before adding anything, grep for the topic:

```
grep -n -i '<keyword>' ~/.claude/CLAUDE.md ./CLAUDE.md ./.claude/CLAUDE.md
grep -rn -i -l '<keyword>' ~/.claude/skills/*/SKILL.md ./.claude/skills/*/SKILL.md
grep -n -i '<keyword>' ~/.claude/settings.json ./.claude/settings*.json
```

Three outcomes:

- **No coverage.** Continue to step 4.
- **A rule exists and the agent violated it anyway.** Adding a duplicate will
  not help. Diagnose why it failed to land: buried under bulk, vague, phrased
  as a suggestion, contradicted elsewhere, or loaded only inside a skill that
  was not active. Fix that: sharpen, move earlier, bold the imperative, or
  promote it to a stronger home (a hook). Delete the weaker copy.
- **A skill was running when it went wrong.** The rule belongs in that skill,
  since that is where the context was loaded. Edit the skill rather than
  adding a global rule about a situation only the skill creates.

## 4. Pick the home

Two independent choices: the **mechanism** (how strongly it binds) and the
**scope** (where it applies). Honor `--home` if given.

**Scope first.** Does the rule hold everywhere, or only in this codebase?
Each mechanism exists at both levels:

| Scope | Hooks | Rules | Skills |
|-------|-------|-------|--------|
| Global | `~/.claude/settings.json` | `~/.claude/CLAUDE.md` | `~/.claude/skills/` |
| Project | `.claude/settings.json` | `./CLAUDE.md` or `.claude/CLAUDE.md` | `.claude/skills/` |

A project rule that is really a general principle belongs global; a global
rule that only ever fires in one repo belongs in the project. For project
hooks, `.claude/settings.json` is committed and binds every contributor's
agents, while `.claude/settings.local.json` is gitignored and binds only
yours. Pick by whether the team should inherit the rule.

**Then the mechanism.** Walk the ladder top down and stop at the first fit:

1. **Hook.** The behavior is mechanical and checkable: a command that must
   never run, a file that must be formatted, a check that must pass before
   stop. A hook makes the bad state unreachable instead of asking the model
   to remember. Use the `update-config` skill to write it, and test that it
   fires. A project hook can call a script checked into the repo, which is
   the right place for a check that depends on the project's toolchain.
2. **CLAUDE.md rule.** A behavior-shaping rule that fits in five lines or
   fewer. Add it to the existing section it belongs to; create a section only
   when none fits.
3. **Existing skill.** The incident happened inside a skill's workflow, or
   the rule only matters when that skill is active (see step 3).
4. **New skill.** The fix is a multi-step procedure or reference material too
   long to be always-on, triggered by a recognizable situation. Follow the
   `skill-creator` conventions: frontmatter `name` and `description` written
   in the third person and specific about the trigger, procedure in the body,
   long reference material under `references/`. Set
   `disable-model-invocation: true` if it should only run when named.
5. **Auto-memory.** A fact about the user or a project that is context, not a
   rule (a preference with no do/don't attached). Write it as a memory file
   per the memory instructions rather than a CLAUDE.md line.

If the incident spans two homes (a hook to block the action plus a line
explaining why), do both, but keep the CLAUDE.md line to one sentence that
points at the hook.

## 5. Write it

Match the voice and shape of the file you are editing. For `CLAUDE.md`:

- Rule first, as an imperative. Why in one line. How to apply only if the how
  is not obvious from the rule.
- No examples unless the rule is easy to misread without one, and then one
  short example, not a dialogue.
- Adding must not grow the file unchecked. After the edit, look for a section
  that is now redundant, stale, or longer than its value, and cut or condense
  it. Report what you cut.

For a skill: keep `SKILL.md` to procedure and put bulk in `references/`. For
a hook: prefer a small shell script over an inline command, under
`~/.claude/hooks/` for global scope or `.claude/hooks/` in the repo for
project scope, and make the failure message tell the agent what to do
instead.

## 6. Verify

Re-read the entry as a fresh agent would and confirm it unambiguously rules
out the observed behavior. For a hook, trigger it once and confirm it blocks
or runs. For a subtle text rule, an optional cheap check: spawn a `haiku`
sub-agent with only the new rule and the original scenario and ask what it
would do. If it would still do the wrong thing, the wording is not landing.

## 7. Commit and report

`~/.claude` is a git repo. Commit with the repo's convention, one change per
commit: `CLAUDE.md: <rule in a few words>`, `skills/<name>: <change>`, or
`hooks: <change>`. No AI attribution footers. If a project file changed
instead, leave it staged for the user unless they asked for a commit.

Report in one short paragraph: the incident, the rule, where it landed and
why that home, what was cut or tightened, and how it was verified.

## What not to codify

- A one-off slip with no pattern behind it. Wait for the second occurrence.
- Something the harness already enforces. Check the system prompt's rules
  before adding a weaker echo of them.
- A rule that only restates a `CLAUDE.md` line that already exists. Tighten
  that line instead (step 3).
- A preference the user has not actually stated. Ask.
