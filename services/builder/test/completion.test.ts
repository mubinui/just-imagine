import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FIXTURE_WORLDS, LAB_WORLDS } from '@just-imagine/fixtures/browser';
import {
  CONCEPTS,
  GeneratedSceneSchema,
  validateScene,
  fromGenerated,
} from '@just-imagine/scene-schema';
import { nearestConceptFixture } from '../src/fallback';
import { AGE_GUIDE, FEW_SHOT_EXAMPLES, scenePromptV1 } from '../src/prompts/v1';
import { IMAGINATION_CASES } from '../src/evals/prompts';
import { evaluateScene, evaluationJob, fixtureDouble, runEvaluation } from '../src/evals/evaluate';

const mockGenerate = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerate };
  },
  HarmCategory: {},
  HarmBlockThreshold: { BLOCK_LOW_AND_ABOVE: 'low' },
}));
import { VertexModels } from '../src/vertex';

beforeEach(() => {
  mockGenerate.mockReset();
});
describe('builder completion', () => {
  it('ships six valid few-shot examples with physics ranges and age guides', () => {
    expect(FEW_SHOT_EXAMPLES).toHaveLength(6);
    for (const { scene } of FEW_SHOT_EXAMPLES)
      expect(
        validateScene(fromGenerated(GeneratedSceneSchema.parse(scene), 'w_example')).issues,
      ).toEqual([]);
    const prompt = scenePromptV1(evaluationJob(IMAGINATION_CASES[0]!));
    expect(prompt).toContain('"stone":{"density":[2.2,3]');
    for (const age of Object.keys(AGE_GUIDE)) expect(prompt).toContain(age);
  });
  it('selects a same-tier cached fallback by concept, preserving identity without mutating cache', () => {
    const result = nearestConceptFixture({
      worldId: 'w_fallback',
      tier: 'lab',
      concepts: ['fraction'],
    });
    expect(result.fixtureKey).toBe('fractionsLab');
    expect(result.doc.worldId).toBe('w_fallback');
    expect(result.doc).not.toBe(LAB_WORLDS.fractionsLab);
    expect(LAB_WORLDS.fractionsLab.worldId).toBe('w_fixture_fractions_lab');
    expect(
      nearestConceptFixture({ worldId: 'w_x', tier: 'playground', concepts: ['buoyancy'] })
        .fixtureKey,
    ).toBe('pondFloat');
  });
  it('falls back on model failure only for the affected session and retains structured safety settings', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ text: '{}' });
    const model = new VertexModels({
      project: 'test',
      sceneModel: 'primary',
      fastModel: 'fast',
      heroModel: '',
      propModel: '',
    });
    await model.generate('prompt', 'scene', 'session_a');
    await model.generate('prompt', 'scene', 'session_a');
    await model.generate('prompt', 'scene', 'session_b');
    expect(mockGenerate.mock.calls.map(([request]) => request.model)).toEqual([
      'primary',
      'fast',
      'fast',
      'primary',
    ]);
    expect(mockGenerate.mock.calls[1]![0].config.responseMimeType).toBe('application/json');
    expect(mockGenerate.mock.calls[1]![0].config.safetySettings).toHaveLength(4);
  });
  it('does not loop when both models fail or retry a patch twice', async () => {
    mockGenerate.mockRejectedValue(new Error('unavailable'));
    const model = new VertexModels({
      project: 'test',
      sceneModel: 'primary',
      fastModel: 'fast',
      heroModel: '',
      propModel: '',
    });
    await expect(model.generate('prompt', 'scene')).rejects.toThrow('unavailable');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    mockGenerate.mockClear();
    await expect(model.generate('prompt', 'patch')).rejects.toThrow('unavailable');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
  it('curates 50 distinct requests across every concept, both tiers and safety redirections', () => {
    expect(IMAGINATION_CASES).toHaveLength(50);
    expect(new Set(IMAGINATION_CASES.map((test) => test.description)).size).toBe(50);
    expect(new Set(IMAGINATION_CASES.flatMap((test) => test.expectedConcepts))).toEqual(
      new Set(CONCEPTS),
    );
    expect(
      IMAGINATION_CASES.filter((test) => test.safety === 'redirect').length,
    ).toBeGreaterThanOrEqual(5);
  });
  it('reports the fixture double separately from real-model quality and measures concept gaps honestly', async () => {
    const report = await runEvaluation('double', fixtureDouble);
    expect(report.count).toBe(50);
    expect(report.validityRate).toBe(1);
    expect(report.safetyHits).toBe(0);
    expect(report.conceptTagRecall).toBeGreaterThan(0.5);
    expect(report.conceptTagRecall).toBeLessThan(1);
    expect(report.passed).toBe(true);
  });
  it('flags invalid DSL, missing concepts, wrong tier, unsafe output and generation failures', async () => {
    const test = IMAGINATION_CASES[24]!;
    const wrongTier = evaluateScene(test, FIXTURE_WORLDS.jellyDragon);
    expect(wrongTier.valid).toBe(false);
    expect(wrongTier.conceptRecall).toBe(0);
    const unsafe = structuredClone(FIXTURE_WORLDS.projectileLab);
    unsafe.title = 'gun';
    expect(evaluateScene(test, unsafe).safetyHits).toContain('gun');
    const report = await runEvaluation('recorded', () => async () => ({}), [test]);
    expect(report.passed).toBe(false);
    expect(report.results[0]?.attempts).toBe(2);
  });
});

it('sends sanitized response schemas and requests actual 16:9 2K backdrops', async () => {
  const model = new VertexModels({
    project: 'test',
    sceneModel: 'scene',
    fastModel: 'fast',
    heroModel: 'hero',
    propModel: 'prop',
  });
  mockGenerate.mockResolvedValueOnce({ text: '{}' });
  await model.generate('safe world', 'scene');
  expect(JSON.stringify(mockGenerate.mock.calls[0]![0].config.responseJsonSchema)).not.toMatch(
    /"(const|pattern|minLength|maxLength|propertyNames)":/,
  );
  mockGenerate.mockResolvedValueOnce({
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: Buffer.from('image-double').toString('base64'),
              },
            },
          ],
        },
      },
    ],
  });
  await model.image('safe landscape', false, true);
  expect(mockGenerate.mock.calls[1]![0].config.imageConfig).toEqual({
    aspectRatio: '16:9',
    imageSize: '2K',
  });
});

it('uses validated JSON mode when the provider rejects a complex response schema', async () => {
  const model = new VertexModels({
    project: 'test',
    apiKey: 'server-key',
    sceneModel: 'scene',
    fastModel: 'fast',
    heroModel: 'hero',
    propModel: 'prop',
  });
  mockGenerate.mockRejectedValueOnce({ status: 400 }).mockResolvedValue({ text: '{}' });
  await model.generate('safe world', 'scene', 'one');
  await model.generate('another world', 'scene', 'two');
  expect(mockGenerate).toHaveBeenCalledTimes(3);
  expect(mockGenerate.mock.calls[0]![0].config.responseJsonSchema).toBeDefined();
  for (const [request] of mockGenerate.mock.calls.slice(1)) {
    expect(request.config.responseJsonSchema).toBeUndefined();
    expect(request.config.responseMimeType).toBe('application/json');
    expect(request.contents).toContain('Output JSON contract (follow exactly)');
    expect(request.config.safetySettings).toHaveLength(4);
  }
});
