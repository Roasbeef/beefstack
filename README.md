# beefstack

A Claude Code configuration built up over a year of daily use, mostly on Bitcoin
and Lightning Network work. Skills, sub-agents, hooks, session continuity, and
inter-agent messaging, arranged so that long and unglamorous engineering tasks
survive context compaction and can be handed to a fleet rather than done one
prompt at a time.

It is a working setup rather than a demo. Everything here earned its place by
being used, and the usage numbers below are measured from the local transcripts
rather than estimated.

## How it actually gets used

Measured across 8,743 session transcripts spanning 279 projects, from 2025-09-28
to 2026-09-01. That is 31,891 prompts over 338 days, or roughly 94 a day.

Skills are invoked 1,355 times. The distribution is lopsided in a way worth
noting: a handful of skills carry most of the load, and they are the ones that
handle the parts of the job nobody enjoys.

| Skill | Invocations | What it carries |
|-------|------------:|-----------------|
| `substrate` | 326 | Agent mail, status, review requests |
| `roasbeef-prose` | 237 | Voice for commits, PRs, docs |
| `incremental-commit` | 188 | Splitting a diff into atomic commits |
| `differential-review` | 58 | Security-focused review of a change |
| `sharp-edges` | 49 | Footgun and misuse-resistance audit |
| `insecure-defaults` | 47 | Fail-open configuration hunting |
| `resolve-pr-comments` | 47 | Working through review feedback |
| `session-*` | 63 | Init, resume, and logging across compaction |
| `agent-browser` | 37 | Driving a real browser |
| `technical-writing` | 34 | Clarity pass, distinct from voice |
| `hunk` | 25 | Line-level staging and non-interactive rebase |
| `advisor` + `advisor-review` | 34 | Escalating a judgment call to a stronger model |

Sub-agents run far more often than skills do, because most real work fans out:

| Agent | Spawns |
|-------|-------:|
| `general-purpose` | 1,175 |
| `Explore` | 592 |
| `code-reviewer` | 202 |
| `security-auditor` | 168 |
| `function-analyzer` | 118 |
| `spec-compliance-checker` | 49 |
| `Plan` | 42 |

Two things stand out. The writing skills are near the top, which is not what you
would guess from a list of engineering tools, but a commit message or a PR
description is written on nearly every task. And review runs adversarially by
default: `code-reviewer`, `security-auditor`, `differential-review`,
`sharp-edges`, and `insecure-defaults` together account for more invocations
than any single feature-building workflow.

## Architecture

```mermaid
graph TB
    Main[Claude Code Core]

    subgraph Writing["Writing"]
        direction LR
        W1[roasbeef-prose]
        W2[technical-writing]
        W3[incremental-commit]
    end

    subgraph Review["Review &amp; Security"]
        direction LR
        R1[differential-review]
        R2[sharp-edges]
        R3[insecure-defaults]
        R4[variant-analysis]
        R5[review-loop]
    end

    subgraph Testing["Testing"]
        direction LR
        T1[property-based-testing]
        T2[mutation-testing]
        T3[test-refine]
    end

    subgraph Escalation["Escalation"]
        direction LR
        E1[advisor]
        E2[advisor-review]
        E3[orchestrate]
    end

    subgraph Domain["Bitcoin / Lightning"]
        direction LR
        D1[lnd]
        D2[eclair]
        D3[lnget]
        D4[go-debug]
    end

    subgraph Infra["Infrastructure"]
        direction LR
        Sub[Subtrate Messaging]
        Ses[Session System]
        Hooks[Hook System]
    end

    Main ==> Writing
    Main ==> Review
    Main ==> Testing
    Main ==> Escalation
    Main ==> Domain
    Infra -.->|lifecycle| Main

    classDef core fill:#e1bee7,stroke:#4a148c,stroke-width:3px,color:#000
    classDef writing fill:#dcedc8,stroke:#33691e,stroke-width:2px,color:#000
    classDef review fill:#ffccbc,stroke:#bf360c,stroke-width:2px,color:#000
    classDef testing fill:#fff9c4,stroke:#f57f17,stroke-width:2px,color:#000
    classDef escalation fill:#c5cae9,stroke:#1a237e,stroke-width:2px,color:#000
    classDef domain fill:#b2dfdb,stroke:#004d40,stroke-width:2px,color:#000
    classDef infra fill:#f8bbd0,stroke:#880e4f,stroke-width:2px,color:#000

    class Main core
    class W1,W2,W3 writing
    class R1,R2,R3,R4,R5 review
    class T1,T2,T3 testing
    class E1,E2,E3 escalation
    class D1,D2,D3,D4 domain
    class Sub,Ses,Hooks infra
```

