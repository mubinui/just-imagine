import { describe, it, expect, vi } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import {
  GameplayPlanSchema,
  runGameplayPlan,
  validateGameplayPlan,
  diagnoseGameplayPlanFailure,
  withoutCheck,
  GATE_CANCELLED,
  type GameplayPlan,
} from '../src/game-playtest';
import type { GameFailureDiagnostic } from '../src/game-diagnostics';

function scene() {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  doc.environment.gravity = { x: 0, y: 0 };
  doc.entities.find((e) => e.id === 'ball')!.body.isStatic = true;
  return doc;
}
const plan = (): GameplayPlan => ({
  intent: 'Move the ball to the place the child taps, then back.',
  controls: ['Tap a place'],
  requirements: ['Move there and remain at rest; support repeated input'],
  unverified: ['Illustration quality is validated by the asset pipeline.'],
  scenarios: [
    {
      name: 'Choose right then left',
      seconds: 3,
      inputs: [
        { at: 0.5, type: 'tap', x: 12, y: 3 },
        { at: 1.5, type: 'tap', x: 4, y: 3 },
      ],
      checks: [
        { at: 1, type: 'near', trigger: 0, target: 'ball', x: 12, y: 3, tolerance: 0.3 },
        { at: 1, type: 'speed', target: 'ball', max: 0.2 },
        { at: 2, type: 'near', trigger: 1, target: 'ball', x: 4, y: 3, tolerance: 0.3 },
      ],
    },
  ],
});
function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}
const responsive = "game.on('tap', e => { if (!e.target) game.move('ball', {x:e.x,y:e.y}); });";

