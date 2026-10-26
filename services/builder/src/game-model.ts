import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { toGeminiJsonSchema } from '@just-imagine/scene-schema';
import { SAFETY_SETTINGS } from './vertex';
import { GameScriptOutputSchema, type GenerateScript } from './imagine-game';
import { GameplayPlanSchema, gameplayPlanPrompt, type PlanGame } from './game-playtest';
import { traced } from '@just-imagine/server-core';
import { withBackoff } from './rate-limit';

const OUTPUT_JSON_SCHEMA = toGeminiJsonSchema(
  z.toJSONSchema(GameScriptOutputSchema, { target: 'draft-7' }) as Record<string, unknown>,
);

/**
 * The script model for generated games: `gemini-4-argon` through Vertex AI in
 * an explicit model location (Application Default Credentials). No silent model fallback.
 */
export class GameScriptModel {
  private client: GoogleGenAI;
  constructor(
    private config: {
      project: string;
      model: string;
      apiKey?: string;
      location?: string;
      /** How long to keep backing off on rate limits before failing; 0 never retries. */
      rateLimitDeadlineMs?: number;
    },
  ) {
    this.client = new GoogleGenAI(
      config.apiKey
        ? { apiKey: config.apiKey }
        : { vertexai: true, project: config.project, location: config.location ?? 'global' },
    );
  }
  private async request(
    prompt: string,
    schema?: Record<string, unknown>,
    purpose: 'script' | 'plan' = 'script',
    signal?: AbortSignal,
  ): Promise<unknown> {
    const timeoutMs = purpose === 'script' ? 180000 : 90000;
    const response = await withBackoff(
      () =>
        traced(`game_${purpose}_model`, { milestone: this.config.model }, () =>
          this.client.models.generateContent({
            model: this.config.model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              ...(schema ? { responseJsonSchema: schema } : {}),
              safetySettings: SAFETY_SETTINGS,
              maxOutputTokens: purpose === 'plan' ? 12288 : 24000,
              ...(this.config.model.startsWith('gemini-4-')
                ? {
                    thinkingConfig: {
                      // The programmer receives an independently validated acceptance plan.
                      // Bound reasoning latency; full static/physics/causality gates still decide publication.
                      thinkingLevel: ThinkingLevel.MEDIUM,
                    },
                  }
                : {}),
              abortSignal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs + 10000)])
                : AbortSignal.timeout(timeoutMs + 10000),
              httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
            },
          }),
        ),
      // Rate limits come back at once; waiting briefly beats failing the world.
      { deadlineMs: this.config.rateLimitDeadlineMs ?? 30000, signal },
    );
    if (!response.text) throw new Error('Model returned no structured response');
    return JSON.parse(response.text) as unknown;
  }
  generate: GenerateScript = async (prompt, _sessionId, signal) =>
    this.request(prompt, OUTPUT_JSON_SCHEMA, 'script', signal);

  plan: PlanGame = async (doc, job, previous, validationFeedback) => {
    const prompt =
      gameplayPlanPrompt(doc, job, previous) +
      (validationFeedback
        ? '\nCorrect the previous plan using the local validation feedback below. Preserve the complete wish and all causality/physics checks. Return a complete replacement plan, never a weaker test.\n' +
          validationFeedback
        : '');
    const schema = toGeminiJsonSchema(
      z.toJSONSchema(GameplayPlanSchema, { target: 'draft-7' }) as Record<string, unknown>,
    );
    // The contract travels in the prompt: a nested union schema in responseJsonSchema is
    // rejected with a 400 every time, so the schema call only cost a wasted round trip.
    return this.request(
      `${prompt}\nExact JSON contract (data): ${JSON.stringify(schema)}`,
      undefined,
      'plan',
    );
  };
}
