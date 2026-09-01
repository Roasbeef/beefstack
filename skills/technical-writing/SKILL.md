---
name: technical-writing
description: Clear-writing guide distilled from Steven Pinker's "The Sense of Style," with mechanical checks from Google's developer documentation style guide. Use when writing or revising prose that must be clear to a reader — documentation, design docs, specs, explanations, essays, emails, reports, RFCs, release notes — or when asked to make writing clearer, tighter, less academic, or less jargon-laden. Activate for "make this clearer", "tighten this", "why is this hard to read", "edit this for clarity", or any prose-quality pass. Also activate when prose is dense, overwritten, or hard to parse on the first read: sentences packing three ideas, invented metaphors and analogies the reader must decode, anthropomorphized systems, or phrasing that shows off instead of informing.
---

# Technical Writing (The Sense of Style)

A practical guide to clear prose, distilled from Steven Pinker's *The Sense of
Style: The Thinking Person's Guide to Writing in the 21st Century* (2014), with
mechanical checks drawn from Google's developer documentation style guide. The
book reduces to one image and one cause, with four sets of consequences; Google
supplies the counters that turn them into something you can actually run.

Use this when **drafting** prose (write it right the first time) or **revising**
prose (run the revision pass at the bottom).

## Required first step: read every reference file

This file is only the map. The substance of the skill — the decision rules, the
tables, and the worked before/after rewrites you will actually apply — lives in
the reference files. **Before drafting or revising a single sentence, Read all
seven**, in one batch of parallel Read calls:

1. `references/classic-style.md` — the window metaphor in full; the taxonomy of
   styles and when classic style may be broken
2. `references/curse-of-knowledge.md` — the blind-spot mechanics; the external
   debugging methods
3. `references/coherence.md` — the coherence-relation table, connectives, and
   rewrites
4. `references/syntax.md` — garden paths, end-weight, center-embedding, with
   examples
5. `references/mechanics.md` — the passive decision rule, the officialese
   substitution table, punctuation as a parsing aid
6. `references/usage.md` — the myth-bust table and the real-rules table
7. `references/anti-density.md` — **the counters.** The metaphor discriminator,
   the sentence and paragraph thresholds, anthropomorphism, the show-off
   taxonomy, and the rules deliberately overridden by voice

They total about 1,600 lines, so reading all of them is cheap — and skipping
any of them is the known failure mode of this skill. The section summaries
below compress each file to a few bullets: enough to navigate, not enough to
apply. An edit made from a summary alone (auto-converting every passive,
stripping every hedge, "fixing" a usage superstition) is exactly the mechanical
misapplication the references exist to prevent. Do not write or edit any prose
until all seven files are in context.

> **If you read only one thing before drafting, read `anti-density.md`.** Files
> 1–6 describe what good prose is, and a strong model can satisfy every one of
> them locally while still producing a paragraph no one can read on the first
> pass. File 7 exists because that is *your* characteristic failure, not the
> reader's: sentences welded from three ideas, a fresh metaphor coined mid-
> paragraph that the reader must decode before reaching the claim, and phrasing
> built to be admired rather than understood.

## The one image: prose is a window onto the world

Classic style treats writing as a **clean window**: the writer has seen
something real and aims the reader's gaze at it. The reader is a **competent
equal** — smart, not a student to be lectured, not a judge to be appeased. The
writer has nothing to prove.

Everything that makes prose bad is a **smudge on the glass** — a place where the
words point at *themselves*, at the *writer's anxiety*, or at an *abstraction*,
instead of at the thing in the world.

> **Master heuristic.** For any sentence ask: *Is this a clean window onto a
> thing in the world, with a writer showing a reader something — or has it
> fogged into talk about the text, the writer's caution, or a concept about a
> concept?* Fix toward the window.

Write in classic style by default. Break it **locally and deliberately** — for a
real legal caveat, a genuine scientific limitation, or honest uncertainty — never
out of habit or insecurity. Details and the style taxonomy:
`references/classic-style.md`.

## The one cause: the curse of knowledge