describe('real-engine acceptance journeys', () => {
  it('stops before any scenario once its signal is aborted, as a cancellation, not a failure', async () => {
    const controller = new AbortController();
    controller.abort();
    const diagnose = vi.fn();
    // This programme fails the plan; an aborted run never plays it.
    expect(
      await runGameplayPlan(
        scene(),
        'game.on("tap", () => {});',
        plan(),
        undefined,
        diagnose,
        controller.signal,
      ),
    ).toBe(GATE_CANCELLED);
    expect(diagnose).not.toHaveBeenCalled();
  });
  it('checks separation through the whole journey, including a transient overlap before the final clear position', async () => {
    const doc = scene();
    const bolt = doc.entities.find((e) => e.id === 'bolt_toy')!;
    bolt.body.isStatic = true;
    bolt.transform = { x: 12, y: 3, rotation: 0 };
    const p = plan();
    p.scenarios[0]!.checks.push({
      type: 'separated',
      from: 0.1,
      at: 3,
      a: 'ball',
      b: 'bolt_toy',
      margin: 0,
    });
    expect(await runGameplayPlan(doc, responsive, p)).toMatch(/separated.*bounds=/);
    bolt.transform = { x: 2, y: 7, rotation: 0 };
    expect(await runGameplayPlan(doc, responsive, p)).toBeNull();
  });
  it('plays empty-space input, tests arrival/rest and reverses without generic flicking', async () => {
    expect(
      await runGameplayPlan(scene(), responsive, validateGameplayPlan(plan(), scene())),
    ).toBeNull();
  });
  it('initializes scene variables once for every fresh active/idle/input-prefix replay, like the browser', async () => {
    const doc = scene();
    doc.variables = {
      destination: {
        label: 'Destination',
        min: 2,
        max: 14,
        step: 1,
        value: 12,
        unit: 'm',
        binds: { kind: 'game' },
      },
    };
    const source = `let destination; let initialized = 0;
      game.on('variable', e => { if (e.id === 'destination') { destination = e.value; initialized++; } });
      game.on('tick', () => { if (initialized !== 1) throw 'wrong variable initialization'; });
      game.on('tap', e => { if (!e.target) game.move('ball', { x: e.x > 8 ? destination : 4, y: 3 }); });`;
    expect(await runGameplayPlan(doc, source, validateGameplayPlan(plan(), doc))).toBeNull();
  });
  it('rejects a no-op and a caption pretending to implement the requested interaction', async () => {
    for (const source of [
      'game.on("tap", () => {});',
      'game.on("tap", () => game.say("I arrived!"));',
    ])
      expect(await runGameplayPlan(scene(), source, plan())).toMatch(/position=.*distance=/);
  });
  it('reports numeric physics evidence and check indices without names, source or prose', async () => {
    const diagnostics: GameFailureDiagnostic[] = [];
    const p = plan();
    p.scenarios[0]!.name = 'private scenario text';
    expect(
      await runGameplayPlan(scene(), 'game.on("tap", () => {});', p, undefined, (d) =>
        diagnostics.push(d),
      ),
    ).toMatch(/position=/);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: 'PLAYTEST_CHECK',
      check: {
        scenario: 0,
        index: 0,
        type: 'near',
        at: 1,
        trigger: 0,
        expected: [12, 3, 0.3],
        actual: expect.arrayContaining([expect.any(Number)]),
      },
    });
    expect(JSON.stringify(diagnostics)).not.toMatch(/private|ball|game\.on|position=/);
  });
  it('rejects scripted animation which passes all checks without the child control', async () => {
    const source =
      "game.after(0.5, () => game.move('ball',{x:12,y:3})); game.after(1.5, () => game.move('ball',{x:4,y:3}));";
    expect(await runGameplayPlan(scene(), source, plan())).toMatch(/without input/);
  });
  it('rejects an automatic return even when the outward tap genuinely works', async () => {
    const source =
      "game.on('tap', e=>{if(e.x>8)game.move('ball',{x:12,y:3});}); game.after(1.5,()=>game.move('ball',{x:4,y:3}));";
    expect(await runGameplayPlan(scene(), source, plan())).toMatch(/without input 1/);
  });
  it('does not let an input-driven bonus hide an unrelated automatically completed movement', async () => {
    const p = plan();
    p.scenarios[0]!.checks.push({
      at: 1,
      after: 0.1,
      type: 'command',
      trigger: 0,
      command: 'score',
      min: 1,
      max: 1,
    });
    const source =
      "game.after(0.5,()=>game.move('ball',{x:12,y:3})); game.after(1.5,()=>game.move('ball',{x:4,y:3})); game.on('tap',()=>game.score(1));";
    expect(await runGameplayPlan(scene(), source, p)).toMatch(/without input 0/);
  });
  it('taps static actors at their real centre and follows the chosen answer, rather than option zero', async () => {
    const p = plan();
    p.scenarios = [
      {
        name: 'Choose the second answer',
        seconds: 2,
        inputs: [
          { at: 0.4, type: 'tap', target: 'ball' },
          { at: 0.8, type: 'answer', choice: 1 },
        ],
        checks: [
          { at: 1.5, type: 'near', trigger: 1, target: 'ball', x: 12, y: 3, tolerance: 0.3 },
        ],
      },
    ];
    const source =
      "game.on('tap', e => { if(e.target && e.target.id === 'ball') game.ask('Where?', ['Left','Right']).then(choice => {game.move('ball',{x:choice===1?12:4,y:3});}); });";
    expect(await runGameplayPlan(scene(), source, p)).toBeNull();
  });
  it('reports an answer without a waiting question and removed input targets', async () => {
    const p = plan();
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'answer', choice: 1 }];
    expect(await runGameplayPlan(scene(), responsive, p)).toMatch(/No question/);
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'tap', target: 'ball' }];
    expect(await runGameplayPlan(scene(), "game.remove('ball');", p)).toMatch(
      /target ball is missing/,
    );
  });
  it('moderates strings reached by a specific answer, including branches missed by generic smoke input', async () => {
    const p = plan();
    p.scenarios = [
      {
        name: 'Second option branch',
        seconds: 2,
        inputs: [
          { at: 0.4, type: 'tap', target: 'ball' },
          { at: 0.8, type: 'answer', choice: 1 },
        ],
        checks: [
          { at: 1.5, type: 'near', trigger: 1, target: 'ball', x: 12, y: 3, tolerance: 0.3 },
        ],
      },
    ];
    const source =
      "game.on('tap', e => { if(e.target) game.ask('Where?', ['Left','Right']).then(choice => {if(choice===1) game.say('rejected branch'); game.move('ball',{x:12,y:3});}); });";
    expect(
      await runGameplayPlan(scene(), source, p, async (text) => !text.includes('rejected')),
    ).toMatch(/unsuitable child-facing/);
  });
  it('rejects a physics controller stuck against a wall and accepts the same controller with a clear route', async () => {
    const doc = scene();
    const ball = doc.entities.find((e) => e.id === 'ball')!;
    ball.body.isStatic = false;
    ball.transform = { x: 4, y: 3, rotation: 0 };
    const p = plan();
    p.scenarios = [
      {
        name: 'Arrive and stop',
        seconds: 5,
        inputs: [{ at: 0.5, type: 'tap', x: 12, y: 3 }],
        checks: [
          { at: 4.5, type: 'near', trigger: 0, target: 'ball', x: 12, y: 3, tolerance: 0.4 },
          { at: 4.5, type: 'speed', target: 'ball', max: 0.2 },
        ],
      },
    ];
    const source =
      "let tx=4; game.on('tap',e=>{tx=e.x;}); game.on('tick',()=>{const b=game.find('ball')[0]; if(!b)return; const v=Math.max(-4,Math.min(4,(tx-b.x)*4)); game.impulse(b.id,{x:v-b.vx,y:-b.vy});});";
    expect(await runGameplayPlan(doc, source, p)).toBeNull();
    const wall = structuredClone(doc.entities.find((e) => e.id === 'ground')!);
    wall.id = 'wall';
    wall.transform = { x: 8, y: 3, rotation: 0 };
    wall.body.size = { width: 0.7, height: 6 };
    wall.tags = ['wall'];
    doc.entities.push(wall);
    expect(await runGameplayPlan(doc, source, p)).toMatch(/position=.*distance=/);
  });
  it('checks concrete command targets and ignores cosmetic sound or zero score changes', async () => {
    const p = plan();
    p.scenarios[0]!.checks = [
      {
        at: 1,
        after: 0.1,
        type: 'command',
        trigger: 0,
        command: 'remove',
        target: 'bolt_toy',
        min: 1,
        max: 1,
      },
    ];
    expect(await runGameplayPlan(scene(), "game.on('tap', () => game.remove('ball'));", p)).toMatch(
      /count=0/,
    );
    expect(
      await runGameplayPlan(scene(), "game.on('tap', () => game.remove('bolt_toy'));", p),
    ).toBeNull();
    p.scenarios[0]!.checks = [
      { at: 1, after: 0.1, type: 'command', trigger: 0, command: 'score', min: 1, max: 1 },
    ];
    expect(await runGameplayPlan(scene(), 'game.on("tap", () => game.score(0));', p)).toMatch(
      /count=0/,
    );
  });
});

