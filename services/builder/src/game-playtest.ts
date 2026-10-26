import { z } from 'zod';
import type { SceneDoc } from '@just-imagine/scene-schema';
import type { BuildWorldJob } from '@just-imagine/protocol';
import { driveScript } from '@just-imagine/game-runtime';
import { createEngineStage, nodeWorkerFactory } from '@just-imagine/game-runtime/node';
import { describeScene } from './game-prompt';
import { DESIGNER_BRIEF } from './designer-brief';
import type { GameFailureDiagnostic } from './game-diagnostics';

const time = z.number().min(0.1).max(20);
const id = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/);
const x = z.number().min(0).max(16);
const y = z.number().min(0).max(9);
const InputSchema = z.discriminatedUnion('type', [
  z.object({
    at: time,
    type: z.literal('tap'),
    target: id.optional(),
    x: x.optional(),
    y: y.optional(),
  }),
  z.object({ at: time, type: z.literal('drag'), target: id, x, y }),
  z.object({ at: time, type: z.literal('release'), target: id }),
  z.object({
    at: time,
    type: z.literal('flick'),
    target: id,
    vx: z.number().min(-15).max(15),
    vy: z.number().min(-15).max(15),
  }),
  z.object({ at: time, type: z.literal('answer'), choice: z.number().int().min(0).max(2) }),
]);
const CheckSchema = z.discriminatedUnion('type', [
  z.object({
    at: time,
    from: z.number().min(0).max(20),
    type: z.literal('separated'),
    a: id,
    b: id,
    margin: z.number().min(0).max(1),
  }),
  z.object({
    at: time,
    type: z.literal('near'),
    invariant: z.boolean().optional(),
    trigger: z.number().int().min(0).max(11).optional(),
    target: id,
    x,
    y,
    tolerance: z.number().min(0.15).max(1),
  }),
  z.object({
    at: time,
    type: z.literal('speed'),
    trigger: z.number().int().min(0).max(11).optional(),
    target: id,
    max: z.number().min(0).max(0.5),
  }),
  z.object({
    at: time,
    type: z.literal('displacement'),
    trigger: z.number().int().min(0).max(11).optional(),
    target: id,
    min: z.number().min(0.3).max(16),
  }),
  z.object({
    at: time,
    type: z.literal('exists'),
    trigger: z.number().int().min(0).max(11).optional(),
    target: id,
    value: z.boolean(),
  }),
  z.object({
    at: time,
    after: z.number().min(0).max(20),
    type: z.literal('command'),
    trigger: z.number().int().min(0).max(11).optional(),
    command: z.enum(['spawn', 'remove', 'setMaterial', 'ask', 'score', 'win', 'lose']),
    target: z.string().min(1).max(64).optional(),
    min: z.number().int().min(0).max(16),
    max: z.number().int().min(0).max(16),
  }),
]);

/** Data only. These tests are planned from the wish before any script is supplied. */
export const GameplayPlanSchema = z.object({
  externalOnly: z.boolean().optional(),
  intent: z.string().min(1).max(800),
  controls: z.array(z.string().min(1).max(200)).min(1).max(6),
  requirements: z.array(z.string().min(1).max(300)).min(1).max(8),
  scenarios: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        seconds: z.number().min(1).max(20),
        inputs: z.array(InputSchema).max(12),
        checks: z.array(CheckSchema).min(1).max(12),
      }),
    )
    .min(0)
    .max(3),
  unverified: z.array(z.string().min(1).max(300)).max(4),
});
export type GameplayPlan = z.infer<typeof GameplayPlanSchema>;
export type PlanGame = (
  doc: SceneDoc,
  job: BuildWorldJob,
  previous?: string,
  validationFeedback?: string,
) => Promise<unknown>;

