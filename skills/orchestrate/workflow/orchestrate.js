// NOTE: `meta` must be a pure literal. The Workflow tool rejects string
// concatenation, template interpolation, and variables in any field.
export const meta = {
  name: 'orchestrate',
  description:
    'A planner splits a task into independent items, workers execute them in parallel and report evidence, a synthesizer stitches the results',
  whenToUse:
    'Invoked by the /orchestrate skill once the task is scoped. Runs Plan (skipped when the caller supplies items) -> Execute (one worker per item, in parallel, each verifying its own item) -> Synthesize (one coherent answer, with conflicts and gaps flagged).',
  phases: [
    { title: 'Plan', detail: 'planner tier splits the task into independent work items' },
    { title: 'Execute', detail: 'worker tier, one worker per item, in parallel' },
    { title: 'Synthesize', detail: 'planner tier stitches worker results into one answer' },
  ],
}

// args (from the skill's Phase 0):
//   task         - the task, verbatim.
//   context      - what every agent needs and cannot see: constraints, repo
//                  facts from scouting, conventions, the verify commands.
//                  Passed verbatim to the planner and to every worker.
//   items        - optional [{ id, spec, done }, ...]. When supplied, Plan is
//                  skipped: the caller already knows the work-list.
//   planner      - model for Plan and Synthesize (default 'opus').
//   worker       - model for Execute (default 'sonnet').
//   workerEffort - optional effort for workers; omitted inherits the session.
//   isolation    - true when workers edit overlapping files (default false).
//   maxItems     - cap on planner-produced items (default 8).
const {
  task,
  context = '',
  items: suppliedItems = null,
  planner = 'opus',
  worker = 'sonnet',
  workerEffort = null,
  isolation = false,
  maxItems = 8,
} = args || {}

if (!task) {
  throw new Error('orchestrate: args.task is required')
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Short kebab-case label.' },
          spec: {
            type: 'string',
            description: 'What to do, with the files or areas involved. Readable by someone who knows nothing else.',
          },
          done: {
            type: 'string',
            description: 'A check the worker can run to show the item is finished, with the expected result.',
          },
        },
        required: ['id', 'spec', 'done'],
      },
    },
    uncovered: {
      type: 'string',
      description: 'Parts of the task that do not split into independent items and are left to the caller. Empty if none.',
    },
  },
  required: ['items'],
}

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string', description: 'What was done or found, in a few sentences.' },
    changes: { type: 'array', items: { type: 'string' }, description: 'Files changed, one per entry.' },
    verified: { type: 'string', description: 'The check that was run and its actual result.' },
    unverified: { type: 'string', description: 'What could not be checked, and why. Empty if nothing.' },
    blocker: { type: 'string', description: 'For partial or blocked: what stopped the work.' },
    commit: { type: 'string', description: 'Commit SHA holding the work, when running in an isolated worktree.' },
  },
  required: ['id', 'status', 'summary', 'verified'],
}

const FINAL_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    conflicts: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    recheck: {
      type: 'array',
      items: { type: 'string' },
      description: 'Checks the caller should run on the combined result.',
    },
  },
  required: ['summary', 'conflicts', 'gaps', 'recheck'],
}

const shared = context ? `Shared context and constraints:\n${context}\n\n` : ''

phase('Plan')
let items = suppliedItems
let uncovered = ''
if (items && items.length) {
  log(`Using ${items.length} caller-supplied work items; skipping the planner`)
} else {
  const plan = await agent(
    `Split this task into work items that separate workers will do in parallel. ` +
      `Each worker sees only its own item and the shared context below, so every item must stand alone.\n\n` +
      `Task: ${task}\n\n` +
      shared +
      `Rules for the split:\n` +
      `- At most ${maxItems} items. Batch small related pieces into one item.\n` +
      `- No two items edit the same file, and no item depends on another item's output.\n` +
      `- Each "spec" names the files or areas involved and what to do there.\n` +
      `- Each "done" is a check the worker can run, with the expected result.\n` +
      `- Put anything that does not split cleanly in "uncovered". Do not force it into an item.\n` +
      `Plan from the task and the shared context. Do not read the codebase yourself.`,
    { model: planner, effort: 'high', phase: 'Plan', schema: PLAN_SCHEMA }
  )
  if (!plan || !plan.items || !plan.items.length) {
    throw new Error('orchestrate: the planner returned no work items')
  }
  items = plan.items.slice(0, maxItems)
  uncovered = plan.uncovered || ''
  if (plan.items.length > maxItems) {
    log(`Planner produced ${plan.items.length} items; running the first ${maxItems} and reporting the rest as uncovered`)
  }
  log(`Planner produced ${items.length} work items`)
  // Items past the cap are reported, not silently dropped.
  for (const extra of plan.items.slice(maxItems)) {
    uncovered += `${uncovered ? '\n' : ''}Not run (over the item cap): ${extra.id}: ${extra.spec}`
  }
}