The single best explanation for why good people write bad prose: **you can't
imagine what it's like not to know what you already know.** It is a cognitive
blind spot, not malice or laziness (Hanlon's razor applies). Because it operates
*beneath your awareness*, the feeling that something is "obvious" or "clear" is
the **symptom, not a defense**.

It surfaces as:
- **Unexplained jargon and acronyms** — spell out every acronym on first use.
- **Functional fixity** — naming the technical role instead of showing the thing
  ("an assessment word" vs. "the word TRUE or FALSE"). Show the thing.
- **Chunking** — stacking expert abstractions the reader can't unpack. Unpack one
  level.
- **Skipped steps** — the "obvious" intermediate the reader can't divine. Include it.

The reliable fixes are **external**, because you can't self-debug a blind spot.
"Just imagine your reader" *fails*. In order of reliability: show a draft to a
real reader like your audience → put it in a drawer and reread later as a stranger
→ read it aloud. Be clear without being condescending. Details:
`references/curse-of-knowledge.md`.

## Consequence 1 — coherence: stitch sentences into a train of thought

The reader receives only the linear **string** of words and rebuilds your **tree**
of ideas. Individually perfect sentences can still be an incoherent mess. Manage
the reader's mental model:

- **Given before new. Topic before comment. Light before heavy.** Anchor each new
  fact to something already in the reader's mind, placed at the *front*; land the
  new payload at the *end*.
- **Hold one consistent topic** in subject position across a passage. Use pronouns
  or repeat the noun — do **not** swap in synonyms ("the organelle", "the
  powerhouse") to seem varied.
- **Make the relation between adjacent sentences unambiguous.** *When in doubt,
  connect* — under-connecting (stripping *but / because / so / however* for false
  "brevity") is the systematic error, because the relation is obvious to you and
  not to the reader.
- **Prefer affirmatives.** Readers remember the proposition and drop the "not"
  tag; "X is not dead" can leave them believing "X is dead." Negate only what the
  reader was already inclined to believe.

Coherence-relation table, connectives, and rewrites: `references/coherence.md`.

## Consequence 2 — syntax: build sentences the reader's memory can parse

A sentence is a tree; the reader receives a string and reconstructs the tree one
word at a time through a narrow memory bottleneck. Lighten the load:

- **Right-branch by default** — hang the heaviest, most complex phrase at the
  *end* (end-weight). Front-loaded subordinate clauses hold the main clause hostage.
- **Never center-embed** — don't jam a clause into the middle of another. Fasten
  it to an edge or split the sentence.
- **Keep subject and verb close** — don't wedge long material between tightly
  bound words.
- **Kill garden paths** — restore the *that / which / who* you deleted for
  "brevity" when its absence invites a wrong first reading.
- **Parallel meaning → parallel syntax.** Don't vary structure capriciously across
  a list or coordination.
- **Explode noun-piles** (≤ 2–3 modifiers before a head noun) with prepositions
  and relative clauses.

Universal escape hatch: **when a sentence goes unruly, split it in two.** Garden
paths, end-weight, and examples: `references/syntax.md`.

## Consequence 3 — words and mechanics: the surface craft

- **Reverbify zombie nouns.** Nominalizations embalm verbs into lifeless nouns:
  `the cancellation of X` → `cancel X`; `make an appearance` → `appear`. Keep one
  only when it names an already-introduced topic so the next sentence can comment
  on it.
- **The passive is a legitimate tool — never auto-convert it.** Use it when the
  affected entity is the running topic, or when the agent is unknown, irrelevant,
  or heavy. It's wrong only when it hides a responsible agent ("mistakes were
  made") or breaks topic flow.
- **Cut compulsive hedges** (*somewhat, fairly, apparently, in part,
  presumably*) — but keep a qualifier that carries real scope. **Qualify, don't
  hedge:** spell out the actual condition under which the claim fails instead of
  sprinkling vague escape-words.
- **Strip metaconcepts** — concepts about concepts (*level, framework, process,
  perspective, approach, model, issue*). Name the act or object they wrap.
- **Trim officialese** — `for the purpose of` → `to`, `at this point in time` →
  `now`. Substitution table in the reference.
- **Intensifiers are disguised hedges** — prefer one vivid word: `very big` →
  `huge`. Cut tics (*actually, basically, really*).

Full tables, the passive decision rule, punctuation-as-parsing-aid:
`references/mechanics.md`.

## Consequence 4 — usage: tell real rules from superstitions

Not "anything goes," but reasoned judgment. A rule earns its keep only if it
serves the reader. **Don't enforce the superstitions:** split infinitives,
terminal prepositions, sentence-initial *and/but/because*, singular *they*,
restrictive *which*, *who* for *whom*, sentence-adverb *hopefully*, *less* with
measurements, the blanket passive-voice ban. **Do enforce the real ones:**
*its/it's*, parallel structure, subject-verb agreement, ambiguous pronoun
reference, dangling modifiers *that cause real ambiguity*, *literally*, true
malaprops (*lie/lay*, *flout/flaunt*).

Decision order when a dispute arises: **clarity first → consult data, not dogma →
diagnose the rule's pedigree (Latin-aping or schoolroom myth ⇒ ignore) → know
your audience** (in a sticklerish context, observe even a superstition to avoid
distracting the reader). Full myth-bust and real-rules tables:
`references/usage.md`.

## Consequence 5 — density: the counters that catch what judgment misses

Consequences 1–4 describe what good prose is. You can satisfy all of them
sentence by sentence and still hand the reader a paragraph they must read twice.
This consequence exists because that is the specific way a strong model fails.

- **Metaphor: discriminate, don't ban.** Field vocabulary (*handshake, leak,
  tree, backpressure, mempool*) is dead metaphor doing plain work — use it
  plainly. A frame you coin mid-paragraph is a live metaphor the reader must
  decode before reaching your claim. **Delete it and reread: if no factual claim
  went missing, it was decoration.** Any survivor needs its limit sentence.
- **Count what you can't feel.** ≥3 finite-verb clauses in a sentence, ≥2 places a
  period could stand, >2 nouns stacked before a head noun, 6 sentences in a
  paragraph. Each is a trigger that forces a judgment, not a verdict.
- **Strip perception, cognition, and desire from software.** *tells* → specifies,
  *sees* → detects, *wants* → requires, *knows* → stores. Keep the lexicalized
  terms of art (*deadlock, starvation, listener*), but don't let one become a
  foothold for extending the personification.
- **Performance is a smudge classic style doesn't name.** Elegant variation,
  dropped aphorisms, escalating triads, "not X but Y" where nobody believed X,
  and grandiosity. One test catches them all: **delete the sentence — does a fact
  disappear, or only a feeling?**
- **`simply`, `easily`, `just`, `obviously` are claims about the reader's mind,**
  and they're lose-lose. Delete them.

Counters, tables, worked rewrites, and the voice overrides:
`references/anti-density.md`.

## The revision pass

When revising existing prose, run these in order. Each maps to a reference file
you have already read in full (see "Required first step" above); if any of the
seven is not in context, stop and Read it before continuing.

0. **Organization before grammar.** Google states this for revising generated
   text specifically: *"We recommend fixing organizational issues before editing
   grammar and style issues."* A dense paragraph almost always has a structure bug
   underneath it, and patching its sentences merely relocates the density to the
   next one. If a paragraph trips the same check twice, rewrite the paragraph
   instead of repairing the sentence. → anti-density
1. **Window check (whole draft).** Where does the prose point at itself, the
   writer's caution, or an abstraction instead of the world? Cut metadiscourse
   ("In this section I will…"), apologies, professional narcissism. → classic-style
2. **Curse-of-knowledge sweep.** Spell out every acronym on first use. Replace
   functional labels with the concrete thing. Unpack stacked abstractions. Add the
   skipped "obvious" step. Where possible, get a real reader — or set it aside and
   reread as a stranger. → curse-of-knowledge
3. **Coherence sweep.** Check given-before-new ordering; one consistent topic per
   passage; an unambiguous connective between adjacent sentences; affirmatives over
   negations. → coherence
4. **Syntax sweep.** Find garden paths, center-embedding, subject–verb gaps,
   front-loaded heavy clauses, non-parallel lists, noun-piles. Split unruly
   sentences. → syntax
5. **Word/mechanics sweep.** Reverbify zombie nouns; justify or rewrite each
   passive; cut hedges and intensifiers; strip metaconcepts; apply the
   officialese→plain table. → mechanics
6. **Usage sweep.** Fix the real errors; stop "correcting" the superstitions;
   resolve disputes by clarity + audience. → usage
7. **Density and performance sweep.** Run the counters, then the delete test.
   → anti-density
   - **Metaphor.** Grep for *think of X as / is like / acts like / imagine /
     essentially a*. Run the discriminator on each hit: field vocabulary passes
     untouched; an invented frame gets deleted and the paragraph reread. Any
     survivor needs its "unlike a ___" limit sentence written.
   - **Sentences.** Flag ≥3 finite-verb clauses, or a period that could stand at
     ≥2 points. Split. Cap noun-modifier stacks at two.
   - **Paragraphs.** At 6 sentences re-justify, at 8 split, without padding
     sentences to dodge the count. Point in sentence 1.
   - **Anthropomorphism.** Swap *tells / sees / wants / knows / decides* for the
     mechanical verb, sparing lexicalized terms of art.
   - **Performance.** For each candidate sentence: delete it. Does a fact
     disappear, or only a feeling? Only a feeling means cut it.
   - **Words.** Route every `should` four ways. Give every bare *this* its noun.
     Delete *simply / easily / just / obviously*.

Don't apply the rules as a mechanical checklist over the master heuristic — the
window comes first. A rule yields whenever following it would fog the glass.

**But note which way that escape hatch cuts.** Every rule here yields to the
window; the counters in step 7 do not yield to your own sense that a sentence
reads well. That sense is the failure mode. A trigger firing does not make a
sentence wrong, but it does oblige you to make the judgment consciously rather
than let a dense sentence through because it sounded good.

## Composing with the voice skill

When `roasbeef-prose` is also active, **the voice skill wins on any conflict** —
em-dashes, prose over bullets, first-person plural, inline *e.g.*, parenthetical
asides, dry humor, the emphatic *just*, and unglossed domain jargon for an
audience that knows it. The override table at the bottom of `anti-density.md`
lists each with its reason; the em-dash case is argued in full at `mechanics.md`
§9. Consult them rather than re-deriving the resolution, and don't "restore" an
overridden rule as a fidelity fix to Pinker or to Google.

Google's guide licenses this itself: *"As always, it's fine to deviate from our
guidance if that serves your readers better."* It is a house style tuned for a
mixed, often non-native, often non-expert readership, not a theory of prose.
Pinker's cognitive arguments and the reader in front of you outrank it.
