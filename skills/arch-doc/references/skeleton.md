# Skeleton templates

Each template is a shape, not content. Replace every placeholder with real
identifiers from the code. Delete sections the subject lacks.

## Intro

```markdown
# <Subject> Architecture

<Project> keeps <the data or state> in step with <the outside world>. This
document describes the components that do that work, who owns which state, and
how a request moves from <entry point> to <durable result>. It reflects the
code at <commit or PR range>.

For <related topic>, see [<doc>.md](<doc>.md).
```

## Components

Use `flowchart TB` with one subgraph per component. Put the file in the
subgraph title. Label edges with what crosses them.

````markdown
```mermaid
flowchart TB
    subgraph A["TypeA (a.go)"]
        direction TB
        a1["goroutine handler<br/>drives X"]
        a2["Public API<br/>Foo, Bar"]
    end

    subgraph B["pkg/b"]
        direction TB
        b1["Controller<br/>policy"]
        b2["ManagerActor<br/>owns FSM"]
    end

    a1 -- "request, reply" --> b1
    b1 --> b2
    a2 -- "batch" --> b2
```
````

Then the table. Every row needs both columns filled; if a type owns nothing
mutable, say so ("Any state of its own" is a valid Owns entry only as a
negative in the other column).

```markdown
| Package or type | Owns | Does not own |
| --- | --- | --- |
| `TypeA` | <state, I/O, ordering it controls> | <what a reader might assume it owns> |
```

## Startup

````markdown
```mermaid
sequenceDiagram
    autonumber
    participant App as Caller
    participant X as X
    App->>X: New(cfg)
    alt cfg.Option set
        X->>X: <branch A step>
    else default
        X->>X: <branch B step>
    end
    opt cfg.Feature set
        X->>X: <optional step>
    end
    Note over X: <why the order matters>
```
````

## State machine

Name the real states and the real functions. State what changes.

````markdown
```mermaid
stateDiagram-v2
    [*] --> Queued: Plan,<br/>Replan (new ID)
    Queued --> Owned: Assign<br/>(epoch + 1)
    Owned --> Active: Start
    Active --> Staged: Complete, valid,<br/>owner and epoch match
    Active --> Failed: Complete, invalid
    Staged --> Committed: CommitReady
    Committed --> [*]
    Failed --> [*]: replanned under a new ID
```
````

After it, add: what bypasses the machine, and what invariant spans it (a
lease or epoch rule, an ordering rule).

## Pipeline flowchart

Start at the trigger, end at the durable result, show every failure branch.

````markdown
```mermaid
flowchart LR
    plan["Plan<br/>Controller.Plan"]
    recv["Receive<br/>Session.Finish<br/>Validate"]
    commit["Commit<br/>Store.Write"]

    plan --> recv --> commit
    recv -- "invalid" --> quarantine["Quarantine peer,<br/>replan"]
    commit -- "store error" --> retry["1s retry"]
    retry --> commit
```
````

Then a numbered list with bold leads:

```markdown
1. **Plan.** `continueSync` calls `Controller.Plan` while ... It first
   reconciles ... then creates ...
2. **Receive.** `Validate` checks only structure: ...
```

## Peer or connection states

Same `stateDiagram-v2`. Follow with the rule the arrows do not show (for
example, which states allow work to be taken away).

## Storage

```markdown
| Interface | <Backend 1> | <Backend 2> |
| --- | --- | --- |
| `Store` | <file or bucket> | <table> |
```

````markdown
```mermaid
erDiagram
    chain_tips {
        int chain_type PK "0 = blocks, 1 = filters"
        blob tip_hash
        int tip_height
    }
    block_headers {
        int height PK
        blob block_hash UK
        blob raw_header "80 bytes"
    }
```
````

Add relationship lines (`a ||--o{ b : "has"`) only where a foreign key
exists. State where there is none and why. Then one paragraph each on: what
one transaction covers, any cache (size, fill width, invalidation), and pragma
or durability settings that change what a crash loses.

For a migration or import, a `sequenceDiagram` with participants for the
entry point, the importer, each source, and the target, followed by one
sentence on retry behaviour and one on what is left in place.

## Concurrency

```markdown
| Goroutine | Owns |
| --- | --- |
| `handler` | <state>; the only caller of <actor> |
| `<actor>`, one per peer | <state> |
```

Then prose rules, each a short paragraph: what timers and callbacks may do
(post a message, never touch state), deadlines on cross-goroutine calls, and
the failure semantics callers get wrong.

## Known gaps

A short bullet list: subsystems not covered, behaviours not confirmed by
running the code, claims that rest on a reader's summary.