/** Only local rule names and schema paths; never return the rejected plan or message. */
export function diagnoseGameplayPlanFailure(error: unknown): GameFailureDiagnostic {
  if (error instanceof z.ZodError) {
    const fields = new Set([
      'externalOnly',
      'intent',
      'controls',
      'requirements',
      'scenarios',
      'unverified',
      'name',
      'seconds',
      'inputs',
      'checks',
      'at',
      'from',
      'after',
      'type',
      'target',
      'x',
      'y',
      'vx',
      'vy',
      'choice',
      'trigger',
      'invariant',
      'tolerance',
      'max',
      'min',
      'value',
      'command',
      'a',
      'b',
      'margin',
    ]);
    return {
      code: 'PLAN_INVALID',
      planRule: 'SCHEMA',
      planIssues: error.issues.slice(0, 8).map(({ code, path }) => ({
        code,
        path: path.map((p) =>
          typeof p === 'number' ? p : fields.has(String(p)) ? String(p) : 'field',
        ),
      })),
    };
  }
  const message = error instanceof Error ? error.message : '';
  const rules: [string, NonNullable<GameFailureDiagnostic['planRule']>][] = [
    ['Conversation-only plans', 'CONVERSATION_ONLY'],
    ['Scripted play needs', 'SCENARIO_REQUIRED'],
    ['Inputs must be', 'INPUT_ORDER'],
    ['Input must precede', 'INPUT_AFTER_END'],
    ['Unknown input target', 'UNKNOWN_ENTITY'],
    ['Unknown check target', 'UNKNOWN_ENTITY'],
    ['An empty-stage tap', 'TAP_COORDINATES'],
    ['Check falls outside', 'CHECK_AFTER_END'],
    ['Effect checks must follow', 'TRIGGER_ORDER'],
    ['A held-body position', 'HELD_BODY_ECHO'],
    ['Every positive effect check', 'TRIGGER_REQUIRED'],
    ['Command checks need', 'COMMAND_BOUNDS'],
    ['World-changing command checks', 'COMMAND_TARGET'],
    ['Separation needs', 'SEPARATION_BOUNDS'],
    ['A triggered at-rest check', 'REST_ONLY_EFFECT'],
    ['Scenario needs a measurable', 'TRIVIAL_SCENARIO'],
    ['A goal-based game needs', 'EXTERNAL_GOAL'],
  ];
  return {
    code: 'PLAN_INVALID',
    planRule: rules.find(([prefix]) => message.startsWith(prefix))?.[1] ?? 'UNKNOWN',
  };
}

