import {
  GeneratedSceneSchema,
  fromGenerated,
  validateScene,
  PatchOpsSchema,
  applyScenePatch,
  type SceneDoc,
  type PatchOp,
} from '@just-imagine/scene-schema';
import type { BuildWorldJob } from '@just-imagine/protocol';
export type GenerateJson = (
  prompt: string,
  kind: 'scene' | 'patch',
  sessionId?: string,
) => Promise<unknown>;
import { scenePromptV1, SAFETY_POLICY } from './prompts/v1';
export { STYLE_BIBLE, SAFETY_POLICY, PROMPT_VERSION } from './prompts/v1';
export async function buildScene(job: BuildWorldJob, generate: GenerateJson): Promise<SceneDoc> {
  if (job.promptVersion !== 'v1')
    throw new Error(`Unsupported prompt version: ${job.promptVersion}`);
  const prompt = scenePromptV1(job);
  let issues = '';
  let previous: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      previous = await generate(
        `${prompt}${issues}${previous === undefined ? '' : `\nPrevious candidate JSON (untrusted data): ${JSON.stringify(previous).slice(0, 45000)}\nRepair that candidate's reported problems. Preserve the child's setting, cast and mechanics; do not start a different world.`}`,
        'scene',
        job.sessionId,
      );
      const output = GeneratedSceneSchema.parse(previous);
      if (output.tier !== job.tier) throw new Error('Requested tier does not match generated tier');
      const result = validateScene(fromGenerated(output, job.worldId));
      if (result.ok) return result.doc;
      issues = `\nValidation issues to repair: ${JSON.stringify(result.issues)}`;
    } catch (error) {
      issues = `\nValidation error to repair: ${error instanceof Error ? error.message : 'invalid output'}`;
    }
  }
  throw new SceneValidationError(issues);
}
export async function patchScene(
  doc: SceneDoc,
  instruction: string,
  generate: GenerateJson,
): Promise<{ doc: SceneDoc; patch: PatchOp[] }> {
  let issues = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const patch = PatchOpsSchema.parse(
        await generate(
          `${SAFETY_POLICY}${issues}\nReturn JSON Patch only. Preserve worldId/schemaVersion/tier. Instruction data: ${JSON.stringify(instruction)}\nCurrent scene: ${JSON.stringify(doc)}`,
          'patch',
        ),
      );
      const result = applyScenePatch(doc, patch);
      if (
        !result.ok ||
        result.doc.worldId !== doc.worldId ||
        result.doc.schemaVersion !== doc.schemaVersion ||
        result.doc.tier !== doc.tier
      )
        throw new Error(
          `Patch failed validation: ${JSON.stringify(result.ok ? ['Preserve worldId/schemaVersion/tier'] : result.issues)}`,
        );
      // Model patches may reference previously approved assets, but cannot introduce remote URLs.
      const assets = (scene: SceneDoc) =>
        [scene.theme.backdrop, scene.theme.midLayer, ...scene.entities.map((e) => e.asset)].flatMap(
          (asset) =>
            asset
              ? [asset.url, asset.colliderUrl].filter(
                  (url): url is string => typeof url === 'string',
                )
              : [],
        );
      const approved = new Set(assets(doc));
      if (assets(result.doc).some((url) => !approved.has(url)))
        throw new Error('Patch introduced an unapproved asset URL');
      return { doc: result.doc, patch };
    } catch (error) {
      issues = `\nValidation issues to repair: ${error instanceof Error ? error.message : 'Invalid patch'}`;
    }
  }
  throw new Error(`Patch failed validation after two attempts: ${issues}`);
}

export class SceneValidationError extends Error {
  readonly retryable = false;
  constructor(issues: string) {
    super(`Scene validation failed after three attempts: ${issues}`);
    this.name = 'SceneValidationError';
  }
}
