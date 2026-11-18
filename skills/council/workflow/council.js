// NOTE: `meta` must be a pure literal. The Workflow tool rejects string
// concatenation, template interpolation, and variables in any field.
export const meta = {
  name: 'council',
  description:
    'Blind seats each weigh a set of options through one lens, then a judge who sees the packet and the ballots picks one',
  whenToUse:
    'Invoked by the /council skill once the caller has written a neutral packet for a load-bearing choice between options. Runs Deliberate (one read-only seat per lens, blind to each other) then Judge (one agent, sees the packet and the ballots, never the preference of the caller).',
  phases: [
    { title: 'Deliberate', detail: 'one seat per lens, blind to each other, read-only' },
    { title: 'Judge', detail: 'one judge weighs the ballots and picks an option' },
  ],
}

// args (from the skill's packet):
//   question   - the decision, in one sentence.
//   options    - [{ id, title, detail }, ...], two to four entries.
//   context    - goal, constraints, what was tried, file:line pointers.
//   criteria   - what a good outcome looks like, in priority order.
//   dir        - absolute path of the working tree the seats may read.
//   lenses     - optional [{ id, brief }, ...] replacing the default three.
//   seatModel  - optional model for the seats; omitted inherits the session.
//   judgeModel - optional model for the judge; omitted inherits the session.
const DEFAULT_LENSES = [
  {
    id: 'simplicity',
    brief:
      'Which option leaves the least machinery behind? Does any option make a failure mode unreachable instead of adding code that handles it? Count the moving parts each option adds and what each one must keep true.',
  },
  {
    id: 'risk',
    brief:
      'How does each option fail? For each failure say how likely it is, how bad it is, and whether it is silent. How hard is each option to back out of once built?',
  },
  {
    id: 'fit',
    brief:
      'Which option reaches the stated goal with the least work outside its scope? Which one matches how the surrounding code already does things, and what does each cost to build and to verify?',
  },
]

const {
  question,
  options,
  context = '',
  criteria = '',
  dir = '',
  lenses: suppliedLenses = null,
  seatModel = null,
  judgeModel = null,
} = args || {}

if (!question || !Array.isArray(options) || options.length < 2) {
  throw new Error('council: args need a question and at least two options')
}

const lenses = suppliedLenses && suppliedLenses.length ? suppliedLenses : DEFAULT_LENSES
const optionIds = options.map(o => o.id)

const packet =
  `Decision: ${question}\n\n` +
  `Options:\n` +
  options.map(o => `- [${o.id}] ${o.title}\n  ${o.detail}`).join('\n') +
  `\n\nContext:\n${context || '(none given)'}\n\n` +
  `What a good outcome looks like:\n${criteria || '(not stated; infer it from the context)'}\n`