/** Reject invalid and trivially passing plans before asking the programmer to implement them. */
export function validateGameplayPlan(value: unknown, doc: SceneDoc): GameplayPlan {
  const plan = GameplayPlanSchema.parse(value);
  if (plan.externalOnly) {
    if (
      plan.scenarios.length !== 0 ||
      plan.unverified.length === 0 ||
      !doc.entities.some((e) => e.character)
    )
      throw new Error(
        'Conversation-only plans require existing Live characters, no invented mechanics, and explicit unverified voice coverage',
      );
    return plan;
  }
  if (plan.scenarios.length === 0) throw new Error('Scripted play needs an acceptance scenario');
  const entities = new Map(doc.entities.map((e) => [e.id, e]));
  for (const scenario of plan.scenarios) {
    let previousTime = -1;
    for (const input of scenario.inputs) {
      if (input.at < previousTime) throw new Error('Inputs must be in time order');
      previousTime = input.at;
      if (input.at >= scenario.seconds)
        throw new Error('Input must precede the end of its scenario');
      if ('target' in input && input.target && !entities.has(input.target))
        throw new Error(`Unknown input target ${input.target}`);
      if (input.type === 'tap' && !input.target && (input.x === undefined || input.y === undefined))
        throw new Error('An empty-stage tap needs x and y');
    }
    let meaningful = false;
    for (const check of scenario.checks) {
      if (check.at > scenario.seconds) throw new Error('Check falls outside its scenario');
      if ('trigger' in check && check.trigger !== undefined) {
        const input = scenario.inputs[check.trigger];
        if (!input || check.at <= input.at)
          throw new Error('Effect checks must follow their input trigger');
        if (
          input.type === 'drag' &&
          'target' in check &&
          check.target === input.target &&
          ['near', 'displacement', 'speed'].includes(check.type)
        ) {
          const released = scenario.inputs
            .slice(check.trigger + 1)
            .some(
              (next) =>
                next.type === 'release' && next.target === input.target && next.at < check.at - 0.2,
            );
          if (!released)
            throw new Error(
              'A held-body position is input echo; check a downstream consequence or release it before measuring',
            );
        }
        if (check.type !== 'speed') meaningful = true;
      } else if (
        scenario.inputs.length > 0 &&
        check.type !== 'separated' &&
        check.type !== 'speed' &&
        !(check.type === 'near' && check.invariant) &&
        !(check.type === 'command' && check.min === 0) &&
        !(check.type === 'exists' && check.value)
      ) {
        throw new Error('Every positive effect check needs its input trigger index');
      }
      if (check.type === 'command') {
        if (check.after >= check.at || check.min > check.max)
          throw new Error('Command checks need a positive time window and ordered bounds');
        if (['spawn', 'remove', 'setMaterial'].includes(check.command) && !check.target)
          throw new Error('World-changing command checks need a specific target/template');
        if (check.min > 0) meaningful = true;
      } else if (check.type === 'separated') {
        if (
          !entities.has(check.a) ||
          !entities.has(check.b) ||
          check.a === check.b ||
          check.from >= check.at
        )
          throw new Error(
            'Separation needs two distinct existing bodies and an ordered time window',
          );
      } else {
        const entity = entities.get(check.target);
        if (!entity) throw new Error(`Unknown check target ${check.target}`);
        if (check.type === 'near') {
          const start = entity.transform;
          if (Math.hypot(start.x - check.x, start.y - check.y) > check.tolerance * 2)
            meaningful = true;
        }
        if (check.type === 'displacement' || (check.type === 'exists' && !check.value))
          meaningful = true;
      }
    }
    for (const check of scenario.checks) {
      if (check.type !== 'speed' || check.trigger === undefined) continue;
      const hasEffect = scenario.checks.some(
        (other) =>
          'trigger' in other &&
          other.trigger === check.trigger &&
          (other.type === 'near' ||
            other.type === 'displacement' ||
            (other.type === 'exists' && !other.value) ||
            (other.type === 'command' && other.min > 0)),
      );
      if (!hasEffect)
        throw new Error('A triggered at-rest check needs a sibling effect with the same trigger');
    }
    if (!meaningful)
      throw new Error('Scenario needs a measurable change, not only initial position or rest');
  }
  return plan;
}

/** Drop one check; a scenario left with no checks is removed, so the result may have no scenarios. */
export function withoutCheck(plan: GameplayPlan, scenario: number, index: number): GameplayPlan {
  const scenarios = plan.scenarios.flatMap((s, i) => {
    if (i !== scenario) return [s];
    const checks = s.checks.filter((_, j) => j !== index);
    return checks.length === 0 ? [] : [{ ...s, checks }];
  });
  return { ...plan, scenarios };
}