describe('bounded data-only plans', () => {
  it('classifies invalid planner rules and bounded schema paths without leaking the candidate or message', () => {
    expect.assertions(4);
    const candidate = plan();
    candidate.scenarios[0]!.inputs[0] = { at: 0.5, type: 'tap', target: 'private_actor' };
    try {
      validateGameplayPlan(candidate, scene());
    } catch (error) {
      expect(diagnoseGameplayPlanFailure(error)).toEqual({
        code: 'PLAN_INVALID',
        planRule: 'UNKNOWN_ENTITY',
      });
      expect(JSON.stringify(diagnoseGameplayPlanFailure(error))).not.toContain('private_actor');
    }
    candidate.scenarios[0]!.seconds = 100;
    try {
      validateGameplayPlan(candidate, scene());
    } catch (error) {
      expect(diagnoseGameplayPlanFailure(error)).toMatchObject({
        code: 'PLAN_INVALID',
        planRule: 'SCHEMA',
        planIssues: [{ code: 'too_big', path: ['scenarios', 0, 'seconds'] }],
      });
      expect(JSON.stringify(diagnoseGameplayPlanFailure(error))).not.toContain('private_actor');
    }
  });
  it('rejects a scenario whose only triggered effect is at rest, and names the rule', () => {
    const p = plan();
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'tap', target: 'ball' }];
    p.scenarios[0]!.checks = [{ at: 2.5, type: 'speed', trigger: 0, target: 'ball', max: 0.5 }];
    expect(() => validateGameplayPlan(p, scene())).toThrow(/A triggered at-rest check/);
    expect(diagnoseGameplayPlanFailure(catchError(() => validateGameplayPlan(p, scene())))).toEqual(
      { code: 'PLAN_INVALID', planRule: 'REST_ONLY_EFFECT' },
    );
  });
  it('accepts an at-rest check that shares its trigger with a displacement effect', () => {
    const p = plan();
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'tap', target: 'ball' }];
    p.scenarios[0]!.checks = [
      { at: 1.5, type: 'displacement', trigger: 0, target: 'ball', min: 0.5 },
      { at: 2.5, type: 'speed', trigger: 0, target: 'ball', max: 0.5 },
    ];
    expect(() => validateGameplayPlan(p, scene())).not.toThrow();
  });
  it('requires a triggered speed check in the full journey but not in the input-prefix control', async () => {
    const doc = scene();
    doc.entities.find((e) => e.id === 'ball')!.body.isStatic = false;
    const p = plan();
    p.scenarios[0]!.seconds = 3;
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'tap', x: 12, y: 3 }];
    p.scenarios[0]!.checks = [
      { at: 1.5, type: 'displacement', trigger: 0, target: 'ball', min: 0.5 },
      { at: 2.9, type: 'speed', trigger: 0, target: 'ball', max: 0.5 },
    ];
    const movesThenStops =
      "let tx=null; game.on('tap',e=>{tx=e.x;}); game.on('tick',()=>{const b=game.find('ball')[0]; if(!b||tx===null)return; const v=Math.max(-4,Math.min(4,(tx-b.x)*4)); game.impulse(b.id,{x:v-b.vx,y:-b.vy});});";
    const neverStops =
      "let go=false; game.on('tap',()=>{go=true;}); game.on('tick',()=>{const b=game.find('ball')[0]; if(!b||!go)return; game.impulse(b.id,{x:2-b.vx,y:-b.vy});});";
    expect(await runGameplayPlan(doc, movesThenStops, p)).toBeNull();
    expect(await runGameplayPlan(doc, neverStops, p)).toMatch(/speed/);
  });
  it('drops one check and removes an emptied scenario', () => {
    const both = plan();
    both.scenarios[0]!.checks = [
      { at: 1.5, type: 'displacement', trigger: 0, target: 'ball', min: 0.5 },
      { at: 2.5, type: 'speed', trigger: 0, target: 'ball', max: 0.5 },
    ];
    const dropped = withoutCheck(both, 0, 1);
    expect(dropped.scenarios[0]!.checks).toHaveLength(1);
    expect(both.scenarios[0]!.checks).toHaveLength(2);
    const single = plan();
    single.scenarios[0]!.checks = [both.scenarios[0]!.checks[0]!];
    expect(withoutCheck(single, 0, 0).scenarios).toHaveLength(0);
    const two = plan();
    two.scenarios.push({
      ...two.scenarios[0]!,
      name: 'second',
      checks: [both.scenarios[0]!.checks[0]!],
    });
    expect(withoutCheck(two, 1, 0).scenarios).toHaveLength(1);
  });
  it('allows genuine Live-only conversation without inventing a movement game', () => {
    const doc = scene();
    doc.entities.find((e) => e.id === 'ball')!.character = {
      name: 'Luma',
      personality: 'A curious moon',
      greeting: 'Hello!',
      topic: 'Space',
    };
    const p = {
      ...plan(),
      externalOnly: true,
      scenarios: [],
      unverified: ['Live selection and voice are outside the script engine.'],
    };
    expect(validateGameplayPlan(p, doc).externalOnly).toBe(true);
    expect(() => validateGameplayPlan(p, scene())).toThrow(/existing Live characters/);
    expect(() => validateGameplayPlan({ ...p, unverified: [] }, doc)).toThrow(
      /unverified voice coverage/,
    );
  });
  it('requires causal input references for positive effects and ordered playback', () => {
    const p = plan();
    const check = p.scenarios[0]!.checks[0]!;
    if (check.type !== 'near') throw new Error('Expected destination fixture');
    delete check.trigger;
    expect(() => validateGameplayPlan(p, scene())).toThrow(/trigger index/);
    check.trigger = 11;
    expect(() => validateGameplayPlan(p, scene())).toThrow(/follow their input/);
    const unordered = plan();
    unordered.scenarios[0]!.inputs.reverse();
    expect(() => validateGameplayPlan(unordered, scene())).toThrow(/time order/);
  });
  it('rejects held-body echo and permits checking a real post-release consequence', () => {
    const p = plan();
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'drag', target: 'ball', x: 12, y: 3 }];
    p.scenarios[0]!.checks = [
      { at: 1.5, type: 'near', trigger: 0, target: 'ball', x: 12, y: 3, tolerance: 0.3 },
    ];
    expect(() => validateGameplayPlan(p, scene())).toThrow(/held-body position/);
    p.scenarios[0]!.inputs.push({ at: 1, type: 'release', target: 'ball' });
    expect(() => validateGameplayPlan(p, scene())).not.toThrow();
  });
  it('rejects code, unknown targets, unreachable times, broad and trivial checks', () => {
    expect(() => validateGameplayPlan({ ...plan(), scenarios: [] }, scene())).toThrow(
      /acceptance scenario/,
    );
    expect(
      GameplayPlanSchema.safeParse({ ...plan(), scenarios: [{ source: 'eval(1)' }] }).success,
    ).toBe(false);
    const p = plan();
    p.scenarios[0]!.checks = [{ at: 1, type: 'speed', target: 'ball', max: 0.2 }];
    expect(() => validateGameplayPlan(p, scene())).toThrow(/measurable change/);
    p.scenarios[0]!.checks = [
      { at: 1, type: 'near', trigger: 0, target: 'missing', x: 3, y: 3, tolerance: 0.5 },
    ];
    expect(() => validateGameplayPlan(p, scene())).toThrow(/Unknown check/);
    p.scenarios[0]!.checks = plan().scenarios[0]!.checks;
    p.scenarios[0]!.inputs = [{ at: 4, type: 'tap', x: 3, y: 3 }];
    expect(() => validateGameplayPlan(p, scene())).toThrow(/precede/);
    p.scenarios[0]!.inputs = [{ at: 0.5, type: 'tap' }];
    expect(() => validateGameplayPlan(p, scene())).toThrow(/x and y/);
  });
});