const BALLOT_SCHEMA = {
  type: 'object',
  properties: {
    pick: {
      type: 'string',
      description: 'The id of the chosen option, or "write-in" for an option not in the packet.',
    },
    writeIn: {
      type: 'string',
      description: 'Only with pick "write-in": the option, concretely enough to build.',
    },
    ranking: {
      type: 'array',
      items: { type: 'string' },
      description: 'All option ids, best first.',
    },
    fatal: {
      type: 'array',
      description: 'Flaws that rule an option out, each with evidence.',
      items: {
        type: 'object',
        properties: {
          option: { type: 'string' },
          claim: { type: 'string' },
          evidence: { type: 'string', description: 'file:line, or the command run and what it showed.' },
          verified: { type: 'boolean', description: 'True only if confirmed by reading the code or running something.' },
        },
        required: ['option', 'claim', 'evidence', 'verified'],
      },
    },
    rationale: { type: 'string', description: 'Three to five sentences on why the pick wins through this lens.' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    wouldChange: { type: 'string', description: 'The fact that, if true, would change the pick.' },
  },
  required: ['pick', 'ranking', 'rationale', 'confidence', 'wouldChange'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    pick: { type: 'string', description: 'The id of the chosen option, or "write-in".' },
    writeIn: { type: 'string', description: 'Only with pick "write-in": the option as the seat described it.' },
    rationale: { type: 'string', description: 'The deciding reason, in a short paragraph.' },
    restsOn: {
      type: 'array',
      items: { type: 'string' },
      description: 'The specific claims from the ballots the decision depends on, each with its evidence, for the caller to check.',
    },
    dissent: { type: 'string', description: 'The strongest case against the pick, or "none".' },
    wouldChange: { type: 'string', description: 'What would have to be true for a different option to win.' },
    experiment: {
      type: 'string',
      description: 'Only if the ballots split over a fact: a cheap check that would settle it. Otherwise empty.',
    },
    unanimous: { type: 'boolean' },
  },
  required: ['pick', 'rationale', 'restsOn', 'dissent', 'wouldChange', 'unanimous'],
}

phase('Deliberate')
const seated = await parallel(
  lenses.map(lens => () =>
    agent(
      `You hold one seat on a small council that advises on an engineering decision. ` +
        `Other seats are weighing the same options through other lenses. You cannot see their work, ` +
        `and a judge will read every ballot afterwards. Your job is to weigh the options through your ` +
        `lens only, and to say so plainly if your lens does not separate them.\n\n` +
        `Your lens (${lens.id}): ${lens.brief}\n\n` +
        packet +
        `\n` +
        (dir
          ? `The code is at ${dir}. Read what you need to check the claims in the packet and your own. `
          : ``) +
        `This is read-only work: do not edit, create, or delete files. ` +
        `Mark a flaw as verified only when you confirmed it by reading the code or running a command, ` +
        `and give the file:line or the command. An unverified concern is still worth reporting, marked as such. ` +
        `If a better option than the ones listed exists, pick "write-in" and describe it concretely. ` +
        `You must pick. The option ids are: ${optionIds.join(', ')}.`,
      {
        label: `seat:${lens.id}`,
        phase: 'Deliberate',
        schema: BALLOT_SCHEMA,
        model: seatModel || undefined,
      }
    ).then(ballot => (ballot ? { lens: lens.id, ...ballot } : null))
  )
)

const ballots = seated.filter(Boolean)
if (ballots.length < 2) {
  throw new Error(`council: only ${ballots.length} of ${lenses.length} seats returned a ballot`)
}
if (ballots.length < lenses.length) {
  log(`${lenses.length - ballots.length} seat(s) returned no ballot; judging on ${ballots.length}`)
}

phase('Judge')
const decision = await agent(
  `You are the judge for a council that advises on an engineering decision. ` +
    `Each seat weighed the options through one lens without seeing the others. ` +
    `Decide on the ballots below and return one pick.\n\n` +
    packet +
    `\nBallots:\n${JSON.stringify(ballots, null, 2)}\n\n` +
    `How to decide:\n` +
    `- Weigh evidence, not votes. A verified fatal flaw outweighs a majority, and an unverified one is a concern, not a veto.\n` +
    `- If a write-in is better than every listed option, pick it.\n` +
    `- If the options come out close, pick the one with fewer moving parts, and if that is also close, the one that is easier to undo.\n` +
    `- If the seats disagree about a fact, and a cheap check would settle it, name that check in "experiment" and still give your best pick.\n` +
    `- You must pick one option. "It depends" is not an answer the caller can act on.\n` +
    `List in "restsOn" the claims your decision depends on, so the caller can check them against the code.` +
    (dir ? ` The code is at ${dir} if you need to resolve a conflict between ballots; do not edit anything.` : ``),
  {
    label: 'judge',
    phase: 'Judge',
    schema: VERDICT_SCHEMA,
    model: judgeModel || undefined,
    effort: 'high',
  }
)

if (!decision) {
  throw new Error('council: the judge returned no verdict; the ballots are in the run journal')
}

return { decision, ballots }