phase('Execute')
const raw = await parallel(
  items.map(item => () =>
    agent(
      `You are one of several workers running in parallel on parts of a larger task. ` +
        `You see only this brief. The other workers cannot see your work, and you cannot see theirs.\n\n` +
        `The larger task, for orientation only: ${task}\n\n` +
        shared +
        `Your item (${item.id}): ${item.spec}\n` +
        `Done when: ${item.done || 'the spec is fully met; choose a check that shows it.'}\n\n` +
        `Do the whole item and nothing outside it. Other workers own the rest, so a fix outside your item ` +
        `can collide with theirs; mention it in your summary instead. ` +
        `Work through ordinary obstacles such as errors, timeouts, and failing tools: diagnose, then retry or use another route. ` +
        `If something deliberate stops you, such as a protected file or missing access, report status "blocked" and say what it is. ` +
        `Before you report, run the done-when check and put the command and its actual result in "verified". ` +
        `Do not weaken or skip a check to make it pass. Say in "unverified" what you could not check.` +
        (isolation
          ? ` You are in your own git worktree. Commit your work there and report the commit SHA in "commit": uncommitted work in the worktree does not reach the caller.`
          : ``),
      {
        label: `execute:${item.id}`,
        phase: 'Execute',
        model: worker,
        effort: workerEffort || undefined,
        schema: RESULT_SCHEMA,
        isolation: isolation ? 'worktree' : undefined,
      }
    )
  )
)

// Workers that died return null. Keep them visible by item id.
const results = raw.map((r, i) =>
  r
    ? { ...r, id: items[i].id }
    : { id: items[i].id, status: 'blocked', summary: 'The worker returned no result.', verified: 'nothing', blocker: 'worker failed or was skipped' }
)
const incomplete = results.filter(r => r.status !== 'done').map(r => ({ id: r.id, status: r.status, blocker: r.blocker || '' }))
if (incomplete.length) {
  log(`${incomplete.length} of ${items.length} items did not finish: ${incomplete.map(r => r.id).join(', ')}`)
}

phase('Synthesize')
const answer = await agent(
  `Several workers each did one item of this task in parallel: ${task}\n\n` +
    `Combine their reports into one account for the person who asked. ` +
    `Treat each report as a claim by its worker, not as established fact. ` +
    `List as conflicts any place two workers changed or concluded incompatible things. ` +
    `List as gaps only these three things: an item that is not "done", a part of the task as stated above that no item covered, ` +
    `and something a worker itself said it could not verify. A check a worker ran and reported is not a gap, ` +
    `and neither is a hypothetical the reports give no reason to suspect. An empty list is a normal answer. ` +
    `List in "recheck" only the checks that exercise the items together, since each worker verified its own item alone; ` +
    `do not list a repeat of a check a worker already ran. ` +
    `Work from the task and the reports below and nothing else. Do not redo the workers' work.\n\n` +
    (uncovered ? `Left out of the plan: ${uncovered}\n\n` : ``) +
    `Worker reports:\n${JSON.stringify(results, null, 2)}`,
  { model: planner, effort: 'high', phase: 'Synthesize', schema: FINAL_SCHEMA }
)

if (!answer) {
  log('The synthesizer returned nothing; the worker results are returned unsynthesized')
}

return { items, results, incomplete, uncovered, answer }