## Skills

Thirty skills, grouped by what they are for. Most are model-invoked when the task
matches; a few are deliberately opt-in only.

### Writing

| Skill | Description |
|-------|-------------|
| `roasbeef-prose` | The voice: cadence, idioms, "In this commit, we...". Wins over clarity rules on any conflict |
| `technical-writing` | The clarity layer, from Pinker plus Google's style guide. Counters against dense prose, invented metaphors, and writing that performs |
| `incremental-commit` | Carve a diff into atomic commits, each with a message that explains why |
| `slide-creator` | Written content into slide images |
| `explainer-video` | Script to voiceover to rendered mp4 |

### Review and security

The first three come from the [Trail of Bits plugin](https://github.com/trailofbits/claude-plugins)
rather than from `skills/`, and together they are the most-used review path here.

| Skill | Description |
|-------|-------------|
| `differential-review` | Security-focused review of a diff, with blast radius and regression checks |
| `sharp-edges` | Footgun APIs, dangerous configuration, misuse-resistance |
| `insecure-defaults` | Fail-open defaults and hardcoded secrets |
| `variant-analysis` | Find more instances of a bug you just found |
| `review-loop` | Adversarial review, triage, and fix until a cold verifier signs off |
| `agentic-code-reasoner` | Execution-free deep analysis with a reasoning certificate |

### Testing

| Skill | Description |
|-------|-------------|
| `property-based-testing` | Invariant-driven tests, `rapid` for Go |
| `mutation-testing` | Validate test strength by mutating the code under test |
| `test-refine` | Cut trivial tests, strengthen weak assertions, close branch gaps |
| `agent-ci` | Run GitHub Actions locally before pushing |
| `ci-loop` | Watch a CI run to completion, classify failures, remediate |

### Escalation and orchestration

| Skill | Description |
|-------|-------------|
| `advisor` | Consult a stronger model on a judgment call from a cheaper session |
| `advisor-review` | Final adversarial audit of finished work |
| `orchestrate` | Expensive planner decomposes, cheap workers execute in parallel, planner synthesizes |

### Bitcoin and Lightning

| Skill | Description |
|-------|-------------|
| `lnd` | Lightning Network Daemon in Docker, RPC, channels, regtest |
| `eclair` | ACINQ's Eclair in Docker, API, payment channels |
| `lnget` | Fetch L402-protected URLs that require Lightning payments |
| `go-debug` | Interactive Delve debugging driven through tmux |

### Tooling

| Skill | Description |
|-------|-------------|
| `substrate` | Agent mail, identity, review requests |
| `hunk` | Line-level staging and non-interactive rebase |
| `agent-browser` | Browser and Electron automation |
| `agent-cli` | Design and review CLIs meant for agents to consume |
| `frontend-design` | Distinctive production-grade UI |
| `shadcn` | shadcn/ui components and registries |
| `nano-banana` | Image generation and editing via Gemini |
| `litbucket` | Publish static artifacts to an internal address |
| `herdr` | Terminal multiplexer control for coding agents |
| `skill-creator` | Meta-skill for writing new skills |
| `codify` | Turn an agent misbehavior or a correction into a hook, CLAUDE.md rule, or skill |

## Sub-agents

Specialized agents that run in their own context window, so a deep investigation
does not consume the main loop's budget.

| Agent | Purpose |
|-------|---------|
| Architecture Archaeologist | Codebase analysis with Mermaid diagrams |
| Code Scout | Fast targeted analysis, time-boxed |
| Code Reviewer | PR review tuned for Bitcoin and Lightning p2p code |
| Security Auditor | Vulnerability hunting with proof-of-concept development |
| Test Engineer | Test generation with property-based testing and fuzzing |
| Documentation Double-Checker | Verify docs against the actual code |
| Go Debugger | Delve and tmux |
| Debug Chronicler | Turn a debugging session into a runbook |
| Mutation Tester | Mutation analysis for test quality |
| Design Iterator | Screenshot, analyze, improve, repeat |

## Subtrate and mission control

[Subtrate](https://github.com/roasbeef/subtrate) is the command center for
running more than one agent at a time. It solves the two problems that make
multi-agent work painful: agents cannot talk to each other, and they lose their
identity when context compacts.

This is the piece beefstack pairs with most closely, and `substrate` is the
single most-invoked skill here at 326 calls.

### Mission control mode

The web UI at `http://localhost:8080` is a zoomable canvas rather than a list.
Every running agent is a card you can pan and zoom around, Prezi style. From
there you can watch agents work in real time, read and answer their mail, drop a
screenshot or mockup straight onto a card so it arrives in that agent's inbox,
and see who is active, idle, or offline at a glance.

That matters once a task is fanned out across a fleet. Instead of tabbing
between terminals and losing track of which agent is blocked on what, the whole
run is one board. Agents that need a decision surface it as mail; you answer
from the canvas; they carry on. Reviews requested with `substrate review request`
land there too, so the review cycle happens on the same surface as the work.

### Core mechanics

- **Identity**: persistent codenames in the form `CodeName@project.branch`,
  auto-generated on first use and restored across compaction by the
  PreCompact and SessionStart hook pair.
- **Mail**: async threaded messaging with priorities, per-recipient state, and
  full-text search. `substrate send-diff` posts a branch diff with syntax
  highlighting; `--attach` embeds an image inline.
- **Liveness**: heartbeats on session start, prompt submit, and during stop
  polling, giving active, idle, and offline status.

Subtrate is the primary channel for reaching a human outside a blocking prompt.
Status updates go through `substrate send` rather than to a console nobody is
watching.

## Session management

Sessions preserve progress, decisions, and discoveries across context
compaction, so a long task resumes instead of restarting.

```
/session-init  ->  (active work)  ->  /session-close --complete
                       |
                 (compaction)
                       |
               /session-resume
```

- Per-project tracking in `.sessions/` directories
- Automatic state preservation via the PreCompact hook
- Structured logging: progress, decisions, discoveries, blockers
- Full documentation in [SESSIONS.md](SESSIONS.md)

## Hooks

Shell scripts bound to Claude Code lifecycle events. These are what make
identity and session continuity work without the model having to remember.

### Substrate hooks

- **SessionStart**: heartbeat, inject unread mail
- **UserPromptSubmit**: silent heartbeat, check for new mail
- **Stop**: long-poll, keeping the agent alive for inter-agent work
- **SubagentStop**: one-shot mail check, then exit
- **PreCompact**: save identity for restoration afterward

### Context hooks

- **SessionStart** (`load_project_context.sh`): load project context and active sessions
- **UserPromptSubmit** (`context_enhancer.py`): inject context based on keywords
- **PreCompact** (`save_important_context.sh`): archive context before compaction

## Directory structure

```
~/.claude/
├── CLAUDE.md              # Global instructions for all projects
├── README.md              # This file
├── SESSIONS.md            # Session system documentation
├── settings.json          # Hooks, permissions, sandbox, model
├── skills/                # 30 skills
├── agents/                # 11 sub-agent definitions
├── commands/              # Slash command definitions
├── hooks/                 # Lifecycle hook scripts
│   ├── substrate/         # Agent messaging
│   ├── sessionstart/
│   ├── precompact/
│   └── userpromptsubmit/
├── projects/              # Per-project state and transcripts
├── plans/                 # Plan files from planning sessions
└── plugins/               # Plugin cache
```

## Getting started

1. Clone to your home directory:
   ```bash
   cd ~ && git clone https://github.com/Roasbeef/beefstack.git .claude
   ```

2. Make hook scripts executable:
   ```bash
   chmod +x ~/.claude/hooks/**/*.sh ~/.claude/hooks/**/*.py
   ```

3. Install Subtrate hooks:
   ```bash
   substrate hooks install
   ```

4. Share the instructions and skills with other agents. `CLAUDE.md` doubles
   as the `AGENTS.md` that Codex and the rest read, so link rather than copy
   to keep them from drifting:
   ```bash
   mkdir -p ~/.agents
   ln -sfn ~/.claude/CLAUDE.md ~/.codex/AGENTS.md
   ln -sfn ~/.claude/CLAUDE.md ~/.agents/AGENTS.md
   ln -sfn ~/.claude/skills ~/.agents/skills
   ```

5. Review `settings.json` for hook paths, permissions, model, and sandbox
   configuration. Note that `permissions.defaultMode` is set to
   `bypassPermissions` here, which suits a sandboxed personal setup and may not
   suit yours.

See the [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code/overview)
for general setup and the [hooks guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)
for hook configuration.
