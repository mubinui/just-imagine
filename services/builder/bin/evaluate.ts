import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fixtureDouble, runEvaluation } from '../src/evals/evaluate';
import type { GenerateJson } from '../src/pipeline';

const args = process.argv.slice(2);
function option(name: string) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
const mode = option('--mode') ?? 'double';
if (!['double', 'recorded', 'vertex'].includes(mode))
  throw new Error('Use --mode double|recorded|vertex');
let generator: Parameters<typeof runEvaluation>[1] = fixtureDouble;
if (mode === 'recorded') {
  const file = option('--recordings');
  if (!file)
    throw new Error(
      '--recordings must name a JSON object mapping case IDs to generated scene outputs',
    );
  const recordings = JSON.parse(await readFile(resolve(file), 'utf8')) as Record<string, unknown>;
  generator = (test) => async () => {
    if (!Object.hasOwn(recordings, test.id)) throw new Error(`Missing recording: ${test.id}`);
    return recordings[test.id];
  };
}
if (mode === 'vertex') {
  if (!args.includes('--allow-cloud'))
    throw new Error(
      'Real Vertex evaluation requires --allow-cloud and staging credentials. It makes billable model calls.',
    );
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const sceneModel = process.env.SCENE_MODEL;
  const fastModel = process.env.FAST_MODEL;
  if (!project || !sceneModel || !fastModel)
    throw new Error('Set GOOGLE_CLOUD_PROJECT, SCENE_MODEL and FAST_MODEL explicitly for staging');
  const { VertexModels } = await import('../src/vertex');
  const models = new VertexModels({ project, sceneModel, fastModel, heroModel: '', propModel: '' });
  generator = () => models.generate as GenerateJson;
}
const report = {
  ...(await runEvaluation(mode as 'double' | 'recorded' | 'vertex', generator)),
  models:
    mode === 'vertex' ? { scene: process.env.SCENE_MODEL, fast: process.env.FAST_MODEL } : null,
};
const output = resolve(option('--output') ?? `reports/builder-eval-${mode}.json`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify({
    report: output,
    mode,
    count: report.count,
    validityRate: report.validityRate,
    conceptTagRecall: report.conceptTagRecall,
    safetyHits: report.safetyHits,
    passed: report.passed,
  }),
);
if (!report.passed) process.exitCode = 1;
