import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  GAME_SCRIPT_MAX_BYTES,
  findBlockedTerm,
  validateScene,
  type SceneDoc,
} from '@just-imagine/scene-schema';
import { checkScript } from '@just-imagine/game-runtime';
import { smokeRun, type SmokeLanguage, type SmokeResult } from '@just-imagine/game-runtime/node';
import type { BuildWorldJob } from '@just-imagine/protocol';
import { buildScene, type GenerateJson } from './pipeline';
import { GAME_SCENE_HINT, gameScriptPrompt, retryFeedback } from './game-prompt';

/** Calls the script model with a prompt; resolves with its parsed JSON output. */
export type GenerateScript = (prompt: string, sessionId?: string) => Promise<unknown>;

export const GameScriptOutputSchema = z.object({
  kind: z.enum(['game', 'playground']),
  source: z.string().min(1).max(GAME_SCRIPT_MAX_BYTES).optional(),
});

export type Moderate = (text: string, language: SmokeLanguage) => Promise<boolean>;

export interface ImagineGameDeps {
  generateScene: GenerateJson;
  generateScript: GenerateScript;
  /** Child-facing string check; defaults to the scene blocklist. */
  moderate?: Moderate;
  /** Simulated seconds for the smoke run. */
  seconds?: number;
}

export interface ImagineGameResult {
  doc: SceneDoc;
  kind: 'game' | 'playground';
  /** Script model calls made. */
  attempts: number;
  /** Retained for older callers; new failures throw instead of substituting a plain scene. */
  fallback: boolean;
  /** Why the last script failed, for logs. */
  failure?: string;
}

const GAME_WORDS =
  /\b(games?|score|points?|win|winning|lose|lives|levels?|race|racing|catch|collect|chase|beat|dodge|avoid|timer|seconds|goal|knock (?:down|over)|before the|how many|as many|highest|fastest|keep (?:\w+ ){0,3}(?:alive|up|afloat|in the air)|land (?:\w+ ){0,3}(?:softly|safely|gently)|stack (?:\w+ ){0,4}(?:higher|taller)|as long as|taller than|higher than)\b/;

/** A cheap first guess from the wish; the script model still makes the final call. */
export function wantsGame(description: string): boolean {
  return GAME_WORDS.test(description.toLowerCase());
}

export const blocklistModeration: Moderate = async (text) => findBlockedTerm(text) === null;

export function scriptHash(source: string): string {
  return createHash('sha256').update(source).digest('hex');
}

function describeFailure(result: Extract<SmokeResult, { ok: false }>): string {
  switch (result.reason) {
    case 'static':
      return `static check: ${result.detail.errors.map((e) => `line ${e.line}: ${e.message}`).join('; ')}`;
    case 'runtime':
      return `runtime error: ${result.detail.message}${
        'line' in result.detail && result.detail.line !== undefined
          ? ` (line ${result.detail.line})`
          : ''
      }`;
    case 'budget':
      return `budget exceeded: ${result.detail.kind} reached ${Math.round(result.detail.value)} (limit ${result.detail.limit})${
        result.detail.where ? ` in ${result.detail.where}` : ''
      }`;
    case 'no-goal':
      return `no goal: ${result.detail.message}`;
    case 'moderation':
      return `these child-facing strings are not suitable: ${JSON.stringify(result.detail.rejected)}`;
  }
}

/** Static check, ten-second smoke run and moderation. Returns null when the script passes. */
export async function gateScript(
  doc: SceneDoc,
  source: string,
  options: {
    language: SmokeLanguage;
    moderate?: Moderate;
    seconds?: number;
    requireGoal?: boolean;
  },
): Promise<string | null> {
  const check = checkScript(source);
  if (!check.ok)
    return `static check: ${check.errors.map((e) => `line ${e.line}: ${e.message}`).join('; ')}`;
  const result = await smokeRun(doc, source, {
    seconds: options.seconds ?? 10,
    requireGoal: options.requireGoal ?? doc.game?.mode !== 'freeplay',
    language: options.language,
    moderate: options.moderate ?? blocklistModeration,
  });
  return result.ok ? null : describeFailure(result);
}