export function gameplayPlanPrompt(doc: SceneDoc, job: BuildWorldJob, previous?: string): string {
  return [
    DESIGNER_BRIEF,
    'A triggered speed (at-rest) check is never the only effect of its trigger: give it a sibling check with the same trigger of type near, displacement, exists false, or command min > 0; a scenario whose only triggered checks are at-rest checks is rejected.',
    'A near check may set invariant=true when an interaction must leave that object in place (for example a disabled portal). Omit trigger for that invariant. Every scenario with inputs still needs at least one real effect with trigger; never relabel a requested movement as invariant to bypass causal testing.',
    'When no-overlap/readability is requested, include separated checks: a and b are distinct scene body ids, margin is nonnegative metres between their rotated rectangular bounds. It is an invariant checked continuously from from through at, rather than a snapshot. Do not use it on intended touching/colliding objects. Test switching between characters while one is still close, not only separately returning each home.',
    'Set externalOnly=false for every requested scripted mechanic. Only when the entire request is simply conversation with existing character-metadata actors, externalOnly=true and scenarios=[]: Live provides selection and speech outside the sandbox. Explicitly list that voice coverage in unverified. Never invent motion or a quiz to make a conversation pass physics tests. Never use this exception for requested movement, transformations, puzzles, rule changes or game actions.',
    "You are the acceptance designer for a child-authored interactive world. No programme exists yet. Plan measurable play journeys from the actual wish and scene, not a fixed game genre. Preserve the child's cast, actions and exclusions. Do not demand scores, timers, obstacles, quizzes or endings unless requested. Make imagination work with this engine rather than limiting it to templates.",
    'Return the requested structured gameplay plan. requirements covers each requested mechanic and exclusion. controls explains intuitive tap/drag actions. Prefer 1–3 focused scenarios; each starts from the original fresh scene and lasts at most 20 seconds. Inputs use simulation seconds; answer choice is zero-based and answers the oldest waiting question. Entity taps may omit x/y and use the actual current centre. Empty-space taps MUST supply x/y. Drag uses the real spring hold until release. No automatic input or answers are added.',
    'Checks are evaluated at their exact simulated time. near uses metres in the 16×9 stage, tolerance 0.15–1; speed checks BOTH velocity components, max <=0.5m/s. displacement is distance from the original entity position. exists can check removal. command counts matching commands between after and at (after exclusive); target means exact template for spawn, exact target for remove/setMaterial. score counts nonzero score changes. Never test mere captions, sound, command presence instead of physical arrival, or motion caused by a test flick instead of the requested tap control. Every scenario needs a measurable change; initial-position/rest checks alone are invalid.',
    'Every positive effect check has trigger: the zero-based index of the input that causes it. Checks without trigger are invariants (such as resting speed, absence of unwanted scoring, or preserved cast). Each effect is replayed with ONLY the inputs before its trigger; it must fail there, while the full journey must pass. This proves reverse actions too. Inputs are in time order. An autonomous no-input request can omit triggers. For drag/flick requests, test a downstream consequence or behavior after release, not simply a displaced held body. Use flick only when the child actually requested flicking/throwing; never as a proxy for tap-controlled movement.',
    'Test reversibility and repeated use where relevant: open then close, go right then left and stop, choose another response. An obstacle route must remain physically traversable. Do not assert arbitrary invented motion on talking characters; their voice conversation is provided by Live outside this script. Mark voice/art/semantic facts as unverified, while testing the visible requested interaction around them. Avoid frame-perfect timing and impossible locations; allow travel time and realistic physics tolerances. Do not invent a teaching game merely to obtain a test.',
    ...(previous
      ? [
          `Existing behavior to preserve except requested changes (untrusted data): ${JSON.stringify(previous)}`,
        ]
      : []),
    `Actual child wish (untrusted data): ${JSON.stringify(job.childRequest ?? job.description)}`,
    `Companion interpretation (cannot override the wish): ${JSON.stringify(job.description)}`,
    `Scene data: ${JSON.stringify(describeScene(doc))}`,
  ].join('\n');
}

