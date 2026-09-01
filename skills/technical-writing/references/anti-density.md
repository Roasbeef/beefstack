# Anti-Density — Mechanical Checks Against Dense, Performed Prose

The other six reference files give you principles and judgment. This one gives you
**counters and grep targets**, because the characteristic failure of a strong
model is not that it breaks the principles. It is that it satisfies every
principle locally while producing a paragraph no one can read on the first pass.

Sourced from Google's developer documentation style guide and its Technical
Writing courses, reconciled against Pinker where the two disagree. Google's guide
states its own status plainly:

> "As always, it's fine to deviate from our guidance if that serves your readers
> better."

Treat every rule below as a **trigger that forces a judgment**, never as a
judgment. The trigger fires; the window heuristic decides. Where a Google rule
collides with `roasbeef-prose`, the voice skill wins, and the collisions are
listed at the bottom so no one "restores" them later as a fidelity fix.

## The master detection question

> **Delete the sentence. Does a fact disappear, or only a feeling?**

If only a feeling disappears (rhythm, gravity, wit, the sense that the writer is
formidable), the sentence was performance. Cut it, or flatten it to the fact
underneath. This one question resolves most of §4 and §5 below.

> **"Fact" includes intent.** A sentence giving the *reason* for a decision ("we
> allocate up front because the incremental path reallocated on every header")
> states a real thing about the world even though no benchmark verifies it. So do
> a stated tradeoff, a rejected alternative, and a scope limit. None of these are
> performance, and `roasbeef-prose` requires the why over the what in a commit or
> PR body. The test is aimed at the sentence that adds **conviction** without
> adding **content**, not at motivation, and not at a connective doing real
> coherence work.

## 1. Metaphor: the discriminator, not a ban

Most of a field's core vocabulary *is* figurative language that died into a plain
name. Banning figurative language wholesale would strip out *handshake*, *leak*,
*tree*, and *backpressure*.

Google's word list sorts figurative-origin words into two very different
dispositions, and the difference between them is the useful part:

- **Replace outright, with a precise term.** *blast radius* → affected area.
  *break-glass* → emergency access. *nuke* → remove. *hang* → stops responding.
  *pets versus cattle* → persistent versus dynamic. *dumb down* → simplify. These
  have no fixed meaning; each reader reconstructs the picture differently.
- **Usable, but define it.** *canary*, *cold standby*, *hot standby*, *hotspot*,
  *nonce*. Google's disposition here is "avoid the jargon when possible, and if
  you use it, define it on first use and use it consistently."

Both sets began as metaphors. The first never acquired a fixed meaning, so it gets
replaced. The second names something specific the field agreed on, so it is
learnable once and reusable. That is the distinction worth stealing.

> **The discriminator.** Would this word, with this meaning, appear unexplained in
> the field's glossary, a textbook, or another engineer's pull request?
>
> - **Yes → it is vocabulary.** Use it plainly and repeatedly. No disclosure, no
>   limit sentence, no cap.
> - **No, the reader needs *you*, in *this* paragraph, to explain what the word
>   means here → it is a live invented metaphor.** Apply the rest of this section.

Secondary test: has the term lost its literal, physical sense for practitioners?
Nobody pictures water at "memory leak" or hands at "TLS handshake." A word that
has died this way is a name, not a live analogy. Stop treating it as one.

> **Where this departs from Google, deliberately.** Google attaches "define on
> first use" to the whole second bucket, because it writes for a mixed, often
> non-native, often non-expert readership. That condition is **gated on audience
> here**, per Google's own deviation clause: for an audience of Bitcoin and
> Lightning developers, *sighash*, *HTLC*, and *nonce* need no gloss, and glossing
> them is its own kind of condescension. Define a term when this reader actually
> needs it, not by reflex. The bucket-sort is what transfers; the definition
> mandate is not.

### Detecting a live metaphor

**Lexical triggers** (grep these): `think of X as` · `is like` · `acts like` ·
`imagine` · `picture` · `essentially a` · `basically a` · `you can view this as` ·
`in a sense, X is a`

**The non-lexical trigger**, which matters more, because the worst offenders carry
no comparison word at all: *does this sentence sustain an image or a scene that is
not literally true of the system?* Extended personification is the usual disguise:

> "The garbage collector sweeps through memory, evicting the unwanted tenants
> before the next guest arrives."

No trigger phrase fires there, and it is still a full invented frame (tenants,
eviction, guests) standing where the mechanism belongs. Ask the question of every
paragraph, not just of the grep hits.

Every hit is a candidate, not yet a verdict. Run the discriminator first.

**Not a candidate:** a short parenthetical aside naming a familiar real-world
object for one clause ("the preimage acts as a receipt"). That is an idiomatic
gloss, not a paragraph-level frame, and it does not need the full procedure below.
The procedure is for a figure that carries the explanation.

### The delete-and-reread test

For every candidate that resolves to a live metaphor, **delete the sentence and
reread the paragraph.**

- **No factual claim went missing** → it was decoration. It stays cut. No
  replacement is needed.
- **A claim did go missing** → that claim was never stated literally, which is the
  actual bug. Write the literal sentence, naming the real actors and actions.
  Then decide whether the metaphor still adds anything. Usually it will not.

### Rules for any metaphor that survives

1. **Literal first.** State the mechanism in the field's own words, then offer the
   comparison as compression for a reader who already has the claim. A
   metaphor-first sentence costs two translation passes: decode the frame, then
   map it onto a mechanism the reader still does not have. That is added load,
   not reduced load.
2. **One frame, sustained.** At most one invented figure per concept, and never a
   second unrelated vehicle within two sentences or the same paragraph. Reuse the
   same vehicle wherever the concept recurs. This is the topic-string rule from
   `coherence.md` applied to figurative vocabulary.
3. **Label it and bound it.** Never let a figurative sentence read as literal
   description. Write the limit in the same breath: *"Unlike a ___, the actual
   system ___."* **If you cannot write that limit sentence in one breath, you do
   not understand the analogy well enough to use it. Cut it.**
4. **Check for leakage.** Reread the two sentences after the metaphor. If a later
   sentence quietly relies on a property the vehicle has but the system does not
   (auctions have winners and losers; waiting rooms enforce order), the frame is
   now driving the explanation instead of illustrating it. Rewrite it literally.

### Worked examples

**Decorative, deletable in full.** The mechanism was never stated literally.

> Before: "Think of the mempool as a waiting room where the seats keep being
> auctioned off to the highest bidder, and once the music stops, whichever
> transactions grabbed a chair get swept into the next block."
>
> After: "The mempool holds unconfirmed transactions. Miners typically select the
> highest-fee-rate transactions first when building a block, so a low-fee
> transaction can sit unconfirmed indefinitely when demand is high."

**Conventional vocabulary, over-explained with an invented layer.**

> Before: "The TLS handshake is like two spies exchanging a secret code phrase in
> a shadowy alley before agreeing to trust each other."
>
> After: "In the TLS handshake, the client and server negotiate a shared session
> key. Each side proves possession of its private key by signing or decrypting a
> value the other side can check, without transmitting the key itself."

"Handshake" is already vocabulary and needs no analogy. The invented layer also
misleads: TLS rests on certificate-and-signature proof, not on trust between
anonymous parties.

**Leakage with the causal direction reversed.**

> Before: "A Merkle tree is like a family tree, where each ancestor's DNA is a
> fingerprint of all its descendants below it."
>
> After: "In a Merkle tree, each parent node's hash is computed from its
> children's hashes, so the root hash is a compact fingerprint of every leaf
> beneath it. Changing any single leaf changes the root."

"Tree" is dead vocabulary and needs nothing. The invented layer leaks: family
trees derive descendants from ancestors, but a Merkle tree derives the root from
the leaves. The analogy teaches the reader the causal direction backwards.

### The illustration parallel

Google cites Sung & Mayer (2012): providing **any** graphic, good or bad, makes
readers like a document more, but **only instructive graphics help them learn.**
The same false positive applies to prose. "This reads well" is not evidence the
metaphor taught anything. Liking and learning come apart.

This also supplies a third option the delete test does not: when a mechanism
genuinely resists a one-paragraph literal description, **draw it** (a sequence
diagram, a state machine, a before/after sketch of the data structure) rather
than reaching for an analogy from another domain. Google scopes its own advice to
diagrams rather than to this choice, so treat the substitution as an extension,
not a sourced claim.

## 2. Sentences: numeric triggers

`syntax.md` gives you the universal escape hatch, "when a sentence goes unruly,
split it in two," but no way to know when unruly has arrived. Google's stated
rule is qualitative:

> "Focus each sentence on a single idea, thought, or concept. Just as statements
> in a program execute a single task, sentences should execute a single idea."

These are the operational proxies for "a single idea":

| Trigger | Threshold | Action |
|---|---|---|
| **Independent** clauses, each with its own subject | **≥ 3** in one sentence | Presumptively three ideas welded together. Split. |
| Word count | **> 30** | A smoke alarm, not the rule. Stop and run the clause count. |
| The period test | A period could stand at **≥ 2** points, leaving complete sentences | Split. |
| Nouns modifying a noun | **> 2** | Break the stack apart with a preposition. |
| Stacked qualifiers on one clause | **> 1** | Keep one real qualifier; make it concrete. |

> **Count subjects, not verbs.** Coordinate predicates sharing one subject are a
> single idea with three parts, not three ideas: *"The reconciler watches the
> desired state, diffs it against reality, and issues the necessary patches"* is
> one topic doing three things in sequence, and splitting it would destroy the
> topic string that `coherence.md` asks you to hold. What the trigger is hunting is
> **subject-hopping**: three different actors, each with its own verb, welded into
> one sentence. That is where the reader loses the thread.

Word count alone decides nothing. A 35-word sentence with one clean idea in a
right-branching tail is fine. A 20-word sentence hopping between three subjects is
not.

**The noun-stack cap is exactly two.** Google: "Don't use more than two nouns as
modifiers of another noun." This tightens the "~2–3" in `syntax.md`.

> Before: "the client session key derivation nonce cache"
>
> After: "the nonce cache for deriving client session keys"

**Where a list is genuinely hiding.** Google: "Inside many long technical
sentences is a list yearning to break free." The signals are *or* joining three or
more parallel items, sequence words (*then, next, first, second, finally*) inside
one sentence, and three or more comma-separated parallel phrases.

Note the escalation order, which matters for voice (see §7): **split into two or
three sentences first.** Escalate to a numbered list only for genuinely
sequential executable steps, and to a bulleted list only for a reference
enumeration of three to five parallel options. The density win lives in the
decomposition, and you get it either way. The list is a formatting choice made
afterward, not the fix itself.

## 3. Paragraphs: numeric triggers

`coherence.md` argues, correctly, that "there is no such thing as a paragraph."
That is right as theory and useless as an instruction, because it gives an agent
no moment at which to stop and check. Google supplies the moment:

- **At 6 sentences**, stop and re-justify that this is genuinely still one idea.
  Google: "A paragraph longer than 5 or 6 sentences is often an indication that
  the paragraph is trying to convey too much information," with the explicit
  allowance that "it can be OK if it's longer than 6 sentences as long as it's
  still about one idea."
- **At 8 sentences**, split regardless.
- **Point in sentence 1.** "Busy readers focus on opening sentences and sometimes
  skip over subsequent sentences." If the paragraph's actual claim lands in
  sentence 3 or later, move it up.

> **Ship this clause with the counters or they backfire.** Google: "Don't make
> sentences longer in order to limit the number of sentences in a paragraph."
> Without it, the paragraph ceiling manufactures exactly the sentence density it
> exists to cure.

Do not overcorrect either: "If your document contains plenty of one-sentence
paragraphs, your organization is faulty." Splitting is not chopping.

## 4. Anthropomorphism

The commonest live-metaphor vector in generated prose, because it hides inside
ordinary-looking verbs rather than announcing itself with "think of X as."

Google's rule: "Don't attribute human qualities to software or hardware." It is a
**precision** failure as much as a tone failure. "The delimiter *tells* the
splitter where to break" does not say how; "*specifies*" does the same work and is
literally true.

| Anthropomorphic | Mechanical |
|---|---|
| tells | specifies, indicates |
| sees | detects |
| wants, needs | requires |
| knows, remembers | stores, caches |
| decides, chooses | selects |
| figures out, works out | computes, determines |
| is happy, is unhappy | (name the actual state) |
| thinks, believes | (name the value it holds) |

**Detection test:** swap the verb for a mechanical one. If nothing is lost, the
human verb was decorative.

**Exceptions: lexicalized terms of art.** These are dead metaphors doing
plain-vocabulary work, and no engineer parses them as claims about feelings:
*blocked, waiting, starvation, sleeping, orphan process, zombie process, daemon,
deadlock, race condition, greedy algorithm, listener, handler,* and *the server
listens on a port*, *a handshake*.

**Also exempt: a word in the table that is a formal term in the protocol you are
describing.** In Paxos, Raft, and PBFT a process **decides** a value, and that is
the literature's word with a precise meaning; "selects" is not a synonym for it.
The same courtesy extends to any consensus, cryptographic, or protocol term where
the anthropomorphic-looking word *is* the specification's word. Run the same test
as §1: if the term would appear unexplained in the field's own glossary, it is
vocabulary, and this section does not apply to it.

The test for the exception list: is there an equally precise, equally standard
non-anthropomorphic replacement already in common use? For "sees" there is
("detects"), so cut it. For "starvation" there is not, and paraphrasing it would
make the sentence *less* precise for an engineering audience.

**The trap.** A term of art is not a licence to extend the personification:

> Before: "The deadlocked process is patiently waiting for its turn."
>
> After: "The deadlocked process never acquires the lock."

Keep "deadlocked." Cut the narrative riding on its coattails.

## 5. Performance: the show-off taxonomy

`classic-style.md` bans "professional narcissism" in the abstract. These are the
shapes it actually takes. Every one is caught by the master detection question at
the top of this file.

| Construction | Detector | Fix |
|---|---|---|
| **Elegant variation** | Same referent, different noun across sentences | One name, reused, or a pronoun |
| **Aphorism tax** | Delete it: only a feeling disappears | Cut, or state the specific claim underneath |
| **Triad reflex** | Items 2 and 3 restate item 1 louder | One clause with a real number or mechanism |
| **Portentous negation** | No reader ever held belief X | Drop the "not X"; state Y directly |
| **Hype inflation** | One bug report or benchmark could falsify it | The number or mechanism that earns the adjective |
| **Hedge sprawl** | More than one qualifier stacked on one claim | One real qualifier, made concrete |
| **Grandiosity of scope** | Still true with every scale-adjective removed | State the mechanism alone |

**Elegant variation** is the one to watch hardest, because it is `coherence.md`'s
topic-string rule broken deliberately, for style points:

> Before: "The reconciler watches the desired state. The controller then diffs
> this against reality, and the orchestrator issues the necessary patches."
>
> After: "The reconciler watches the desired state, diffs it against reality, and
> issues the necessary patches."

One component, one name. "Controller" and "orchestrator" made the reader wonder
whether there were three.

**Aphorism tax:**

> Before: "Correctness is not a feature; it is a floor. Without it, nothing else
> you build matters."
>
> After: "Merge only after the tests pass."

**Triad reflex:**

> Before: "This isn't just a cache. It isn't merely an optimization. It's a
> fundamental rethinking of how the system remembers."
>
> After: "This is a read-through cache in front of the primary database."

**Portentous negation.** It earns its keep only when the reader genuinely held
belief X. Used decoratively it invents a strawman opinion nobody had, purely to
knock it down:

> Before: "The retry logic is not a workaround. It is the architecture."
>
> After: "Removing the retry logic breaks normal operation, not just edge cases.
> Under regular load, 12% of requests to the payments service time out and depend
> on a retry to succeed."

## 6. Word-level triggers

### The condescension rule

Google names these as things to avoid in procedures: *simply, easy, easily, just,
quickly, obviously, it's that simple.* The reasoning is worth stating, because it
is not a style preference:

Calling a step simple is **a claim about the reader's mental state**, and it is
lose-lose. If the step *is* easy for this reader, the word adds nothing they did
not already know. If it is *not* easy, and they are reading documentation
precisely because something was not obvious, the word tells them their difficulty
is a personal failing. The sentence stops informing and starts judging.

The fix is never to soften it to "not that hard." Delete the adjective and let the
instruction stand. If ease genuinely matters to the argument, **show** it (one
command, no branching, no prerequisites) rather than asserting it.

> **The `just` carve-out.** This rule targets *just* used to **minimize the
> reader's effort** ("just run the migration", "just flip the flag"). It does not
> touch the idiomatic or emphatic sense, which is a different word doing a
> different job: "Things Just Work™", "it just works", "that's just how the
> protocol is specified." `roasbeef-prose` names the first of those as a voice
> marker. Delete the minimizing *just*; leave the emphatic one alone.

### Substitutions

| Wordy or inflated | Plain |
|---|---|
| causes the triggering of | triggers |
| provides a detailed description of | describes |
| determine the location of | find |
| is able to, has the ability to | can |
| in order to | to |
| allows you to, enables you to | lets you |
| makes use of | uses |
| a number of | some, many |
| commence | start, begin |
| consequently | so |
| leverage, utilize | use (or "build on", when "use" is too generic) |
| there is a X that Ys | X Ys |
| please note, note that | delete; state the fact directly |
| and so on, etc. | list the items |
| performant | fast, accurate (with a number) |
| robust, seamless | name the specific capability |
| first-class citizen | name the concrete property |
| out of the box (figurative) | by default, with no setup |
| native (of software) | built-in |
| hang (of a program) | stops responding |
| runs [adverb] fast | the measurement |

**"There is / there are"** deserves its own line. Google: sentences that open this
way "marry a generic noun to a generic verb." Same for a generic verb with a real
actor nearby: "The exception occurs when dividing by zero" becomes "Dividing by
zero raises the exception."

### Kill `should`

One grep-able token that generates a whole class of hedgy compound sentence.
Route every instance four ways:

| Meaning | Write |
|---|---|
| A requirement | `must`, or a bare imperative |
| Optional best practice | "we recommend" |
| What the system does | a plain statement of fact |
| A variable outcome | `can`, `might` |

### Bare demonstratives

`this`, `that`, `these`, and `those` must be followed by the noun they refer to.
Never leave one standing alone as a subject. "This means…", "This suggests…",
"This approach…" are the commonest dense openers in generated prose.

Companion rule: if more than five words separate a pronoun from its noun, or
another noun intervenes, **repeat the noun.** Google's global-audience page also
licenses this directly: repeat words when the redundancy improves comprehension.
Repetition of a plain noun is invisible to a reader. Variation is not.

## 7. The revision order, and what yields to voice

**Fix organization before grammar.** Google states this for reviewing generated
text specifically: "We recommend fixing organizational issues before editing
grammar and style issues." A dense paragraph almost always has a structure bug
underneath it, and patching sentences merely relocates the density to the next
one. If any check in §2 or §3 fires **twice in one paragraph**, that paragraph
gets a rewrite, not a patch.

**Changing the context beats rereading.** `curse-of-knowledge.md` prescribes
putting a draft in a drawer, which an agent cannot do. The executable analogues:
read the rendered output rather than the raw buffer, read the paragraphs in
reverse order, or read only the first sentence of each paragraph as a structural
outline. Google's peer-review criterion is also sharper than "a real reader": the
editor "doesn't need to be a subject matter expert on the technical topic, but
they do need to be familiar with the style guide you follow."

**Write down the audience before drafting:** their role, what they already know,
and what they must learn. Google's sharpest point here is that **proximity decays
with time.** A reader can share your role and still have forgotten a system they
have not touched in six months, so "expert" is not a property of a person. It is
a function of how recently they were close to this exact subject.

### Rules deliberately not imported

These are live in Google's guide and **overridden here.** They are listed so a
future editor does not import them as a fidelity fix.

| Google says | Why it loses |
|---|---|
| Prefer bulleted lists and tables over prose | `roasbeef-prose` makes prose the default and names bullet-heavy structure as an LLM tell. Take the escalation ladder in §2 instead: split into sentences first. |
| (Pinker, not Google) The em-dash is a prime attention tool | Banned absolutely by the voice. The full override note lives in `mechanics.md` §9; use the colon, the semicolon, the comma, or a new sentence. |
| Keep parentheticals short; don't put important information in them | Split. The voice's spoken-interjection asides stay, and stay frequent. Google wins only on the narrow load-bearing case: never hide a required caveat, a prerequisite, or a correctness-critical qualifier inside parentheses. If the reader would be wrong without it, it isn't an aside. Promote it. |
| Delete *just* | Only the minimizing sense. The emphatic and idiomatic senses ("Things Just Work™") are voice. See §6. |
| "Refer to your audience as 'you', not 'we'" | "In this commit, we…" is the voice's signature. Dropped outright rather than carved out. |
| Every "we" needs a named organization | Same. |
| Avoid *e.g.*, *i.e.*, *etc.* | Named voice features. The density argument is weak: Latin abbreviations cost a translator, not a reader who knows them. |
| Avoid semicolons; split instead | The voice endorses semicolons. Combined with the em-dash ban, dropping them would leave no mid-sentence joining device at all. Keep the anti-density core only: two independent ideas default to two sentences. |
| Define jargon on first use | Gated on audience. Google assumes a mixed, often non-native readership; for an audience of Bitcoin and Lightning developers, *sighash*, *HTLC*, and *nonce* need no gloss. Google's own deviation clause authorizes this. |
| Ban humor | The voice's dry aside carries no explanatory load and can be deleted without losing a fact. What stays banned is the joke the reader must **decode to understand the mechanism**, which is the metaphor problem in §1 wearing a different hat. |
| No exclamation marks | Permitted, rare and earned. The rest of that rule (*simply, easily, just, obviously*) is kept in full. |
| Condition before instruction | Kept, but scoped in `syntax.md` to instructions and applicability gates. It is a scannability rule, not a weight rule: Google's own example front-loads the **heavier** clause. It never overrides end-weight in narrative prose. |
| Strip *now*, *currently*, *new* | Scoped to reference documentation about durable product state. A commit message is a time-anchored artifact, where "now" means "after this diff" and is a real claim. |
| Mandatory restrictive *that* / *which* | A schoolroom superstition per `usage.md`, stated by Google as house style with no comprehension argument. |
| Always keep optional relative pronouns | `syntax.md`'s conditional version wins: restore them where a wrong first parse is possible. Google's unconditional version adds words to every sentence, which fights the goal. |
| Punctuation inside quotation marks | `mechanics.md` follows logical nesting. Google's own exception for literal code strings swallows most technical cases anyway. |

**On excessive claims,** read Google narrowly. Its rule targets **comparative**
performance, security, and availability claims about a product you ship ("faster
than ExampleCorp", "guarantees zero downtime"). It does not touch a mechanism
claim. "Caching makes this faster" survives untouched, and must, because it is
`classic-style.md`'s flagship rewrite. Reading the rule broadly would reinstate
exactly the hedging that example exists to kill, and hedging is itself a density
symptom.