function withScript(doc: SceneDoc, source: string, mode: 'game' | 'freeplay' = 'game'): SceneDoc {
  const next = structuredClone(doc);
  next.game = {
    script: { apiVersion: 1, source, hash: scriptHash(source) },
    ...(mode === 'freeplay' ? { mode } : {}),
  };
  const checked = validateScene(next);
  if (!checked.ok) throw new Error(checked.issues.map((i) => i.message).join('; '));
  return checked.doc;
}

/**
 * The `imagineGame` flow: decide game or playground from the wish, compose the
 * scene, ask the script model for a programme against the Game API, gate it
 * (static check, smoke run, moderation), retry once with the error, and report
 * failure when the requested game cannot be built. Never substitute a plain scene.
 */
export async function imagineGame(
  job: BuildWorldJob,
  deps: ImagineGameDeps,
): Promise<ImagineGameResult> {
  if (job.labKind)
    return {
      doc: await buildScene(job, deps.generateScene),
      kind: 'playground',
      attempts: 0,
      fallback: false,
    };
  const doc = await buildScene(job, (prompt, kind, sessionId) =>
    deps.generateScene(`${prompt}\n${GAME_SCENE_HINT}`, kind, sessionId),
  );
  return compileBehavior(doc, job, deps);
}

/** Compile actions and responses for games AND open-ended creations. */
export async function compileBehavior(
  doc: SceneDoc,
  job: BuildWorldJob,
  deps: ImagineGameDeps,
  previous?: { source?: string; instruction: string },
): Promise<ImagineGameResult> {
  const mode = job.experience ?? 'freeplay';
  const language: SmokeLanguage = job.language ?? 'en';
  const prompt = gameScriptPrompt({
    description: job.description,
    doc,
    language,
    ageBand: job.ageBand,
    mode,
    previous,
  });
  let feedback = '';
  let failure = '';
  let attempts = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    attempts++;
    let source: string | undefined;
    try {
      const output = GameScriptOutputSchema.safeParse(
        await deps.generateScript(`${prompt}${feedback}`, job.sessionId),
      );
      if (!output.success) {
        failure = 'the output was not {"kind": "game" | "playground", "source": string}';
      } else if (output.data.kind === 'playground') {
        failure =
          'Do not downgrade the creation to a static scene. Open-ended play also needs the requested behaviors. Return kind game with source; scores are optional for freeplay.';
      } else if (!output.data.source) {
        failure = 'kind "game" needs the programme in "source"';
      } else {
        source = output.data.source;
        const problem = await gateScript(doc, source, {
          language,
          requireGoal: mode !== 'freeplay',
          ...(deps.moderate ? { moderate: deps.moderate } : {}),
          ...(deps.seconds ? { seconds: deps.seconds } : {}),
        });
        if (problem === null)
          return { doc: withScript(doc, source, mode), kind: 'game', attempts, fallback: false };
        failure = problem;
      }
    } catch (error) {
      failure = `the script model failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    feedback = retryFeedback(failure, source);
  }
  throw new GameGenerationError(failure);
}

/**
 * A spoken change may rewrite the script through the patch flow. A changed
 * script must pass the same gate. Failure rejects the whole edit, so the child
 * keeps the complete prior world rather than getting stale, incompatible rules.
 */
export async function guardPatchedGame(
  before: SceneDoc,
  after: SceneDoc,
  options: { language: SmokeLanguage; moderate?: Moderate },
): Promise<SceneDoc> {
  const source = after.game?.script.source;
  if (source === before.game?.script.source) return after;
  const next = structuredClone(after);
  if (source !== undefined && (await gateScript(next, source, options)) === null)
    return withScript(next, source, after.game?.mode ?? 'game');
  if (source === undefined && before.game === undefined) return next;
  throw new GameGenerationError(
    'The changed behavior did not pass validation; the previous creation was kept.',
  );
}

export class GameGenerationError extends Error {
  readonly retryable = false;
  constructor(reason: string) {
    super(`The requested game could not be validated: ${reason}`);
    this.name = 'GameGenerationError';
  }
}