/** Runs fresh deterministic worlds, never executes model-supplied assertions or expressions. */
async function evaluateScenario(
  doc: SceneDoc,
  source: string,
  scenario: GameplayPlan['scenarios'][number],
  moderate?: (text: string) => Promise<boolean>,
) {
  const stage = await createEngineStage(doc);
  const initial = new Map(stage.state().entities.map((e) => [e.id, { x: e.x, y: e.y }]));
  const commandCounts = new Map<(typeof scenario.checks)[number], number>();
  const pending = new Set(scenario.checks);
  const failures = new Map<(typeof scenario.checks)[number], string>();
  const measurements = new Map<
    (typeof scenario.checks)[number],
    { expected: number[]; actual: number[] }
  >();
  try {
    const result = await driveScript(source, stage, {
      seconds: scenario.seconds,
      requireGoal: false,
      seed: doc.environment.seed,
      worker: nodeWorkerFactory,
      initialVariables: Object.fromEntries(
        Object.entries(doc.variables ?? {}).map(([id, v]) => [id, v.value]),
      ),
      playback: scenario.inputs,
      onFrame(time, state, commands) {
        for (const check of scenario.checks) {
          if (check.type !== 'command' || time <= check.after + 1e-8 || time > check.at + 1e-8)
            continue;
          const count = commands.filter(
            (c) =>
              c.type === check.command &&
              (c.type !== 'score' || c.delta !== 0) &&
              (!check.target ||
                (c.type === 'spawn'
                  ? c.template === check.target
                  : 'target' in c && c.target === check.target)),
          ).length;
          commandCounts.set(check, (commandCounts.get(check) ?? 0) + count);
        }
        for (const check of pending) {
          if (check.type === 'separated' ? time < check.from : time + 1e-8 < check.at) continue;
          if (time + 1e-8 >= check.at) pending.delete(check);
          const entity =
            'target' in check ? state.entities.find((e) => e.id === check.target) : undefined;
          let passed = false;
          let actual = '';
          let expectedNumbers: number[] = [];
          let actualNumbers: number[] = [];
          if (check.type === 'separated') {
            const a = state.entities.find((e) => e.id === check.a);
            const b = state.entities.find((e) => e.id === check.b);
            if (a && b) {
              const half = (e: typeof a) => ({
                x:
                  (Math.abs(Math.cos(e.rotation)) * e.width +
                    Math.abs(Math.sin(e.rotation)) * e.height) /
                  2,
                y:
                  (Math.abs(Math.sin(e.rotation)) * e.width +
                    Math.abs(Math.cos(e.rotation)) * e.height) /
                  2,
              });
              const ah = half(a),
                bh = half(b);
              passed =
                Math.abs(a.x - b.x) >= ah.x + bh.x + check.margin ||
                Math.abs(a.y - b.y) >= ah.y + bh.y + check.margin;
              actual = `bounds=${a.x.toFixed(2)},${a.y.toFixed(2)} / ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
              expectedNumbers = [check.margin];
              actualNumbers = [a.x, a.y, b.x, b.y, ah.x, ah.y, bh.x, bh.y];
            } else actual = 'separation body missing';
          } else if (check.type === 'command') {
            const count = commandCounts.get(check) ?? 0;
            passed = count >= check.min && count <= check.max;
            actual = `count=${count}`;
            expectedNumbers = [check.min, check.max];
            actualNumbers = [count];
          } else if (check.type === 'exists') {
            passed = Boolean(entity) === check.value;
            actual = `exists=${Boolean(entity)}`;
            expectedNumbers = [check.value ? 1 : 0];
            actualNumbers = [entity ? 1 : 0];
          } else if (entity) {
            if (check.type === 'near') {
              const distance = Math.hypot(entity.x - check.x, entity.y - check.y);
              passed = distance <= check.tolerance;
              actual = `position=${entity.x.toFixed(2)},${entity.y.toFixed(2)} distance=${distance.toFixed(2)}`;
              expectedNumbers = [check.x, check.y, check.tolerance];
              actualNumbers = [entity.x, entity.y, distance];
            } else if (check.type === 'speed') {
              const speed = Math.hypot(entity.vx, entity.vy);
              passed = speed <= check.max;
              actual = `speed=${speed.toFixed(2)}`;
              expectedNumbers = [check.max];
              actualNumbers = [speed, entity.vx, entity.vy];
            } else {
              const start = initial.get(check.target)!;
              const distance = Math.hypot(entity.x - start.x, entity.y - start.y);
              passed = distance >= check.min;
              actual = `displacement=${distance.toFixed(2)}`;
              expectedNumbers = [check.min];
              actualNumbers = [distance];
            }
          } else actual = 'entity missing';
          if (!passed) {
            failures.set(check, `${JSON.stringify(check)}: ${actual}`);
            measurements.set(check, { expected: expectedNumbers, actual: actualNumbers });
          }
        }
      },
    });
    if (!result.ok)
      return {
        error: `Runtime failure in ${scenario.name}: ${result.reason} ${JSON.stringify(result.detail)}`,
        failures,
        measurements,
      };
    if (moderate)
      for (const text of result.stats.strings)
        if (!(await moderate(text)))
          return {
            error: `Runtime failure in ${scenario.name}: unsuitable child-facing text`,
            failures,
            measurements,
          };
    if (pending.size > 0)
      return { error: `Not every check was reached in ${scenario.name}`, failures, measurements };
    return { error: null, failures, measurements };
  } catch (error) {
    return {
      error: `Runtime failure in ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`,
      failures,
      measurements,
    };
  }
}

/** Fresh real worlds for each journey, idle control, and per-effect input-prefix control. */
export async function runGameplayPlan(
  doc: SceneDoc,
  source: string,
  plan: GameplayPlan,
  moderate?: (text: string) => Promise<boolean>,
  diagnose?: (diagnostic: GameFailureDiagnostic) => void,
): Promise<string | null> {
  for (const [scenarioIndex, scenario] of plan.scenarios.entries()) {
    const reportCheck = (
      code: 'PLAYTEST_CHECK' | 'PLAYTEST_CAUSAL',
      check: (typeof scenario.checks)[number],
      measured?: { expected: number[]; actual: number[] },
    ) =>
      diagnose?.({
        code,
        check: {
          scenario: scenarioIndex,
          index: scenario.checks.indexOf(check),
          type: check.type,
          at: check.at,
          ...('trigger' in check && check.trigger !== undefined ? { trigger: check.trigger } : {}),
          ...(measured ?? {}),
        },
      });
    const active = await evaluateScenario(doc, source, scenario, moderate);
    if (active.error) {
      diagnose?.({ code: 'PLAYTEST_RUNTIME' });
      return active.error;
    }
    if (active.failures.size) {
      const failed = active.failures.keys().next().value!;
      reportCheck('PLAYTEST_CHECK', failed, active.measurements.get(failed));
      return `Playtest ${scenario.name}: ${[...active.failures.values()].slice(0, 4).join('; ')}`;
    }
    if (scenario.inputs.length === 0) continue;
    const idle = await evaluateScenario(doc, source, { ...scenario, inputs: [] }, moderate);
    if (idle.error) {
      diagnose?.({ code: 'PLAYTEST_RUNTIME' });
      return `No-input control: ${idle.error}`;
    }
    const triggers = [
      ...new Set(
        scenario.checks.flatMap((check) =>
          !('trigger' in check) || check.trigger === undefined ? [] : [check.trigger],
        ),
      ),
    ];
    for (const trigger of triggers) {
      const checks = scenario.checks.filter(
        (check) => 'trigger' in check && check.trigger === trigger && check.type !== 'speed',
      );
      if (checks.length === 0) continue;
      const control =
        trigger === 0
          ? idle
          : await evaluateScenario(
              doc,
              source,
              {
                ...scenario,
                inputs: scenario.inputs.slice(0, trigger),
                checks,
              },
              moderate,
            );
      if (control.error) {
        diagnose?.({ code: 'PLAYTEST_RUNTIME' });
        return `Input-prefix control: ${control.error}`;
      }
      for (const check of checks) {
        if (!control.failures.has(check)) {
          reportCheck('PLAYTEST_CAUSAL', check);
          return `Playtest ${scenario.name}: effect ${JSON.stringify(check)} also passes without input ${trigger}; that control has no demonstrated effect`;
        }
      }
    }
  }
  return null;
}
